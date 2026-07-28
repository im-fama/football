import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  League,
  Team,
  Player,
  PlayerAttributes,
  PlayerSeasonStats,
  Season,
  Match,
  MatchEvent,
  Formation,
  User
} from "../server/src/models/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFixture = (filename) => {
  const p = path.join(__dirname, "fixtures", filename);
  return JSON.parse(fs.readFileSync(p, "utf-8"));
};

// Seed helper for deterministic stats similar to footballApiService
function seededRandom(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 15), 1 | h);
    h ^= h + Math.imul(h ^ (h >>> 7), 61 | h);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

function deriveStats(sourceId, position) {
  const rand = seededRandom(String(sourceId || "seed"));
  const p = (position || "").toUpperCase();
  const isGK = p.includes("GOALKEEPER") || p.includes("GK") || p.includes("MGR");
  const isDef = p.includes("DEFENDER") || p.includes("BACK") || p.includes("CB") || p.includes("LB") || p.includes("RB");
  const isFwd = p.includes("FORWARD") || p.includes("STRIKER") || p.includes("WINGER") || p.includes("ST") || p.includes("LW") || p.includes("RW");

  const matches = Math.round(10 + rand() * 26);
  const minutes = matches * Math.round(45 + rand() * 45);
  const goals = isGK ? 0 : Math.round(rand() * (isFwd ? 24 : isDef ? 3 : 10));
  const assists = isGK ? 0 : Math.round(rand() * (isFwd ? 10 : 8));

  return {
    matches,
    minutes,
    goals,
    assists,
    passAccuracy: Math.round(65 + rand() * 28),
    tacklesP90: isGK ? 0 : +(rand() * (isDef ? 4 : 2.5)).toFixed(1),
    interceptionsP90: isGK ? 0 : +(rand() * (isDef ? 3 : 1.8)).toFixed(1),
    shotsOnTargetPct: isGK ? 0 : Math.round(rand() * 60),
    duelsWonPct: Math.round(35 + rand() * 45),
    savesP90: isGK ? +(1.5 + rand() * 4).toFixed(1) : 0,
    recentRatingDelta: +((rand() - 0.5) * 6).toFixed(1)
  };
}

