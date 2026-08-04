import { Team, Player, PlayerSeasonStats, MatchEvent, Match } from "../models/index.js";
import { isValidObjectId } from "mongoose";

export async function getLeaderboards(req, res, next) {
  try {
    const { teamId } = req.params;

    const team = await Team.findOne({ $or: [{ _id: isValidObjectId(teamId) ? teamId : null }, { sourceId: teamId }] });
    if (!team) return res.status(404).json({ error: "Team not found." });

    const players = await Player.find({ teamId: team._id });
    const playerIds = players.map(p => p._id);

    const stats = await PlayerSeasonStats.find({ playerId: { $in: playerIds } }).populate("playerId");

    // Format leaderboards
    const getTopList = (key, limit = 5) => {
      return [...stats]
        .filter(s => s[key] !== undefined && s.playerId)
        .sort((a, b) => b[key] - a[key])
        .slice(0, limit)
        .map(s => ({
          playerId: s.playerId._id,
          name: s.playerId.name,
          position: s.playerId.position,
          value: s[key]
        }));
    };

    res.json({
      goals: getTopList("goals"),
      assists: getTopList("assists"),
      passAccuracy: getTopList("passAccuracy"),
      tackles: getTopList("tacklesP90")
    });
  } catch (err) {
    next(err);
  }
}

export async function getPassingNetwork(req, res, next) {
  try {
    const { matchId } = req.params;
    
    const events = await MatchEvent.find({ matchId, type: "pass" }).populate("playerId");
    
    // Group passes by sender and receiver
    const pairs = {};
    events.forEach(event => {
      const fromId = String(event.playerId?._id);
      const toId = String(event.details?.receiverId);
      if (!fromId || !toId || fromId === "undefined" || toId === "undefined") return;

      const key = `${fromId}->${toId}`;
      if (!pairs[key]) {
        pairs[key] = {
          fromId,
          toId,
          count: 0,
          fromName: event.playerId?.name,
          fromPos: event.playerId?.position,
          x: event.x,
          y: event.y
        };
      }
      pairs[key].count += 1;
    });

    // Average pitch position per role, used as the node position for the
    // passer. Keys match the EA FC position codes stored on Player.position.
    const POSITION_COORDS = {
      GK: { x: 50, y: 8 },
      LB: { x: 14, y: 26 },
      LWB: { x: 14, y: 34 },
      CB: { x: 40, y: 22 },
      RB: { x: 86, y: 26 },
      RWB: { x: 86, y: 34 },
      CDM: { x: 50, y: 36 },
      LM: { x: 20, y: 48 },
      CM: { x: 50, y: 48 },
      RM: { x: 80, y: 48 },
      CAM: { x: 50, y: 60 },
      LW: { x: 18, y: 70 },
      RW: { x: 82, y: 70 },
      CF: { x: 50, y: 70 },
      ST: { x: 50, y: 78 }
    };

    const getPosCoordinates = (pos) => {
      const code = (pos || "").toUpperCase().replace(/\d+$/, "");
      return POSITION_COORDS[code] || { x: 50, y: 50 };
    };

    const passMap = Object.values(pairs).map((pair) => ({
      from: getPosCoordinates(pair.fromPos),
      to: { x: pair.x, y: pair.y }, // pass landing coordinate
      weight: pair.count
    }));

    res.json({ passMap });
  } catch (err) {
    next(err);
  }
}

export async function getHeatmap(req, res, next) {
  try {
    const { matchId } = req.params;
    
    // Fetch defensive actions: tackles, interceptions
    const events = await MatchEvent.find({
      matchId,
      type: { $in: ["tackle", "interception"] }
    });

    const zones = events.map(e => ({
      x: e.x,
      y: e.y,
      intensity: e.type === "tackle" ? 0.8 : 0.6
    }));

    res.json({ zones });
  } catch (err) {
    next(err);
  }
}

export async function getShotMap(req, res, next) {
  try {
    const { matchId } = req.params;

    const events = await MatchEvent.find({ matchId, type: "shot" });
    const shotMap = events.map(e => ({
      x: e.x,
      y: e.y,
      onTarget: e.details?.onTarget || false,
      goal: e.details?.goal || false,
      minute: e.minute
    }));

    res.json({ shotMap });
  } catch (err) {
    next(err);
  }
}

export async function getTeamMatches(req, res, next) {
  try {
    const { teamId } = req.params;
    const team = await Team.findOne({ $or: [{ _id: isValidObjectId(teamId) ? teamId : null }, { sourceId: teamId }] });
    if (!team) return res.status(404).json({ error: "Team not found." });

    const matches = await Match.find({
      $or: [{ homeTeamId: team._id }, { awayTeamId: team._id }]
    }).populate("homeTeamId awayTeamId").sort({ date: -1 });

    res.json({ matches });
  } catch (err) {
    next(err);
  }
}
