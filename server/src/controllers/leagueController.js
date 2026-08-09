import { League, Team, Player } from "../models/index.js";
import { isValidObjectId } from "mongoose";

export async function listLeagues(req, res, next) {
  try {
    const leagues = await League.find({}).sort({ name: 1 }).lean();

    const counts = await Team.aggregate([
      { $match: { leagueId: { $ne: null } } },
      { $group: { _id: "$leagueId", count: { $sum: 1 } } }
    ]);
    const countById = new Map(counts.map((c) => [String(c._id), c.count]));

    const customCount = await Team.countDocuments({ isCustom: true });

    const formattedLeagues = leagues.map((l) => ({
      ...l,
      teamCount: countById.get(String(l._id)) || 0
    }));

    // Add "No League / Custom Teams" pseudo-league if custom teams exist or for selection
    formattedLeagues.unshift({
      _id: "custom_league_id",
      name: "No League / Custom Teams",
      sourceId: "custom_league",
      teamCount: customCount
    });

    res.json({
      count: formattedLeagues.length,
      leagues: formattedLeagues
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

    let teams = [];
    if (league === "No League / Custom Teams" || league === "No League" || league === "custom_league" || league === "custom_league_id") {
      teams = await Team.find({ isCustom: true }).sort({ createdAt: -1 });
    } else {
      let matchLeague = await League.findOne({
        $or: [
          { _id: isValidObjectId(league) ? league : null },
          { name: league },
          { sourceId: league }
        ]
      });

      if (!matchLeague) {
        // Fallback check if custom teams match
        teams = await Team.find({ isCustom: true }).sort({ createdAt: -1 });
      } else {
        teams = await Team.find({ leagueId: matchLeague._id }).sort({ name: 1 });
      }
    }

    // Transform to match front-end: need idTeam, strTeam, strTeamBadge, strStadium, isCustom, _id
    const result = teams.map((t) => ({
      _id: t._id,
      idTeam: t.sourceId || String(t._id),
      strTeam: t.name,
      strTeamBadge: t.badgeUrl,
      strStadium: t.stadium,
      isCustom: t.isCustom
    }));

    res.json({ count: result.length, teams: result });
  } catch (err) {
    next(err);
  }
}

export async function listCustomTeams(req, res, next) {
  try {
    const teams = await Team.find({ isCustom: true }).sort({ createdAt: -1 });

    const result = await Promise.all(
      teams.map(async (t) => {
        const playerCount = await Player.countDocuments({ teamId: t._id });
        return {
          _id: t._id,
          idTeam: t.sourceId || String(t._id),
          name: t.name,
          strTeam: t.name,
          badgeUrl: t.badgeUrl,
          strTeamBadge: t.badgeUrl,
          stadium: t.stadium,
          strStadium: t.stadium,
          isCustom: true,
          playerCount
        };
      })
    );

    res.json({ count: result.length, teams: result });
  } catch (err) {
    next(err);
  }
}

export async function createTeam(req, res, next) {
  try {
    const { name, league, badgeUrl, stadium } = req.body;
    if (!name) return res.status(400).json({ error: "Team name is required." });

    let matchLeague = null;
    const isNoLeague = !league || league === "No League" || league === "No League / Custom Teams";

    if (!isNoLeague) {
      matchLeague = await League.findOne({ name: league });
      if (!matchLeague) {
        matchLeague = await League.create({ name: league, sourceId: `custom_league_${Date.now()}` });
      }
    }

    const team = await Team.create({
      name,
      badgeUrl: badgeUrl || "",
      stadium: stadium || "",
      leagueId: matchLeague ? matchLeague._id : null,
      sourceId: `custom_${Date.now()}`,
      isCustom: true,
      createdBy: req.user ? req.user._id : null
    });

    const result = {
      _id: team._id,
      idTeam: team.sourceId || String(team._id),
      strTeam: team.name,
      strTeamBadge: team.badgeUrl,
      strStadium: team.stadium,
      isCustom: true
    };

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteTeam(req, res, next) {
  try {
    const { id } = req.params;
    const team = await Team.findOne({ $or: [{ _id: isValidObjectId(id) ? id : null }, { sourceId: id }] });
    if (!team) return res.status(404).json({ error: "Team not found." });

    // Also delete players associated with this custom team
    await Player.deleteMany({ teamId: team._id });
    await Team.deleteOne({ _id: team._id });

    res.json({ message: "Team and associated players deleted successfully." });
  } catch (err) {
    next(err);
  }
}

