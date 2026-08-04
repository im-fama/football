import { Player, PlayerAttributes, PlayerSeasonStats, Team, League, Formation } from "../models/index.js";
import { isDbConnected } from "../config/db.js";
import * as footballApi from "../services/footballApiService.js";
import { getPlayerInsights, getSimilarPlayers } from "../services/mlClient.js";

const CACHE_TTL_MS = (Number(process.env.CACHE_TTL_MINUTES) || 360) * 60 * 1000;

function isFresh(doc) {
  return doc && Date.now() - new Date(doc.fetchedAt).getTime() < CACHE_TTL_MS;
}

function isValidObjectId(id) {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
}

// Map database entities to the shape expected by client
function shapePlayer(player, attributes, stats, team, league) {
  return {
    _id: player._id,
    sourceId: player.sourceId,
    name: player.name,
    position: player.position,
    nationality: player.nationality,
    age: player.age,
    thumbnail: player.photoUrl,
    computedRating: player.overallRating,
    // Kept as an alias so components reading either name stay correct.
    overallRating: player.overallRating,
    isCustom: player.isCustom,
    createdBy: player.createdBy,
    notes: player.notes,
    instructions: player.instructions,
    team: team?.name || "Free Agent",
    teamId: team ? team.sourceId || String(team._id) : null,
    teamBadge: team?.badgeUrl || "",
    league: league?.name || "",
    stats: {
      pace: attributes?.pace ?? 65,
      shooting: attributes?.shooting ?? 65,
      passing: attributes?.passing ?? 65,
      dribbling: attributes?.dribbling ?? 65,
      defending: attributes?.defending ?? 65,
      physical: attributes?.physical ?? 65,
      matches: stats?.matches ?? 0,
      minutes: stats?.minutes ?? 0,
      goals: stats?.goals ?? 0,
      assists: stats?.assists ?? 0,
      passAccuracy: stats?.passAccuracy ?? 70,
      tacklesP90: stats?.tacklesP90 ?? 0,
      interceptionsP90: stats?.interceptionsP90 ?? 0,
      shotsOnTargetPct: stats?.shotsOnTargetPct ?? 0,
      duelsWonPct: stats?.duelsWonPct ?? 50,
      savesP90: stats?.savesP90 ?? 0,
      recentRatingDelta: stats?.recentRatingDelta ?? 0
    }
  };
}

export async function enrichPlayerDoc(player) {
  const [enriched] = await enrichPlayersList([player].filter(Boolean));
  return enriched || null;
}

/**
 * Batched enrichment. The per-player version used to fire three queries each,
 * which meant ~90 round-trips just to render one squad.
 */
export async function enrichPlayersList(players) {
  const list = (players || []).filter(Boolean);
  if (!list.length) return [];

  const playerIds = list.map((p) => p._id);
  const teamIds = [...new Set(list.map((p) => p.teamId).filter(Boolean).map(String))];

  const [attributes, stats, teams] = await Promise.all([
    PlayerAttributes.find({ playerId: { $in: playerIds } }).lean(),
    PlayerSeasonStats.find({ playerId: { $in: playerIds } }).lean(),
    teamIds.length ? Team.find({ _id: { $in: teamIds } }).lean() : []
  ]);

  const leagueIds = [...new Set(teams.map((t) => t.leagueId).filter(Boolean).map(String))];
  const leagues = leagueIds.length ? await League.find({ _id: { $in: leagueIds } }).lean() : [];

  const attrById = new Map(attributes.map((a) => [String(a.playerId), a]));
  const statsById = new Map(stats.map((s) => [String(s.playerId), s]));
  const teamById = new Map(teams.map((t) => [String(t._id), t]));
  const leagueById = new Map(leagues.map((l) => [String(l._id), l]));

  return list.map((p) => {
    const team = p.teamId ? teamById.get(String(p.teamId)) : null;
    const league = team?.leagueId ? leagueById.get(String(team.leagueId)) : null;
    return shapePlayer(p, attrById.get(String(p._id)), statsById.get(String(p._id)), team, league);
  });
}

