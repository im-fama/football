import Player from "../models/Player.js";
import { isDbConnected } from "../config/db.js";
import * as footballApi from "../services/footballApiService.js";
import { getPlayerInsights, getSimilarPlayers } from "../services/mlClient.js";

const CACHE_TTL_MS = (Number(process.env.CACHE_TTL_MINUTES) || 360) * 60 * 1000;

function isFresh(doc) {
  return doc && Date.now() - new Date(doc.fetchedAt).getTime() < CACHE_TTL_MS;
}

async function upsertPlayers(normalizedPlayers) {
  if (!isDbConnected() || normalizedPlayers.length === 0) return normalizedPlayers;
  const ops = normalizedPlayers.map((p) => ({
    updateOne: { filter: { sourceId: p.sourceId }, update: { $set: p }, upsert: true },
  }));
  await Player.bulkWrite(ops);
  return Player.find({ sourceId: { $in: normalizedPlayers.map((p) => p.sourceId) } });
}

export async function listLeagues(req, res, next) {
  try {
    const leagues = await footballApi.getAllLeagues();
    res.json({ count: leagues.length, leagues });
  } catch (err) {
    next(Object.assign(err, { publicMessage: "Could not load leagues from the upstream source." }));
  }
}

export async function listTeams(req, res, next) {
  try {
    const { league } = req.query;
    if (!league) return res.status(400).json({ error: "Query param 'league' is required." });
    const teams = await footballApi.searchTeams(league);
    res.json({ count: teams.length, teams });
  } catch (err) {
    next(Object.assign(err, { publicMessage: "Could not load teams from the upstream source." }));
  }
}

export async function listPlayersByTeam(req, res, next) {
  try {
    const { teamId } = req.query;
    if (!teamId) return res.status(400).json({ error: "Query param 'teamId' is required." });

    const normalized = await footballApi.getPlayersByTeamId(teamId);
    const saved = await upsertPlayers(normalized);
    const payload = isDbConnected() ? saved : normalized;
    res.json({ count: payload.length, players: payload });
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
      const cachedHit = await Player.find({ $text: { $search: q } }).limit(20);
      if (cachedHit.length && cachedHit.every(isFresh)) {
        return res.json({ count: cachedHit.length, players: cachedHit, source: "cache" });
      }
    }

    const normalized = await footballApi.searchPlayersByName(q);
    const saved = await upsertPlayers(normalized);
    const payload = isDbConnected() ? saved : normalized;
    res.json({ count: payload.length, players: payload, source: "live" });
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
    res.json({ player });
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

    const mlInsights = await getPlayerInsights(player);
    res.json({ playerId: player._id, formulaRating: player.computedRating, ml: mlInsights });
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

    let candidates = [];
    if (poolTeamId) {
      const normalized = await footballApi.getPlayersByTeamId(poolTeamId);
      candidates = await upsertPlayers(normalized);
    } else if (isDbConnected()) {
      candidates = await Player.find({ position: player.position, _id: { $ne: player._id } }).limit(40);
    }

    const result = await getSimilarPlayers(player, candidates, Number(k) || 5);
    const enriched = {
      ...result,
      results: (result.results || []).map((r) => {
        const c = candidates.find((cd) => String(cd._id) === String(r.id) || cd.sourceId === r.id);
        return { ...r, player: c || null };
      }),
    };
    res.json(enriched);
  } catch (err) {
    next(Object.assign(err, { publicMessage: "Could not compute similar players." }));
  }
}

function isValidObjectId(id) {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
}
