import { Player, PlayerAttributes, PlayerSeasonStats, Team, Formation } from "../models/index.js";
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
export async function enrichPlayerDoc(player) {
  if (!player) return null;
  const [attributes, stats] = await Promise.all([
    PlayerAttributes.findOne({ playerId: player._id }),
    PlayerSeasonStats.findOne({ playerId: player._id })
  ]);
  
  let teamName = "Free Agent";
  if (player.teamId) {
    const t = await Team.findById(player.teamId);
    if (t) teamName = t.name;
  }

  return {
    _id: player._id,
    sourceId: player.sourceId,
    name: player.name,
    position: player.position,
    nationality: player.nationality,
    age: player.age,
    thumbnail: player.photoUrl,
    computedRating: player.overallRating,
    isCustom: player.isCustom,
    createdBy: player.createdBy,
    team: teamName,
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

export async function enrichPlayersList(players) {
  return Promise.all(players.map(p => enrichPlayerDoc(p)));
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

export async function searchPlayers(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: "Query param 'q' must be at least 2 characters." });
    }

    if (isDbConnected()) {
      const matched = await Player.find({ $text: { $search: q } }).limit(20);
      if (matched.length) {
        const enriched = await enrichPlayersList(matched);
        return res.json({ count: enriched.length, players: enriched, source: "cache" });
      }
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

    const formation = await Formation.findOne({ name: formationName });
    if (!formation) return res.status(400).json({ error: `Formation '${formationName}' not found.` });

    const players = await Player.find({ teamId: team._id });
    const enriched = await enrichPlayersList(players);

    // Filter out staff (MGR/coach) from starting 11
    const staff = enriched.filter(p => p.position === "MGR" || p.position === "COACH");
    const activePlayers = enriched.filter(p => p.position !== "MGR" && p.position !== "COACH");

    // Algorithm to map active players to slots
    const starters = {}; // slotLabel -> player
    const bench = [];
    const usedPlayerIds = new Set();

    // Group active players by role mapping
    const getRole = (pos) => {
      const p = pos.toUpperCase();
      if (p.includes("GK")) return "GK";
      if (p.includes("CB") || p.includes("LB") || p.includes("RB") || p.includes("DEF") || p.includes("LWB") || p.includes("RWB")) return "DEF";
      if (p.includes("MID") || p.includes("CM") || p.includes("CDM") || p.includes("CAM") || p.includes("LM") || p.includes("RM") || p.includes("LCM") || p.includes("RCM") || p.includes("LAM") || p.includes("RAM")) return "MID";
      return "FWD";
    };

    // Sort players by rating descending
    const sortedPlayers = [...activePlayers].sort((a, b) => b.computedRating - a.computedRating);

    // Map slots based on position role
    formation.slots.forEach((slot) => {
      const slotRole = getRole(slot.code);
      // Find highest rated player of that role who is not yet used
      const match = sortedPlayers.find(p => getRole(p.position) === slotRole && !usedPlayerIds.has(String(p._id)));
      if (match) {
        starters[slot.code] = match;
        usedPlayerIds.add(String(match._id));
      }
    });

    // Fill remaining unfilled slots with any remaining players by rating
    formation.slots.forEach((slot) => {
      if (!starters[slot.code]) {
        const match = sortedPlayers.find(p => !usedPlayerIds.has(String(p._id)));
        if (match) {
          starters[slot.code] = match;
          usedPlayerIds.add(String(match._id));
        }
      }
    });

    // Everyone else goes to bench
    activePlayers.forEach((p) => {
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