export async function listPlayersByTeam(req, res, next) {
  try {
    const { teamId } = req.query;
    if (!teamId) return res.status(400).json({ error: "Query param 'teamId' is required." });

    let team = null;
    if (isDbConnected()) {
      team = await Team.findOne({ $or: [{ _id: isValidObjectId(teamId) ? teamId : null }, { sourceId: teamId }] });
    }

    if (team) {
      const players = await Player.find({ teamId: team._id });
      const enriched = await enrichPlayersList(players);
      return res.json({ count: enriched.length, players: enriched });
    }

    // Fallback: fetch from upstream
    const normalized = await footballApi.getPlayersByTeamId(teamId);
    // Upsert logic for cached players
    const ops = normalized.map((p) => ({
      updateOne: { filter: { sourceId: p.sourceId }, update: { $set: p }, upsert: true },
    }));
    if (isDbConnected() && ops.length > 0) {
      await Player.bulkWrite(ops);
      const saved = await Player.find({ sourceId: { $in: normalized.map((p) => p.sourceId) } });
      const enriched = await enrichPlayersList(saved);
      return res.json({ count: enriched.length, players: enriched });
    }

    res.json({ count: normalized.length, players: normalized });
  } catch (err) {
    next(Object.assign(err, { publicMessage: "Could not load players for that team." }));
  }
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function searchPlayers(req, res, next) {
  try {
    const { q, position, minRating } = req.query;
    const limit = Math.min(Number(req.query.limit) || 24, 100);

    if (isDbConnected()) {
      const filter = {};
      // Substring match, not $text — the text index only matches whole words,
      // so typing "mess" would never surface "L. Messi".
      if (q && q.trim()) filter.name = { $regex: escapeRegex(q.trim()), $options: "i" };
      // Accepts a single code or a comma-separated group, e.g. "ST,CF,LW,RW".
      if (position && position !== "ALL") {
        const codes = position.split(",").map((c) => c.trim()).filter(Boolean);
        if (codes.length) filter.position = { $in: codes.map((c) => c.toUpperCase()) };
      }
      if (minRating) filter.overallRating = { $gte: Number(minRating) };

      const matched = await Player.find(filter)
        .sort({ overallRating: -1 })
        .limit(limit)
        .lean();

      if (matched.length || Object.keys(filter).length) {
        const enriched = await enrichPlayersList(matched);
        return res.json({ count: enriched.length, players: enriched, source: "cache" });
      }
    }

    if (!q || !q.trim()) {
      return res.json({ count: 0, players: [], source: "empty" });
    }

    const normalized = await footballApi.searchPlayersByName(q);
    const ops = normalized.map((p) => ({
      updateOne: { filter: { sourceId: p.sourceId }, update: { $set: p }, upsert: true },
    }));
    if (isDbConnected() && ops.length > 0) {
      await Player.bulkWrite(ops);
      const saved = await Player.find({ sourceId: { $in: normalized.map((p) => p.sourceId) } });
      const enriched = await enrichPlayersList(saved);
      return res.json({ count: enriched.length, players: enriched, source: "live" });
    }

    res.json({ count: normalized.length, players: normalized, source: "live" });
  } catch (err) {
    next(Object.assign(err, { publicMessage: "Player search failed." }));
  }
}

export async function getPlayer(req, res, next) {
  try {
    const { id } = req.params;
    let player = null;
    if (isDbConnected()) {
      player = await Player.findOne({ $or: [{ _id: isValidObjectId(id) ? id : null }, { sourceId: id }] });
    }
    if (!player) {
      return res.status(404).json({ error: "Player not found. Try searching or browsing by team first." });
    }
    const enriched = await enrichPlayerDoc(player);
    res.json({ player: enriched });
  } catch (err) {
    next(Object.assign(err, { publicMessage: "Could not load that player." }));
  }
}

export async function insights(req, res, next) {
  try {
    const { id } = req.params;
    const player = isDbConnected()
      ? await Player.findOne({ $or: [{ _id: isValidObjectId(id) ? id : null }, { sourceId: id }] })
      : null;
    if (!player) return res.status(404).json({ error: "Player not found." });

    const enriched = await enrichPlayerDoc(player);
    const mlInsights = await getPlayerInsights(enriched);
    res.json({ playerId: player._id, formulaRating: player.overallRating, ml: mlInsights });
  } catch (err) {
    next(Object.assign(err, { publicMessage: "Could not generate ML insights for this player." }));
  }
}

export async function similar(req, res, next) {
  try {
    const { id } = req.params;
    const { poolTeamId, k } = req.query;
    const player = isDbConnected()
      ? await Player.findOne({ $or: [{ _id: isValidObjectId(id) ? id : null }, { sourceId: id }] })
      : null;
    if (!player) return res.status(404).json({ error: "Player not found." });

    const enrichedTarget = await enrichPlayerDoc(player);

    let candidates = [];
    if (poolTeamId) {
      let team = await Team.findOne({ $or: [{ _id: isValidObjectId(poolTeamId) ? poolTeamId : null }, { sourceId: poolTeamId }] });
      if (team) {
        candidates = await Player.find({ teamId: team._id });
      }
    } else if (isDbConnected()) {
      candidates = await Player.find({ position: player.position, _id: { $ne: player._id } }).limit(40);
    }

    const enrichedCandidates = await enrichPlayersList(candidates);
    const result = await getSimilarPlayers(enrichedTarget, enrichedCandidates, Number(k) || 5);
    
    const enriched = {
      ...result,
      results: (result.results || []).map((r) => {
        const c = enrichedCandidates.find((cd) => String(cd._id) === String(r.id) || cd.sourceId === r.id);
        return { ...r, player: c || null };
      }),
    };
    res.json(enriched);
  } catch (err) {
    next(Object.assign(err, { publicMessage: "Could not compute similar players." }));
  }
}

// Squad assignment logic for PitchView: best 11 by position fit the slots, others are bench
export async function getSquad(req, res, next) {
  try {
    const { teamId } = req.params;
    const formationName = req.query.formation || "4-3-3";

    const team = await Team.findOne({ $or: [{ _id: isValidObjectId(teamId) ? teamId : null }, { sourceId: teamId }] });
    if (!team) return res.status(404).json({ error: "Team not found." });

    let formation;
    if (formationName === "Custom") {
      formation = await Formation.findOne({ name: "4-3-3" });
      if (!formation) return res.status(400).json({ error: "Fallback 4-3-3 formation not found." });
      formation = { ...formation.toObject(), name: "Custom" };
    } else {
      formation = await Formation.findOne({ name: formationName });
      if (!formation) return res.status(400).json({ error: `Formation '${formationName}' not found.` });
    }
    const players = await Player.find({ teamId: team._id }).lean();
    const enriched = await enrichPlayersList(players);

    // Filter out staff (MGR/coach) from starting 11
    const staff = enriched.filter(p => p.position === "MGR" || p.position === "COACH");
    const activePlayers = enriched.filter(p => p.position !== "MGR" && p.position !== "COACH");

    // Algorithm to map active players to slots
    const starters = {}; // slotLabel -> player
    const bench = [];
    const usedPlayerIds = new Set();

    // Slot codes carry a disambiguating suffix (CB1, CB2, CDM1...) that the
    // player's own position never has.
    const basePosition = (code) => (code || "").toUpperCase().replace(/\d+$/, "");

    const getRole = (pos) => {
      const p = basePosition(pos);
      if (p.includes("GK")) return "GK";
      if (["CB", "LB", "RB", "LWB", "RWB"].includes(p) || p.includes("DEF")) return "DEF";
      if (["CM", "CDM", "CAM", "LM", "RM", "LCM", "RCM", "LAM", "RAM"].includes(p) || p.includes("MID")) return "MID";
      return "FWD";
    };

    // Sort players by rating descending
    const sortedPlayers = [...activePlayers].sort((a, b) => b.computedRating - a.computedRating);

    /**
     * Fit score for a player in a slot. Rating dominates, with a bonus for an
     * exact positional match and a smaller one for the same broad role - so a
     * slot prefers a strong out-of-position player over a weak specialist,
     * which a strict position-first pass gets wrong (an 87 CAM would end up on
     * the wing behind a 62 CM).
     */
    const fitScore = (player, slotCode) => {
      const slotRole = getRole(slotCode);
      const playerRole = getRole(player.position);
      // Keepers and outfielders are never interchangeable.
      if ((slotRole === "GK") !== (playerRole === "GK")) return -Infinity;
      // The bonuses outweigh a realistic rating spread, so positional fit wins
      // and rating only decides between players who fit equally well.
      let score = player.computedRating;
      if (basePosition(player.position) === basePosition(slotCode)) score += 40;
      else if (playerRole === slotRole) score += 20;
      return score;
    };

    // Fill the specialist slots first so the keeper is never left to chance.
    const slotOrder = [...formation.slots].sort(
      (a, b) => (getRole(b.code) === "GK" ? 1 : 0) - (getRole(a.code) === "GK" ? 1 : 0)
    );

    slotOrder.forEach((slot) => {
      let best = null;
      let bestScore = -Infinity;
      for (const player of sortedPlayers) {
        if (usedPlayerIds.has(String(player._id))) continue;
        const score = fitScore(player, slot.code);
        if (score > bestScore) {
          bestScore = score;
          best = player;
        }
      }
      // Nothing eligible (e.g. a squad with no keeper) — take the best left.
      if (!best) best = sortedPlayers.find((p) => !usedPlayerIds.has(String(p._id)));
      if (best) {
        starters[slot.code] = best;
        usedPlayerIds.add(String(best._id));
      }
    });

    // Everyone else goes to bench, best first
    sortedPlayers.forEach((p) => {
      if (!usedPlayerIds.has(String(p._id))) {
        bench.push(p);
      }
    });

    // Add staff to bench
    bench.push(...staff);

    res.json({
      formation: formationName,
      slots: formation.slots,
      starters,
      bench
    });
  } catch (err) {
    next(err);
  }
}

export async function updateNotes(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const player = await Player.findOne({ $or: [{ _id: isValidObjectId(id) ? id : null }, { sourceId: id }] });
    if (!player) return res.status(404).json({ error: "Player not found." });
    player.notes = notes || "";
    await player.save();
    const enriched = await enrichPlayerDoc(player);
    res.json({ player: enriched });
  } catch (err) {
    next(err);
  }
}

