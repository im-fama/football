import { League, Team } from "../models/index.js";
import { isValidObjectId } from "mongoose";

export async function listLeagues(req, res, next) {
  try {
    const leagues = await League.find({}).sort({ name: 1 });
    res.json({ count: leagues.length, leagues });
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
