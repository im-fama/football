import "dotenv/config";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { hasKaggleCsv, ingestKaggle } from "./ingest_kaggle.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFixture = (filename) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", filename), "utf-8"));

/**
 * Owns "make the database usable".
 *
 * Called on API start-up when the database is empty, and by
 * `POST /api/admin/seed-kaggle`. Loading the Kaggle dumps takes tens of
 * seconds, so the caller starts it without awaiting and the client polls
 * `GET /api/admin/status` - `state` is the single source of truth for both.
 */
const status = {
  state: "idle", // idle | running | ready | error
  source: null, // 'kaggle' | 'fixtures'
  phase: null,
  detail: null,
  startedAt: null,
  finishedAt: null,
  error: null,
  counts: { leagues: 0, teams: 0, players: 0 }
};

let inFlight = null;

export function getBootstrapStatus() {
  return { ...status, counts: { ...status.counts } };
}

export async function refreshCounts() {
  const { League, Team, Player } = await import("../server/src/models/index.js");
  status.counts = {
    leagues: await League.estimatedDocumentCount(),
    teams: await Team.estimatedDocumentCount(),
    players: await Player.estimatedDocumentCount()
  };
  return status.counts;
}

/** True when the database already holds a usable dataset. */
export async function isSeeded() {
  const { Player, Formation } = await import("../server/src/models/index.js");
  const [players, formations] = await Promise.all([
    Player.estimatedDocumentCount(),
    Formation.estimatedDocumentCount()
  ]);
  return players > 0 && formations > 0;
}

/**
 * Loads the dataset. Concurrent calls share the same run instead of racing each
 * other into duplicate-key errors, which is what used to happen when the
 * seed endpoint was hit twice.
 */