export async function updateInstructions(req, res, next) {
  try {
    const { id } = req.params;
    const { instructions } = req.body;
    const player = await Player.findOne({ $or: [{ _id: isValidObjectId(id) ? id : null }, { sourceId: id }] });
    if (!player) return res.status(404).json({ error: "Player not found." });
    player.instructions = instructions || {};
    await player.save();
    const enriched = await enrichPlayerDoc(player);
    res.json({ player: enriched });
  } catch (err) {
    next(err);
  }
}

export async function createPlayer(req, res, next) {
  try {
    const { 
      name, 
      position, 
      nationality, 
      age, 
      photoUrl, 
      teamId,
      stats
    } = req.body;

    if (!name || !position) {
      return res.status(400).json({ error: "Name and position are required." });
    }

    let resolvedTeamId = null;
    if (teamId) {
      if (isValidObjectId(teamId)) {
        resolvedTeamId = teamId;
      } else {
        const t = await Team.findOne({ sourceId: teamId });
        if (t) resolvedTeamId = t._id;
      }
    }

    // Create base player
    const player = await Player.create({
      sourceId: `custom_player_${Date.now()}`,
      name,
      position,
      nationality: nationality || "Unknown",
      age: age || 25,
      photoUrl: photoUrl || "",
      teamId: resolvedTeamId,
      isCustom: true,
      createdBy: req.user ? req.user._id : null,
      overallRating: stats ? Math.round((stats.pace + stats.shooting + stats.passing + stats.dribbling + stats.defending + stats.physical) / 6) : 75
    });

    // Create attributes
    if (stats) {
      await PlayerAttributes.create({
        playerId: player._id,
        pace: stats.pace || 75,
        shooting: stats.shooting || 75,
        passing: stats.passing || 75,
        dribbling: stats.dribbling || 75,
        defending: stats.defending || 75,
        physical: stats.physical || 75
      });
    }

    const enriched = await enrichPlayerDoc(player);
    res.status(201).json(enriched);
  } catch (err) {
    next(err);
  }
}

