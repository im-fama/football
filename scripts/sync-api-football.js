#!/usr/bin/env node
/**
 * sync-api-football.js — Daily Sync CLI Script (Phase 1)
 *
 * Connects to API-Football (or uses mock fallback) to sync:
 *   1. Master league IDs into MongoDB League collection
 *   2. Master team IDs into MongoDB Team collection (Single Source of Truth)
 *   3. Upcoming fixture schedules
 *   4. Current league standings
 *
 * Usage:
 *   node scripts/sync-api-football.js
 *
 * Schedule as daily cron:
 *   0 4 * * * cd /path/to/project && node scripts/sync-api-football.js >> logs/sync.log 2>&1
 */

import "dotenv/config";
import mongoose from "mongoose";
import { syncMasterData, fetchStandings, fetchFixtures, TOP_LEAGUES } from "../server/src/services/apiFootballService.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/taqtiq";

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  API-Football Daily Sync");
  console.log(`  ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════════\n");

  const hasKey = !!process.env.API_FOOTBALL_KEY;
  console.log(`  API Key: ${hasKey ? "✓ configured" : "✗ not set (using mock data)"}\n`);

  // Connect to MongoDB
  try {
    await mongoose.connect(MONGO_URI);
    console.log("  ✓ MongoDB connected\n");
  } catch (err) {
    console.error("  ✗ MongoDB connection failed:", err.message);
    process.exit(1);
  }

  // Step 1: Sync master data (leagues + teams)
  console.log("  [1/3] Syncing master league & team IDs...");
  const syncResult = await syncMasterData();
  console.log(`         ✓ Leagues: ${syncResult.leagues} | Teams: ${syncResult.teams}`);
  if (syncResult.errors.length > 0) {
    syncResult.errors.forEach((e) => console.log(`         ⚠ ${e}`));
  }

  // Step 2: Fetch & log standings for each league
  console.log("\n  [2/3] Fetching current standings...");
  for (const league of TOP_LEAGUES) {
    const { standings } = await fetchStandings(league.id);
    console.log(`         ${league.name}: ${standings.length} teams ranked`);
    if (standings.length > 0) {
      console.log(`           Leader: ${standings[0].name} (${standings[0].pts} pts)`);
    }
  }

  // Step 3: Fetch upcoming fixtures
  console.log("\n  [3/3] Fetching upcoming fixtures...");
  for (const league of TOP_LEAGUES) {
    const { fixtures } = await fetchFixtures(league.id);
    console.log(`         ${league.name}: ${fixtures.length} upcoming matches`);
  }

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  ✓ Sync complete!");
  console.log("═══════════════════════════════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
