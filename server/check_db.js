import mongoose from "mongoose";
import { Player, Team, League } from "./src/models/index.js";
import { connectDB } from "./src/config/db.js";

async function run() {
  await connectDB();
  const pCount = await Player.countDocuments();
  const tCount = await Team.countDocuments();
  const lCount = await League.countDocuments();
  console.log(`Players: ${pCount}, Teams: ${tCount}, Leagues: ${lCount}`);
  process.exit(0);
}
run();
