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
      if (stats.length > 0) {
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
      }

      // Synthetic stats derived from player overall rating for custom teams
      return [...players]
        .sort((a, b) => (b.overallRating || 75) - (a.overallRating || 75))
        .slice(0, limit)
        .map((p, idx) => {
          let val = 0;
          if (key === "goals") val = Math.max(1, Math.round((p.overallRating || 75) / 5 - idx * 2));
          else if (key === "assists") val = Math.max(1, Math.round((p.overallRating || 75) / 7 - idx));
          else if (key === "passAccuracy") val = Math.min(96, Math.max(70, (p.overallRating || 75) + 5 - idx * 2));
          else if (key === "tacklesP90") val = Math.max(1, Number(((p.overallRating || 75) / 20 - idx * 0.4).toFixed(1)));
          return {
            playerId: p._id,
            name: p.name,
            position: p.position,
            value: val
          };
        });
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
    
    let events = [];
    if (isValidObjectId(matchId)) {
      events = await MatchEvent.find({ matchId, type: "pass" }).populate("playerId");
    }
    
    // Group passes by sender and receiver if events exist
    if (events.length > 0) {
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

      const POSITION_COORDS = {
        GK: { x: 50, y: 12 },
        LB: { x: 18, y: 28 },
        LWB: { x: 18, y: 36 },
        CB: { x: 50, y: 24 },
        RB: { x: 82, y: 28 },
        RWB: { x: 82, y: 36 },
        CDM: { x: 50, y: 40 },
        LM: { x: 22, y: 52 },
        CM: { x: 50, y: 52 },
        RM: { x: 78, y: 52 },
        CAM: { x: 50, y: 64 },
        LW: { x: 20, y: 76 },
        RW: { x: 80, y: 76 },
        CF: { x: 50, y: 76 },
        ST: { x: 50, y: 84 }
      };

      const getPosCoordinates = (pos) => {
        const code = (pos || "").toUpperCase().replace(/\d+$/, "");
        return POSITION_COORDS[code] || { x: 50, y: 50 };
      };

      const passMap = Object.values(pairs).map((pair) => ({
        from: getPosCoordinates(pair.fromPos),
        to: { x: pair.x, y: pair.y },
        weight: pair.count
      }));

      return res.json({ passMap });
    }

    // Default visual passing network map
    const defaultPasses = [
      { from: { x: 50, y: 14 }, to: { x: 22, y: 30 }, weight: 14, player: "GK → LB" },
      { from: { x: 50, y: 14 }, to: { x: 78, y: 30 }, weight: 12, player: "GK → RB" },
      { from: { x: 22, y: 30 }, to: { x: 50, y: 42 }, weight: 22, player: "LB → CM" },
      { from: { x: 78, y: 30 }, to: { x: 50, y: 42 }, weight: 19, player: "RB → CM" },
      { from: { x: 50, y: 42 }, to: { x: 20, y: 64 }, weight: 28, player: "CM → LW" },
      { from: { x: 50, y: 42 }, to: { x: 80, y: 64 }, weight: 25, player: "CM → RW" },
      { from: { x: 50, y: 42 }, to: { x: 50, y: 78 }, weight: 34, player: "CM → ST" },
      { from: { x: 20, y: 64 }, to: { x: 50, y: 78 }, weight: 18, player: "LW → ST" },
      { from: { x: 80, y: 64 }, to: { x: 50, y: 78 }, weight: 16, player: "RW → ST" }
    ];

    res.json({ passMap: defaultPasses });
  } catch (err) {
    next(err);
  }
}

export async function getHeatmap(req, res, next) {
  try {
    const { matchId } = req.params;
    const { playerId } = req.query;
    
    let filter = {};
    if (isValidObjectId(matchId)) {
      filter.matchId = matchId;
    }
    if (playerId) {
      if (isValidObjectId(playerId)) {
        filter.playerId = playerId;
      }
    }

    let events = [];
    if (filter.matchId) {
      events = await MatchEvent.find(filter);
    }

    if (events.length > 0) {
      const zones = events.map(e => ({
        x: e.x,
        y: e.y,
        intensity: e.type === "tackle" ? 0.85 : e.type === "shot" ? 0.95 : 0.65,
        playerName: e.playerId?.name || "Player"
      }));

      return res.json({ zones });
    }

    // High quality synthetic heatmap points for smooth UI presentation
    const basePoints = [
      { x: 50, y: 78, intensity: 0.9, playerName: "Striker Zone" },
      { x: 48, y: 72, intensity: 0.85, playerName: "Attacking Box" },
      { x: 55, y: 82, intensity: 0.75, playerName: "Right Channel" },
      { x: 42, y: 76, intensity: 0.8, playerName: "Left Channel" },
      { x: 22, y: 60, intensity: 0.7, playerName: "Left Wing" },
      { x: 78, y: 62, intensity: 0.7, playerName: "Right Wing" },
      { x: 50, y: 48, intensity: 0.95, playerName: "Midfield Hub" },
      { x: 46, y: 52, intensity: 0.85, playerName: "Midfield Hub" },
      { x: 54, y: 44, intensity: 0.8, playerName: "Midfield Hub" },
      { x: 30, y: 35, intensity: 0.6, playerName: "Defensive Transition" },
      { x: 70, y: 35, intensity: 0.6, playerName: "Defensive Transition" },
      { x: 50, y: 22, intensity: 0.75, playerName: "Defense Line" }
    ];

    res.json({ zones: basePoints });
  } catch (err) {
    next(err);
  }
}

export async function getShotMap(req, res, next) {
  try {
    const { matchId } = req.params;

    let events = [];
    if (isValidObjectId(matchId)) {
      events = await MatchEvent.find({ matchId, type: "shot" });
    }

    if (events.length > 0) {
      const shotMap = events.map(e => ({
        x: e.x,
        y: e.y,
        onTarget: e.details?.onTarget || false,
        goal: e.details?.goal || false,
        minute: e.minute
      }));

      return res.json({ shotMap });
    }

    const defaultShots = [
      { x: 50, y: 84, onTarget: true, goal: true, minute: 18 },
      { x: 44, y: 78, onTarget: true, goal: false, minute: 34 },
      { x: 56, y: 72, onTarget: false, goal: false, minute: 49 },
      { x: 52, y: 88, onTarget: true, goal: true, minute: 71 },
      { x: 38, y: 65, onTarget: false, goal: false, minute: 82 }
    ];

    res.json({ shotMap: defaultShots });
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

    if (matches.length > 0) {
      return res.json({ matches });
    }

    // Default match fixture for custom teams so visualizers are active immediately
    const fallbackMatch = [{
      _id: `custom_match_${team._id}`,
      homeTeamId: { _id: team._id, name: team.name, badgeUrl: team.badgeUrl },
      awayTeamId: { _id: "rival_fc_id", name: "Rival FC", badgeUrl: "" },
      homeScore: 3,
      awayScore: 1,
      date: new Date().toISOString()
    }];

    res.json({ matches: fallbackMatch });
  } catch (err) {
    next(err);
  }
}

