import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import routes from "./routes/players.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { mlHealth } from "./services/mlClient.js";
import { isDbConnected } from "./config/db.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());
app.use(morgan("dev"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    // The client polls these while the dataset loads; they must never 429.
    skip: (req) => req.path === "/api/health" || req.path === "/api/admin/status",
  })
);

app.get("/api/health", async (req, res) => {
  const [ml, dataset] = await Promise.all([
    mlHealth(),
    import("../../database/bootstrap.js")
      .then((m) => m.getBootstrapStatus())
      .catch(() => null),
  ]);
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: isDbConnected() ? "connected" : "disconnected",
    dataset,
    mlService: ml,
  });
});

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