export async function updatePlayer(req, res, next) {
  try {
    const { id } = req.params;
    const { 
      name, 
      position, 
      nationality, 
      age, 
      photoUrl, 
      teamId,
      stats
    } = req.body;

    const player = await Player.findOne({ $or: [{ _id: isValidObjectId(id) ? id : null }, { sourceId: id }] });
    if (!player) return res.status(404).json({ error: "Player not found." });

    let resolvedTeamId = null;
    if (teamId) {
      if (isValidObjectId(teamId)) {
        resolvedTeamId = teamId;
      } else {
        const t = await Team.findOne({ sourceId: teamId });
        if (t) resolvedTeamId = t._id;
      }
    }

    player.name = name || player.name;
    player.position = position || player.position;
    player.nationality = nationality || player.nationality;
    player.age = age || player.age;
    player.photoUrl = photoUrl || player.photoUrl;
    player.teamId = resolvedTeamId;
    player.isCustom = true; // Mark as custom if manually fixed
    
    if (stats) {
      player.overallRating = Math.round((stats.pace + stats.shooting + stats.passing + stats.dribbling + stats.defending + stats.physical) / 6);
      
      const attrs = await PlayerAttributes.findOne({ playerId: player._id });
      if (attrs) {
        attrs.pace = stats.pace;
        attrs.shooting = stats.shooting;
        attrs.passing = stats.passing;
        attrs.dribbling = stats.dribbling;
        attrs.defending = stats.defending;
        attrs.physical = stats.physical;
        await attrs.save();
      } else {
        await PlayerAttributes.create({
          playerId: player._id,
          pace: stats.pace || 75,
          shooting: stats.shooting || 75,
          passing: stats.passing || 75,
          dribbling: stats.dribbling || 75,
          defending: stats.defending || 75,
          physical: stats.physical || 75
        });
      }
    }

    await player.save();
    
    const enriched = await enrichPlayerDoc(player);
    res.json(enriched);
  } catch (err) {
    next(err);
  }
}

