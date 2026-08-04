import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import csv from "csv-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * EA FC (Kaggle / sofifa) CSV loader.
 *
 * The raw dumps hold every FIFA edition from 15 through 24 stacked newest-first
 * (~180k male rows). We only want the newest edition, so we read the version of
 * the first data row and stop the stream as soon as a lower version appears -
 * that turns a 96 MB full parse into roughly 10 MB.
 */

const SOURCES = [
  {
    gender: "male",
    prefix: "m",
    players: "male_players.csv",
    teams: "male_teams.csv",
    coaches: "male_coaches.csv",
    leagueSuffix: ""
  },
  {
    gender: "female",
    prefix: "f",
    players: "female_players.csv",
    teams: "female_teams.csv",
    coaches: "female_coaches.csv",
    leagueSuffix: " (Women)"
  }
];

const CDN = "https://cdn.sofifa.net";

export function csvPath(filename) {
  return path.join(__dirname, filename);
}

/** True when at least one player dump is present on disk. */
export function hasKaggleCsv() {
  return SOURCES.some((s) => fs.existsSync(csvPath(s.players)));
}

export function missingKaggleCsv() {
  return SOURCES.flatMap((s) => [s.players, s.teams, s.coaches]).filter(
    (f) => !fs.existsSync(csvPath(f))
  );
}

function playerPhoto(playerId) {
  const id = String(playerId || "").replace(/\D/g, "");
  if (id.length < 4) return "";
  const padded = id.padStart(6, "0");
  return `${CDN}/players/${padded.slice(0, -3)}/${padded.slice(-3)}/24_120.png`;
}

function teamBadge(teamId) {
  const id = String(teamId || "").replace(/\D/g, "");
  if (!id) return "";
  return `${CDN}/teams/${id}/60.png`;
}

function num(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Streams a CSV, keeping only the rows belonging to the newest `fifa_version`.
 * Resolves as soon as an older edition is reached so we never read the tail.
 */
function readLatestEdition(file, onRow) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(file)) return resolve(0);

    let target = null;
    let kept = 0;
    let finished = false;
    const stream = fs.createReadStream(file);
    const parser = stream.pipe(csv());

    const done = () => {
      if (finished) return;
      finished = true;
      stream.destroy();
      resolve(kept);
    };

    parser.on("data", (row) => {
      if (finished) return;
      const version = String(row.fifa_version || "").trim();
      if (target === null) target = version;
      if (version !== target) return done();
      kept += 1;
      onRow(row);
    });
    parser.on("end", done);
    parser.on("error", (err) => {
      if (finished) return;
      finished = true;
      reject(err);
    });
    stream.on("error", (err) => {
      if (finished) return;
      finished = true;
      reject(err);
    });
  });
}

/** Deterministic PRNG so a given player always gets the same season line. */
function seededRandom(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 15), 1 | h);
    h ^= h + Math.imul(h ^ (h >>> 7), 61 | h);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The dataset ships attributes but no match output, so we derive a stable
 * season line from the player's rating and role. Good enough to drive the
 * leaderboards, the ML service and the analytics pages.
 */
function deriveSeasonStats(sourceId, position, overall, attrs) {
  const rand = seededRandom(String(sourceId));
  const p = (position || "").toUpperCase();
  const isGK = p === "GK";
  const isDef = ["CB", "LB", "RB", "LWB", "RWB"].includes(p);
  const isFwd = ["ST", "CF", "LW", "RW"].includes(p);
  const quality = Math.max(0.2, Math.min(1.3, overall / 75));

  const matches = Math.round((8 + rand() * 26) * quality);
  const minutes = matches * Math.round(40 + rand() * 50);
  const goals = isGK ? 0 : Math.round(rand() * (isFwd ? 22 : isDef ? 3 : 9) * quality);
  const assists = isGK ? 0 : Math.round(rand() * (isFwd ? 9 : 7) * quality);

  return {
    matches,
    minutes,
    goals,
    assists,
    passAccuracy: Math.max(40, Math.min(99, Math.round(attrs.passing * 0.6 + 30 + rand() * 8))),
    tacklesP90: isGK ? 0 : +((attrs.defending / 100) * (2 + rand() * 2.5)).toFixed(1),
    interceptionsP90: isGK ? 0 : +((attrs.defending / 100) * (1.5 + rand() * 2)).toFixed(1),
    shotsOnTargetPct: isGK ? 0 : Math.round((attrs.shooting / 100) * (30 + rand() * 40)),
    duelsWonPct: Math.round(35 + (attrs.physical / 100) * 40 + rand() * 10),
    savesP90: isGK ? +(1.5 + rand() * 4).toFixed(1) : 0,
    recentRatingDelta: +((rand() - 0.5) * 6).toFixed(1)
  };
}

