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

// Players
router.get("/players", playerCtrl.listPlayersByTeam);
router.get("/players/search", playerCtrl.searchPlayers);
router.get("/players/:id", playerCtrl.getPlayer);
router.get("/players/:id/insights", playerCtrl.insights);
router.get("/players/:id/similar", playerCtrl.similar);
router.put("/players/:id/notes", playerCtrl.updateNotes);
router.put("/players/:id/instructions", playerCtrl.updateInstructions);

// Formations presets
router.get("/formations", formationCtrl.listFormations);

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
