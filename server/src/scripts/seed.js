/**
 * Database migration + seed script.
 *
 * "Migration" here means: (1) establish the Mongo indexes Player.js
 * declares (text search + unique sourceId), and (2) pre-populate the
 * database with a curated set of top-5-league clubs so the dashboard
 * has real data to show immediately on first load, instead of waiting
 * on a user's first click (and instead of failing silently if the
 * upstream API is rate-limited at that exact moment).
 *
 * Run:  npm run seed        (from /server)
 */
import "dotenv/config";
import mongoose from "mongoose";
import Player from "../models/Player.js";
import { searchTeams, getPlayersByTeamId, FEATURED_LEAGUES } from "../services/footballApiService.js";

const TEAMS_PER_LEAGUE = Number(process.env.SEED_TEAMS_PER_LEAGUE) || 4;

async function main() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/football_analytics";
  console.log(`[seed] connecting to ${uri}`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

  console.log("[seed] syncing indexes (text search + unique sourceId)...");
  await Player.syncIndexes();

  let totalUpserted = 0;

  for (const { league } of FEATURED_LEAGUES) {
    console.log(`\n[seed] fetching clubs for "${league}"...`);
    let teams = [];
    try {
      teams = await searchTeams(league);
    } catch (err) {
      console.error(`[seed] could not fetch teams for ${league}: ${err.message}`);
      continue;
    }

    if (teams.length === 0) {
      console.warn(`[seed] no teams found for "${league}" - skipping. Check SPORTSDB_API_KEY.`);
      continue;
    }

    const subset = teams.slice(0, TEAMS_PER_LEAGUE);
    for (const team of subset) {
      try {
        const players = await getPlayersByTeamId(team.idTeam);
        if (players.length === 0) {
          console.warn(`  [seed] ${team.strTeam}: no players returned, skipping.`);
          continue;
        }
        const ops = players.map((p) => ({
          updateOne: { filter: { sourceId: p.sourceId }, update: { $set: p }, upsert: true },
        }));
        const result = await Player.bulkWrite(ops);
        const count = (result.upsertedCount || 0) + (result.modifiedCount || 0);
        totalUpserted += players.length;
        console.log(`  [seed] ${team.strTeam}: upserted ${players.length} players.`);
      } catch (err) {
        console.error(`  [seed] failed for team ${team.strTeam}: ${err.message}`);
      }
      // Free tier is rate-limited to ~30 req/min - space requests out a bit.
      await sleep(600);
    }
  }

  console.log(`\n[seed] done. ${totalUpserted} player records upserted.`);
  console.log("[seed] open MongoDB Compass and check the 'players' collection to verify.");
  await mongoose.disconnect();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("[seed] fatal error:", err);
  process.exit(1);
});