/**
 * Loads leagues, clubs, players, coaches, attributes and season lines from the
 * CSV dumps into MongoDB. Assumes mongoose is already connected.
 *
 * @param {(update: {phase: string, detail?: string}) => void} onProgress
 */
export async function ingestKaggle({ onProgress = () => {} } = {}) {
  const missing = missingKaggleCsv();
  if (!hasKaggleCsv()) {
    throw new Error(
      `No Kaggle player CSVs found in ${__dirname}. Expected male_players.csv and/or female_players.csv.`
    );
  }
  if (missing.length) {
    console.warn(`[ingest] optional files missing, continuing without them: ${missing.join(", ")}`);
  }

  const mongoose = (await import("../server/src/config/mongoose.js")).default;
  const { League, Team, Player, PlayerAttributes, PlayerSeasonStats } = await import(
    "../server/src/models/index.js"
  );

  const leagues = new Map(); // key -> league doc
  const teams = new Map(); // key -> team doc
  const players = [];
  const attributes = [];
  const seasonStats = [];
  const seen = new Set();

  for (const source of SOURCES) {
    if (!fs.existsSync(csvPath(source.players))) continue;

    // ── clubs: stadium + coach linkage live in the teams dump ────────────────
    const clubMeta = new Map();
    onProgress({ phase: "parsing", detail: `${source.teams}` });
    await readLatestEdition(csvPath(source.teams), (row) => {
      clubMeta.set(String(row.team_id), {
        stadium: row.home_stadium || "",
        coachId: String(row.coach_id || ""),
        overall: num(row.overall, 0)
      });
    });

    // ── coaches, keyed so we can attach one MGR card per club ────────────────
    const coaches = new Map();
    onProgress({ phase: "parsing", detail: `${source.coaches}` });
    await readCoaches(csvPath(source.coaches), coaches);

    // ── players ──────────────────────────────────────────────────────────────
    onProgress({ phase: "parsing", detail: `${source.players}` });
    await readLatestEdition(csvPath(source.players), (row) => {
      const rawId = String(row.player_id || "").trim();
      if (!rawId) return;
      const sourceId = `${source.prefix}-${rawId}`;
      if (seen.has(sourceId)) return;
      seen.add(sourceId);

      const leagueName = (row.league_name || "").trim() || "Free Agents";
      const leagueKey = `${source.prefix}-${(row.league_id || leagueName).toString().trim()}`;
      if (!leagues.has(leagueKey)) {
        // Male and female competitions can share a name, and the client looks
        // leagues up by name — but don't stutter on names already marked.
        const needsSuffix = source.leagueSuffix && !/women/i.test(leagueName);
        leagues.set(leagueKey, {
          _id: new mongoose.Types.ObjectId(),
          sourceId: leagueKey,
          name: needsSuffix ? `${leagueName}${source.leagueSuffix}` : leagueName,
          country: ""
        });
      }
      const league = leagues.get(leagueKey);

      const clubName = (row.club_name || "").trim() || "Free Agents";
      const clubId = String(row.club_team_id || "").trim();
      const teamKey = `${source.prefix}-${clubId || clubName}`;
      if (!teams.has(teamKey)) {
        const meta = clubMeta.get(clubId) || {};
        teams.set(teamKey, {
          _id: new mongoose.Types.ObjectId(),
          sourceId: teamKey,
          name: clubName,
          badgeUrl: teamBadge(clubId),
          stadium: meta.stadium || "",
          leagueId: league._id,
          _coachId: meta.coachId || "",
          _gender: source.gender
        });
      }
      const team = teams.get(teamKey);

      const position = (row.player_positions || "RES").split(",")[0].trim().toUpperCase();
      const overall = num(row.overall, 65);
      const isGK = position === "GK";

      const playerId = new mongoose.Types.ObjectId();
      players.push({
        _id: playerId,
        sourceId,
        name: row.short_name || row.long_name || "Unknown Player",
        position,
        nationality: row.nationality_name || "",
        age: num(row.age, 25),
        photoUrl: playerPhoto(rawId),
        overallRating: overall,
        teamId: team._id
      });

      // Outfield six-stat block; goalkeepers expose their GK ratings in the
      // same slots so the FUT card and the KNN engine stay comparable.
      const attrs = isGK
        ? {
            pace: num(row.goalkeeping_speed, num(row.movement_acceleration, 55)),
            shooting: num(row.goalkeeping_diving, overall),
            passing: num(row.goalkeeping_handling, overall),
            dribbling: num(row.goalkeeping_kicking, overall),
            defending: num(row.goalkeeping_reflexes, overall),
            physical: num(row.goalkeeping_positioning, overall)
          }
        : {
            pace: num(row.pace, 65),
            shooting: num(row.shooting, 65),
            passing: num(row.passing, 65),
            dribbling: num(row.dribbling, 65),
            defending: num(row.defending, 65),
            physical: num(row.physic, 65)
          };

      attributes.push({ playerId, ...attrs });
      seasonStats.push({ playerId, ...deriveSeasonStats(sourceId, position, overall, attrs) });
    });

    // ── one manager card per club that has a coach on file ───────────────────
    for (const team of teams.values()) {
      if (team._gender !== source.gender || !team._coachId) continue;
      const coach = coaches.get(team._coachId);
      if (!coach) continue;
      const sourceId = `${source.prefix}c-${team._coachId}`;
      if (seen.has(sourceId)) continue;
      seen.add(sourceId);

      const playerId = new mongoose.Types.ObjectId();
      players.push({
        _id: playerId,
        sourceId,
        name: coach.name,
        position: "MGR",
        nationality: coach.nationality,
        age: coach.age,
        photoUrl: coach.photoUrl,
        overallRating: Math.max(60, (clubMeta.get(team.sourceId.split("-")[1]) || {}).overall || 70),
        teamId: team._id
      });
      attributes.push({
        playerId,
        pace: 50,
        shooting: 50,
        passing: 50,
        dribbling: 50,
        defending: 50,
        physical: 50
      });
    }
  }

  onProgress({
    phase: "parsed",
    detail: `${players.length} players · ${teams.size} clubs · ${leagues.size} leagues`
  });

  console.log("[ingest] clearing previous dataset...");
  await Promise.all([
    League.deleteMany({}),
    Team.deleteMany({}),
    Player.deleteMany({}),
    PlayerAttributes.deleteMany({}),
    PlayerSeasonStats.deleteMany({})
  ]);

  const strip = (t) => {
    const { _coachId, _gender, ...rest } = t;
    return rest;
  };

  // The client resolves a league by name, so names must be unique.
  const usedNames = new Set();
  for (const league of leagues.values()) {
    let name = league.name;
    let n = 2;
    while (usedNames.has(name)) name = `${league.name} (${n++})`;
    usedNames.add(name);
    league.name = name;
  }

  onProgress({ phase: "inserting", detail: "leagues & clubs" });
  await League.insertMany([...leagues.values()], { ordered: false });
  await Team.insertMany([...teams.values()].map(strip), { ordered: false });

  await insertChunked(Player, players, "players", onProgress);
  await insertChunked(PlayerAttributes, attributes, "attributes", onProgress);
  await insertChunked(PlayerSeasonStats, seasonStats, "season stats", onProgress);

  const summary = {
    leagues: leagues.size,
    teams: teams.size,
    players: players.length
  };
  console.log(
    `[ingest] loaded ${summary.players} players across ${summary.teams} clubs and ${summary.leagues} leagues.`
  );
  return summary;
}