async function seed() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taqtiq";
  console.log(`[seed] Connecting to database: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  console.log("[seed] Cleaning old data...");
  await Promise.all([
    League.deleteMany({}),
    Team.deleteMany({}),
    Player.deleteMany({}),
    PlayerAttributes.deleteMany({}),
    PlayerSeasonStats.deleteMany({}),
    Season.deleteMany({}),
    Match.deleteMany({}),
    MatchEvent.deleteMany({}),
    Formation.deleteMany({}),
    User.deleteMany({})
  ]);

  // Load raw fixture files
  const leaguesRaw = readFixture("leagues.json");
  const teamsRaw = readFixture("teams.json");
  const playersRaw = readFixture("players.json");
  const attributesRaw = readFixture("playerAttributes.json");
  const formationsRaw = readFixture("formations.json");

  console.log("[seed] Seeding leagues...");
  const leagues = await League.insertMany(leaguesRaw);
  const leagueMap = new Map(leagues.map((l) => [l.sourceId, l._id]));

  console.log("[seed] Seeding teams...");
  const teamsData = teamsRaw.map((t) => ({
    sourceId: t.sourceId,
    name: t.name,
    badgeUrl: t.badgeUrl,
    stadium: t.stadium,
    leagueId: leagueMap.get(t.leagueSourceId) || null
  }));
  const teams = await Team.insertMany(teamsData);
  const teamMap = new Map(teams.map((t) => [t.sourceId, t._id]));

  console.log("[seed] Seeding players...");
  const playersData = playersRaw.map((p) => ({
    sourceId: p.sourceId,
    name: p.name,
    position: p.position,
    nationality: p.nationality,
    age: p.age,
    photoUrl: p.photoUrl,
    overallRating: p.overallRating,
    teamId: teamMap.get(p.teamSourceId) || null
  }));
  const players = await Player.insertMany(playersData);
  const playerMap = new Map(players.map((p) => [p.sourceId, p._id]));

  console.log("[seed] Seeding player attributes...");
  const attributesData = attributesRaw.map((attr) => ({
    playerId: playerMap.get(attr.playerSourceId),
    pace: attr.pace,
    shooting: attr.shooting,
    passing: attr.passing,
    dribbling: attr.dribbling,
    defending: attr.defending,
    physical: attr.physical
  })).filter(a => a.playerId);
  await PlayerAttributes.insertMany(attributesData);

  console.log("[seed] Seeding formations...");
  await Formation.insertMany(formationsRaw);

  console.log("[seed] Seeding users...");
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync("password123", salt);
  
  const coachUser = new User({
    email: "coach@taqtiq.com",
    passwordHash,
    role: "coach",
    preferences: {
      sidebarCollapsed: false,
      theme: "dark",
      defaultLeague: "Italian Serie A",
      defaultTeam: String(teamMap.get("133857") || "")
    }
  });

  const adminUser = new User({
    email: "admin@taqtiq.com",
    passwordHash,
    role: "admin",
    preferences: {
      sidebarCollapsed: false,
      theme: "dark",
      defaultLeague: "Italian Serie A",
      defaultTeam: String(teamMap.get("133857") || "")
    }
  });

  await coachUser.save();
  await adminUser.save();

  console.log("[seed] Seeding seasons, matches and match events...");
  const defaultSeason = new Season({
    leagueId: leagueMap.get("4332"), // Serie A
    label: "2025/2026"
  });
  await defaultSeason.save();

  // Seeding PlayerSeasonStats for each player
  const seasonStats = players.map((p) => {
    const stats = deriveStats(p.sourceId, p.position);
    return {
      playerId: p._id,
      seasonId: defaultSeason._id,
      ...stats
    };
  });
  await PlayerSeasonStats.insertMany(seasonStats);

  // Seed two sample matches for Torino (Torino vs Juventus and Torino vs AC Milan)
  const torinoId = teamMap.get("133857");
  const juventusId = teamMap.get("133843");
  const milanId = teamMap.get("133821");

  if (torinoId && juventusId) {
    const match1 = new Match({
      seasonId: defaultSeason._id,
      homeTeamId: torinoId,
      awayTeamId: juventusId,
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      homeScore: 2,
      awayScore: 1
    });
    await match1.save();

    // Add match events for passing network and heatmap
    // We want a list of passing coordinates and shots for Torino
    const torinoPlayers = players.filter((p) => String(p.teamId) === String(torinoId));
    const events = [];

    // Let's create passing connections: a chain of passes
    const passCoords = [
      { fromIdx: 0, toIdx: 1, x: 30, y: 15, time: 5 },  // GK to CB
      { fromIdx: 1, toIdx: 2, x: 35, y: 25, time: 6 },  // CB to LB
      { fromIdx: 2, toIdx: 3, x: 20, y: 45, time: 7 },  // LB to CM
      { fromIdx: 3, toIdx: 4, x: 52, y: 48, time: 8 },  // CM to RM
      { fromIdx: 4, toIdx: 5, x: 78, y: 55, time: 9 },  // RM to RW
      { fromIdx: 5, toIdx: 6, x: 80, y: 72, time: 10 }, // RW to ST
      { fromIdx: 6, toIdx: 3, x: 62, y: 76, time: 12 }, // ST to CM
      { fromIdx: 3, toIdx: 7, x: 48, y: 50, time: 13 }  // CM to CAM
    ];

    passCoords.forEach((coord) => {
      const pFrom = torinoPlayers[coord.fromIdx % torinoPlayers.length];
      const pTo = torinoPlayers[coord.toIdx % torinoPlayers.length];
      events.push(new MatchEvent({
        matchId: match1._id,
        playerId: pFrom._id,
        minute: coord.time,
        type: "pass",
        x: coord.x,
        y: coord.y,
        details: { receiverId: pTo._id, success: true }
      }));
    });

    // Add some shots
    const shotCoords = [
      { playerIdx: 6, x: 50, y: 78, onTarget: true, minute: 15 },
      { playerIdx: 6, x: 52, y: 74, onTarget: true, minute: 32 },
      { playerIdx: 5, x: 60, y: 72, onTarget: false, minute: 48 },
      { playerIdx: 7, x: 38, y: 76, onTarget: true, minute: 71 }
    ];

    shotCoords.forEach((coord) => {
      const p = torinoPlayers[coord.playerIdx % torinoPlayers.length];
      events.push(new MatchEvent({
        matchId: match1._id,
        playerId: p._id,
        minute: coord.minute,
        type: "shot",
        x: coord.x,
        y: coord.y,
        details: { onTarget: coord.onTarget, goal: coord.minute === 15 || coord.minute === 71 }
      }));
    });

    // Add some defensive actions for heatmaps
    torinoPlayers.forEach((p, idx) => {
      const isDef = p.position.includes("CB") || p.position.includes("LB") || p.position.includes("RB");
      const numEvents = isDef ? 5 : 2;
      for (let i = 0; i < numEvents; i++) {
        events.push(new MatchEvent({
          matchId: match1._id,
          playerId: p._id,
          minute: Math.round(1 + Math.random() * 88),
          type: "tackle",
          x: Math.round(10 + Math.random() * 80),
          y: Math.round(10 + Math.random() * 60),
          details: { won: Math.random() > 0.3 }
        }));
      }
    });

    await MatchEvent.insertMany(events);
  }

  console.log("[seed] Seeding successfully completed!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[seed] Seed failed:", err);
  process.exit(1);
});
