import { League, Team } from "../models/index.js";
import { isValidObjectId } from "mongoose";

export async function listLeagues(req, res, next) {
  try {
    const leagues = await League.find({}).sort({ name: 1 }).lean();

    // Club counts let the client open on a substantial competition instead of
    // whatever happens to sort first alphabetically.
    const counts = await Team.aggregate([
      { $match: { leagueId: { $ne: null } } },
      { $group: { _id: "$leagueId", count: { $sum: 1 } } }
    ]);
    const countById = new Map(counts.map((c) => [String(c._id), c.count]));

    res.json({
      count: leagues.length,
      leagues: leagues.map((l) => ({ ...l, teamCount: countById.get(String(l._id)) || 0 }))
    });
  } catch (err) {
    next(err);
  }
}

export async function listTeamsByLeague(req, res, next) {
  try {
    const { league } = req.query; // league name or league ID
    if (!league) {
      return res.status(400).json({ error: "Query param 'league' is required." });
    }

    let matchLeague = await League.findOne({
      $or: [
        { _id: isValidObjectId(league) ? league : null },
        { name: league },
        { sourceId: league }
      ]
    });

    if (!matchLeague) {
      return res.status(404).json({ error: `League '${league}' not found.` });
    }

    const teams = await Team.find({ leagueId: matchLeague._id }).sort({ name: 1 });
    // Transform to match front-end: need idTeam, strTeam, strTeamBadge, strStadium
    const result = teams.map((t) => ({
      idTeam: t.sourceId || String(t._id),
      strTeam: t.name,
      strTeamBadge: t.badgeUrl,
      strStadium: t.stadium
    }));

    res.json({ count: result.length, teams: result });
  } catch (err) {
    next(err);
  }
}

export async function createTeam(req, res, next) {
  try {
    const { name, league, badgeUrl, stadium } = req.body;
    if (!name) return res.status(400).json({ error: "Team name is required." });

    let matchLeague = await League.findOne({ name: league || "Custom League" });
    if (!matchLeague) {
      matchLeague = await League.create({ name: league || "Custom League", sourceId: `custom_${Date.now()}` });
    }

    const team = await Team.create({
      name,
      badgeUrl: badgeUrl || "",
      stadium: stadium || "",
      leagueId: matchLeague._id,
      sourceId: `custom_${Date.now()}`,
      isCustom: true,
      createdBy: req.user ? req.user._id : null
    });

    const result = {
      idTeam: team.sourceId || String(team._id),
      strTeam: team.name,
      strTeamBadge: team.badgeUrl,
      strStadium: team.stadium
    };

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
