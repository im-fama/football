import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { connectDB } from "./config/db.js";
import routes from "./routes/players.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { mlHealth } from "./services/mlClient.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());
app.use(morgan("dev"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/api/health", async (req, res) => {
  const ml = await mlHealth();
  res.json({ status: "ok", timestamp: new Date().toISOString(), mlService: ml });
});

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[server] football-analytics API listening on :${PORT}`);
  });
}

start();
