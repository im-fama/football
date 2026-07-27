import { Router } from "express";
import * as ctrl from "../controllers/playerController.js";

const router = Router();

router.get("/leagues", ctrl.listLeagues);
router.get("/teams", ctrl.listTeams);
router.get("/players", ctrl.listPlayersByTeam);
router.get("/players/search", ctrl.searchPlayers);
router.get("/players/:id", ctrl.getPlayer);
router.get("/players/:id/insights", ctrl.insights);
router.get("/players/:id/similar", ctrl.similar);

export default router;
