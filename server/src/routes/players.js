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
router.get("/teams/custom", leagueCtrl.listCustomTeams);
router.get("/leagues/:id/teams", leagueCtrl.listTeamsByLeague);
router.post("/teams", leagueCtrl.createTeam);
router.delete("/teams/:id", leagueCtrl.deleteTeam);

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

// ═══════════════════════════════════════════════════════════════════════
// Phase 1: API-Football Core Infrastructure Routes
// ═══════════════════════════════════════════════════════════════════════

router.get("/football/standings/:leagueId", async (req, res) => {
  try {
    const { fetchStandings } = await import("../services/apiFootballService.js");
    const leagueId = parseInt(req.params.leagueId) || 39;
    const season = parseInt(req.query.season) || new Date().getFullYear();
    const data = await fetchStandings(leagueId, season);
    res.json(data);
  } catch (err) {
    console.error("Standings route error:", err);
    res.status(500).json({ error: "Failed to fetch standings" });
  }
});

router.get("/football/fixtures/:leagueId", async (req, res) => {
  try {
    const { fetchFixtures } = await import("../services/apiFootballService.js");
    const leagueId = parseInt(req.params.leagueId) || 39;
    const season = parseInt(req.query.season) || new Date().getFullYear();
    const data = await fetchFixtures(leagueId, season);
    res.json(data);
  } catch (err) {
    console.error("Fixtures route error:", err);
    res.status(500).json({ error: "Failed to fetch fixtures" });
  }
});

router.get("/football/leagues", async (req, res) => {
  try {
    const { TOP_LEAGUES } = await import("../services/apiFootballService.js");
    res.json({ leagues: TOP_LEAGUES });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch API-Football leagues" });
  }
});

router.post("/football/sync", async (req, res) => {
  try {
    const { syncMasterData } = await import("../services/apiFootballService.js");
    const result = await syncMasterData();
    res.json({ message: "Sync complete", ...result });
  } catch (err) {
    console.error("Sync route error:", err);
    res.status(500).json({ error: "Sync failed" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// Phase 2 & 3: ML Service Proxy Routes (StatsBomb + Visual Scraper)
// ═══════════════════════════════════════════════════════════════════════

const ML_URL = process.env.ML_SERVICE_URL || process.env.ML_URL || "http://127.0.0.1:5001";

// StatsBomb: Competitions
router.get("/statsbomb/competitions", async (req, res) => {
  try {
    const response = await fetch(`${ML_URL}/statsbomb/competitions`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("StatsBomb competitions proxy error:", err.message);
    res.status(500).json({ error: "Failed to fetch StatsBomb competitions" });
  }
});

// StatsBomb: Matches for a competition/season
router.get("/statsbomb/matches", async (req, res) => {
  try {
    const { competition_id, season_id } = req.query;
    const response = await fetch(
      `${ML_URL}/statsbomb/matches?competition_id=${competition_id}&season_id=${season_id}`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("StatsBomb matches proxy error:", err.message);
    res.status(500).json({ error: "Failed to fetch StatsBomb matches" });
  }
});

// StatsBomb: Passing Network
router.post("/statsbomb/passing-network", async (req, res) => {
  try {
    const response = await fetch(`${ML_URL}/statsbomb/passing-network`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("StatsBomb passing-network proxy error:", err.message);
    res.status(500).json({ error: "Failed to fetch passing network" });
  }
});

// StatsBomb: Pressure Map
router.post("/statsbomb/pressure-map", async (req, res) => {
  try {
    const response = await fetch(`${ML_URL}/statsbomb/pressure-map`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("StatsBomb pressure-map proxy error:", err.message);
    res.status(500).json({ error: "Failed to fetch pressure map" });
  }
});

// Visual Scraper: Match Heatmap
router.post("/visuals/match-heatmap", async (req, res) => {
  try {
    const response = await fetch(`${ML_URL}/visuals/match-heatmap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Visual heatmap proxy error:", err.message);
    res.status(500).json({ error: "Failed to fetch match heatmap" });
  }
});

// Visual Scraper: Match Shotmap
router.post("/visuals/match-shotmap", async (req, res) => {
  try {
    const response = await fetch(`${ML_URL}/visuals/match-shotmap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Visual shotmap proxy error:", err.message);
    res.status(500).json({ error: "Failed to fetch match shotmap" });
  }
});

export default router;