export function bootstrapDatabase({ force = false } = {}) {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    status.state = "running";
    status.error = null;
    status.startedAt = new Date().toISOString();
    status.finishedAt = null;

    try {
      if (!force && (await isSeeded())) {
        status.source = "existing";
        status.phase = "ready";
        status.detail = "database already populated";
        status.state = "ready";
        status.finishedAt = new Date().toISOString();
        await refreshCounts();
        return status.counts;
      }

      const onProgress = ({ phase, detail }) => {
        status.phase = phase;
        status.detail = detail || null;
        console.log(`[bootstrap] ${phase}${detail ? ` - ${detail}` : ""}`);
      };

      if (hasKaggleCsv()) {
        status.source = "kaggle";
        await ingestKaggle({ onProgress });
      } else {
        status.source = "fixtures";
        console.warn("[bootstrap] no Kaggle CSVs found - falling back to the JSON fixtures.");
        await seedFromFixtures({ onProgress });
      }

      onProgress({ phase: "supporting", detail: "formations, users, demo season" });
      await seedSupportingData();

      await refreshCounts();
      status.state = "ready";
      status.phase = "ready";
      status.detail = null;
      status.finishedAt = new Date().toISOString();
      console.log(
        `[bootstrap] ready: ${status.counts.players} players, ${status.counts.teams} teams, ${status.counts.leagues} leagues.`
      );
      return status.counts;
    } catch (err) {
      status.state = "error";
      status.error = err.message;
      status.finishedAt = new Date().toISOString();
      console.error("[bootstrap] failed:", err);
      throw err;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

// ── Fixture fallback (small hand-authored dataset) ───────────────────────────
async function seedFromFixtures({ onProgress }) {
  const mongoose = (await import("../server/src/config/mongoose.js")).default;
  const { League, Team, Player, PlayerAttributes, PlayerSeasonStats } = await import(
    "../server/src/models/index.js"
  );

  onProgress({ phase: "parsing", detail: "fixtures" });
  const leaguesRaw = readFixture("leagues.json");
  const teamsRaw = readFixture("teams.json");
  const playersRaw = readFixture("players.json");
  const attributesRaw = readFixture("playerAttributes.json");

  await Promise.all([
    League.deleteMany({}),
    Team.deleteMany({}),
    Player.deleteMany({}),
    PlayerAttributes.deleteMany({}),
    PlayerSeasonStats.deleteMany({})
  ]);

  onProgress({ phase: "inserting", detail: "leagues & clubs" });
  const leagues = await League.insertMany(leaguesRaw);
  const leagueMap = new Map(leagues.map((l) => [l.sourceId, l._id]));

  const teams = await Team.insertMany(
    teamsRaw.map((t) => ({
      sourceId: t.sourceId,
      name: t.name,
      badgeUrl: t.badgeUrl,
      stadium: t.stadium,
      leagueId: leagueMap.get(t.leagueSourceId) || null
    }))
  );
  const teamMap = new Map(teams.map((t) => [t.sourceId, t._id]));

  onProgress({ phase: "inserting", detail: "players" });
  const players = await Player.insertMany(
    playersRaw.map((p) => ({
      sourceId: p.sourceId,
      name: p.name,
      position: p.position,
      nationality: p.nationality,
      age: p.age,
      photoUrl: p.photoUrl,
      overallRating: p.overallRating,
      teamId: teamMap.get(p.teamSourceId) || null
    }))
  );
  const playerMap = new Map(players.map((p) => [p.sourceId, p._id]));

  await PlayerAttributes.insertMany(
    attributesRaw
      .map((a) => ({
        playerId: playerMap.get(a.playerSourceId),
        pace: a.pace,
        shooting: a.shooting,
        passing: a.passing,
        dribbling: a.dribbling,
        defending: a.defending,
        physical: a.physical
      }))
      .filter((a) => a.playerId)
  );

  // Season lines so the analytics pages have something to chart.
  const attrByPlayer = new Map();
  for (const a of attributesRaw) {
    const id = playerMap.get(a.playerSourceId);
    if (id) attrByPlayer.set(String(id), a);
  }
  await PlayerSeasonStats.insertMany(
    players.map((p) => {
      const a = attrByPlayer.get(String(p._id)) || {};
      const isGK = (p.position || "").toUpperCase().includes("GK");
      return {
        playerId: p._id,
        matches: 20,
        minutes: 1600,
        goals: isGK ? 0 : Math.round((a.shooting || 60) / 8),
        assists: isGK ? 0 : Math.round((a.passing || 60) / 12),
        passAccuracy: Math.min(99, Math.round((a.passing || 60) * 0.6 + 32)),
        tacklesP90: isGK ? 0 : +(((a.defending || 50) / 100) * 3).toFixed(1),
        interceptionsP90: isGK ? 0 : +(((a.defending || 50) / 100) * 2).toFixed(1),
        shotsOnTargetPct: isGK ? 0 : Math.round((a.shooting || 60) * 0.5),
        duelsWonPct: Math.round(35 + (a.physical || 60) * 0.4),
        savesP90: isGK ? 3.2 : 0,
        recentRatingDelta: 0
      };
    })
  );

  void mongoose;
}

// ── Formations, demo accounts, demo match data ───────────────────────────────
async function seedSupportingData() {
  const { Formation, User, Season, Match, MatchEvent, League, Team, Player } = await import(
    "../server/src/models/index.js"
  );

  // Formations are static config - always reset them so a slot tweak in the
  // fixture actually lands.
  const formationsRaw = readFixture("formations.json");
  await Formation.deleteMany({});
  await Formation.insertMany(formationsRaw);

  // Demo accounts (idempotent - never clobber a password the user changed).
  const passwordHash = bcrypt.hashSync("password123", bcrypt.genSaltSync(10));
  const defaults = [
    { email: "coach@taqtiq.com", role: "coach" },
    { email: "admin@taqtiq.com", role: "admin" }
  ];
  for (const { email, role } of defaults) {
    const existing = await User.findOne({ email });
    if (existing) continue;
    await User.create({
      email,
      passwordHash,
      role,
      preferences: { sidebarCollapsed: false, theme: "dark" }
    });
  }

  await seedDemoMatches({ League, Team, Player, Season, Match, MatchEvent });
}

const MATCHES_PER_CLUB = 2;

/**
 * Fully-evented demo fixtures for every club, so the Team Analytics page
 * (passing network / heatmap / shot map) has real coordinates to draw whichever
 * squad is selected. The dataset ships attributes only - no match data - so
 * this is generated, but deterministically: the same club always produces the
 * same fixtures.
 */
async function seedDemoMatches({ League, Team, Player, Season, Match, MatchEvent }) {
  const mongoose = (await import("../server/src/config/mongoose.js")).default;
  await Promise.all([Season.deleteMany({}), Match.deleteMany({}), MatchEvent.deleteMany({})]);

  const leagues = await League.find({}).lean();
  if (!leagues.length) return;

  const seasons = await Season.insertMany(
    leagues.map((l) => ({ leagueId: l._id, label: "2025/2026" }))
  );
  const seasonByLeague = new Map(seasons.map((s) => [String(s.leagueId), s._id]));

  const teams = await Team.find({}).lean();
  const byLeague = new Map();
  for (const team of teams) {
    const key = String(team.leagueId);
    if (!byLeague.has(key)) byLeague.set(key, []);
    byLeague.get(key).push(team);
  }

  const squads = await Player.find({ position: { $ne: "MGR" } })
    .select("_id teamId position overallRating")
    .sort({ overallRating: -1 })
    .lean();
  const squadByTeam = new Map();
  for (const player of squads) {
    const key = String(player.teamId);
    const list = squadByTeam.get(key) || [];
    if (list.length < 11) {
      list.push(player);
      squadByTeam.set(key, list);
    }
  }

  const matches = [];
  const matchSquads = [];

  for (const [leagueKey, clubs] of byLeague) {
    const seasonId = seasonByLeague.get(leagueKey);
    if (!seasonId || clubs.length < 2) continue;

    clubs.forEach((home, homeIdx) => {
      for (let n = 1; n <= MATCHES_PER_CLUB; n++) {
        const away = clubs[(homeIdx + n) % clubs.length];
        if (String(away._id) === String(home._id)) continue;
        const squad = squadByTeam.get(String(home._id));
        if (!squad || squad.length < 8) continue;

        const _id = new mongoose.Types.ObjectId();
        matches.push({
          _id,
          seasonId,
          homeTeamId: home._id,
          awayTeamId: away._id,
          date: new Date(Date.now() - (homeIdx % 5 === 0 ? n : n + 3) * 4 * 24 * 60 * 60 * 1000),
          homeScore: (homeIdx + n) % 4,
          awayScore: (homeIdx + n * 2) % 3
        });
        matchSquads.push({ matchId: _id, squad, seed: homeIdx + n });
      }
    });
  }

  await Match.insertMany(matches, { ordered: false });

  const events = [];
  for (const { matchId, squad, seed } of matchSquads) {
    const pick = (i) => squad[i % squad.length];

    const passes = [
      { from: 0, to: 1, x: 30, y: 15 },
      { from: 1, to: 2, x: 35, y: 25 },
      { from: 2, to: 3, x: 20, y: 45 },
      { from: 3, to: 4, x: 52, y: 48 },
      { from: 4, to: 5, x: 78, y: 55 },
      { from: 5, to: 6, x: 80, y: 72 },
      { from: 6, to: 3, x: 62, y: 76 },
      { from: 3, to: 7, x: 48, y: 50 }
    ];
    passes.forEach((p, i) => {
      events.push({
        matchId,
        playerId: pick(p.from)._id,
        minute: 5 + i,
        type: "pass",
        x: p.x,
        y: p.y,
        details: { receiverId: pick(p.to)._id, success: true }
      });
    });

    const shots = [
      { p: 10, x: 50, y: 78, onTarget: true, goal: true, minute: 15 },
      { p: 10, x: 52, y: 74, onTarget: true, goal: false, minute: 32 },
      { p: 9, x: 60, y: 72, onTarget: false, goal: false, minute: 48 },
      { p: 8, x: 38, y: 76, onTarget: true, goal: seed % 2 === 0, minute: 71 }
    ];
    shots.forEach((s) => {
      events.push({
        matchId,
        playerId: pick(s.p)._id,
        minute: s.minute,
        type: "shot",
        x: s.x,
        y: s.y,
        details: { onTarget: s.onTarget, goal: s.goal }
      });
    });

    squad.forEach((player, pIdx) => {
      const isDef = ["CB", "LB", "RB", "LWB", "RWB"].includes((player.position || "").toUpperCase());
      const count = isDef ? 4 : 2;
      for (let i = 0; i < count; i++) {
        events.push({
          matchId,
          playerId: player._id,
          minute: ((pIdx * 7 + i * 13 + seed) % 88) + 1,
          type: "tackle",
          x: 10 + ((pIdx * 17 + i * 29 + seed * 3) % 80),
          y: 10 + ((pIdx * 23 + i * 11 + seed * 5) % 60),
          details: { won: (pIdx + i + seed) % 3 !== 0 }
        });
      }
    });
  }

  const CHUNK = 10000;
  for (let i = 0; i < events.length; i += CHUNK) {
    await MatchEvent.insertMany(events.slice(i, i + CHUNK), { ordered: false });
  }
  console.log(`[bootstrap] seeded ${matches.length} demo fixtures with ${events.length} events.`);
}