function readCoaches(file, target) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(file)) return resolve(target);
    fs.createReadStream(file)
      .pipe(csv())
      .on("data", (row) => {
        const id = String(row.coach_id || "").trim();
        if (!id) return;
        const born = row.dob ? new Date(row.dob) : null;
        target.set(id, {
          name: row.short_name || row.long_name || "Coach",
          nationality: row.nationality_name || "",
          age:
            born && !Number.isNaN(born.getTime())
              ? Math.floor((Date.now() - born.getTime()) / (365.25 * 24 * 3600 * 1000))
              : null,
          photoUrl: row.coach_face_url || ""
        });
      })
      .on("end", () => resolve(target))
      .on("error", reject);
  });
}

async function insertChunked(Model, docs, label, onProgress) {
  const CHUNK = 5000;
  for (let i = 0; i < docs.length; i += CHUNK) {
    await Model.insertMany(docs.slice(i, i + CHUNK), { ordered: false });
    onProgress({
      phase: "inserting",
      detail: `${label} ${Math.min(i + CHUNK, docs.length)}/${docs.length}`
    });
  }
}

// Back-compat alias for the previous export name.
export const ingest = ingestKaggle;

// ── CLI: `npm run seed:kaggle` ───────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async function runStandalone() {
    const { connectDB, disconnectDB } = await import("../server/src/config/db.js");
    await connectDB({ autoBootstrap: false });
    try {
      const { bootstrapDatabase } = await import("./bootstrap.js");
      await bootstrapDatabase({ force: true });
    } catch (err) {
      console.error("[ingest] failed:", err);
      process.exitCode = 1;
    } finally {
      await disconnectDB();
    }
  })();
}
