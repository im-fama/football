import { Router } from "express";
import * as playerCtrl from "../controllers/playerController.js";
import * as leagueCtrl from "../controllers/leagueController.js";
import * as formationCtrl from "../controllers/formationController.js";
import * as boardCtrl from "../controllers/boardController.js";
import * as watchlistCtrl from "../controllers/watchlistController.js";
import * as statsCtrl from "../controllers/teamStatsController.js";
import authRoutes from "./auth.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Auth routes
router.use("/auth", authRoutes);

// Leagues / Teams
router.get("/leagues", leagueCtrl.listLeagues);
router.get("/teams", leagueCtrl.listTeamsByLeague);
router.get("/leagues/:id/teams", leagueCtrl.listTeamsByLeague);
router.post("/teams", leagueCtrl.createTeam);

// Admin — dataset loading. The load runs in the background; poll /admin/status.
router.post("/admin/seed-kaggle", async (req, res, next) => {
  try {
    const { bootstrapDatabase, getBootstrapStatus } = await import(
      "../../../database/bootstrap.js"
    );

    const current = getBootstrapStatus();
    if (current.state === "running") {
      return res.status(202).json({
        message: "A dataset load is already running.",
        status: current
      });
    }

    // Fire and forget: parsing the CSVs takes far longer than an HTTP timeout.
    bootstrapDatabase({ force: req.body?.force !== false }).catch(() => {});

    res.status(202).json({
      message: "Dataset load started. Poll GET /api/admin/status for progress.",
      status: getBootstrapStatus()
    });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/status", async (req, res, next) => {
  try {
    const { getBootstrapStatus, refreshCounts } = await import("../../../database/bootstrap.js");
    const status = getBootstrapStatus();
    if (status.state !== "running") {
      status.counts = await refreshCounts();
    }
    // `ready` is what the client waits on before it starts fetching squads.
    res.json({ ...status, ready: status.counts.players > 0 });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/stats", async (req, res, next) => {
  try {
    const { Player, Team, League } = await import("../models/index.js");
    res.json({
      players: await Player.estimatedDocumentCount(),
      teams: await Team.estimatedDocumentCount(),
      leagues: await League.estimatedDocumentCount()
    });
  } catch (err) {
    next(err);
  }
});

// Players
router.post("/players", playerCtrl.createPlayer);
router.put("/players/:id", playerCtrl.updatePlayer);
router.get("/players", playerCtrl.listPlayersByTeam);
router.get("/players/search", playerCtrl.searchPlayers);
router.get("/players/:id", playerCtrl.getPlayer);
router.get("/players/:id/insights", playerCtrl.insights);
router.get("/players/:id/similar", playerCtrl.similar);
router.put("/players/:id/notes", playerCtrl.updateNotes);
router.put("/players/:id/instructions", playerCtrl.updateInstructions);

// Formations
router.get("/formations", formationCtrl.listFormations);

// Tactics ML
router.post("/tactics/suggest", async (req, res) => {
  try {
    const mlUrl = process.env.ML_SERVICE_URL || process.env.ML_URL || "http://127.0.0.1:5001";
    const response = await fetch(`${mlUrl}/predict/tactics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Tactics proxy error:", err);
    res.status(500).json({ error: "Failed to fetch tactics from ML service" });
  }
});

// Squad assignment for team loading
router.get("/teams/:teamId/squad", playerCtrl.getSquad);

// Tactical boards CRUD
router.get("/boards", protect, boardCtrl.listBoards);
router.get("/boards/:id", protect, boardCtrl.getBoard);
router.post("/boards", protect, boardCtrl.createBoard);
router.put("/boards/:id", protect, boardCtrl.updateBoard);
router.delete("/boards/:id", protect, boardCtrl.deleteBoard);

// Team stats & analytics
router.get("/teams/:teamId/leaderboards", statsCtrl.getLeaderboards);
router.get("/teams/:teamId/matches", statsCtrl.getTeamMatches);
router.get("/matches/:matchId/passing-network", statsCtrl.getPassingNetwork);
router.get("/matches/:matchId/heatmap", statsCtrl.getHeatmap);
router.get("/matches/:matchId/shot-map", statsCtrl.getShotMap);

// Scouting Watchlist CRUD
router.get("/watchlist", protect, watchlistCtrl.listWatchlist);
router.post("/watchlist", protect, watchlistCtrl.addToWatchlist);
router.delete("/watchlist/:playerId", protect, watchlistCtrl.removeFromWatchlist);

export default router;
