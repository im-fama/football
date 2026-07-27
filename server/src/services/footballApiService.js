import axios from "axios";
import NodeCache from "node-cache";
import { computeRating } from "./ratingFormula.js";

const BASE = process.env.SPORTSDB_BASE_URL || "https://www.thesportsdb.com/api/v1/json";
// NOTE: TheSportsDB retired the old shared test key "3". The current
// free key is "123" (see https://www.thesportsdb.com/documentation).
// Using the old key silently returns empty/garbage results rather than
// an error, which is what was causing nothing to show up anywhere.
const KEY = process.env.SPORTSDB_API_KEY || "123";

const http = axios.create({ baseURL: `${BASE}/${KEY}`, timeout: 10000 });

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config ? `${err.config.baseURL}${err.config.url}` : "unknown endpoint";
    console.error(`[footballApi] request failed: ${url} -> ${err.message}`);
    throw err;
  }
);

// short-lived in-memory cache to smooth out bursts of requests for the
// same league/team within a few minutes (MongoDB handles the longer-term cache)
const memCache = new NodeCache({ stdTTL: 300 });

/**
 * A curated set of major leagues + a handful of well-stocked club IDs in
 * each, used by the migration/seed script so the dashboard has solid data
 * to show immediately instead of depending on a user's first click.
 * IDs are TheSportsDB idLeague / idTeam values.
 */
export const FEATURED_LEAGUES = [
  { league: "English Premier League", id: 4328 },
  { league: "Spanish La Liga", id: 4335 },
  { league: "Italian Serie A", id: 4332 },
  { league: "German Bundesliga", id: 4331 },
  { league: "French Ligue 1", id: 4334 },
];

/**
 * TheSportsDB's free tier exposes rosters/bios but not granular
 * per-90 performance stats (that's a premium-only "lookupplayerstats"
 * feature). To keep the analytics + ML pipeline fully functional
 * end-to-end without a paid subscription, we derive a deterministic
 * pseudo-statline per player (seeded by their player ID, so a given
 * player always gets the same numbers across requests - not random
 * noise on every call) rather than pretending it's live data.
 */
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

function derivedStats(sourceId, position) {
  const rand = seededRandom(String(sourceId || "seed"));
  const p = (position || "").toUpperCase();
  const isGK = p.includes("GOALKEEPER") || p.includes("GK");
  const isDef = p.includes("DEFENDER") || p.includes("BACK");
  const isFwd = p.includes("FORWARD") || p.includes("STRIKER") || p.includes("WINGER");

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
    pace: Math.round(55 + rand() * 40),
    dribbling: Math.round(50 + rand() * 45),
    physical: Math.round(50 + rand() * 42),
    recentRatingDelta: +((rand() - 0.5) * 6).toFixed(1),
  };
}

/**
 * Real player photos aren't available for every player on the free tier
 * (coverage is crowd-sourced and skews toward star players). Rather than
 * showing a broken image or a plain gray circle, unresolved players get a
 * generated portrait-style avatar (deterministic per name, no API key,
 * no rate limit) so every card always looks complete.
 */
function avatarFallback(name) {
  const bg = ["16a34a", "15803d", "166534", "0d9488", "059669"][
    Math.abs(hashCode(name || "")) % 5
  ];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Player")}&background=${bg}&color=fff&bold=true&size=256&font-size=0.42`;
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i) | 0;
  return h;
}

function normalizePlayer(raw) {
  const stats = derivedStats(raw.idPlayer, raw.strPosition);
  const rating = computeRating(stats, raw.strPosition || "MID");
  const realPhoto = raw.strCutout || raw.strThumb || raw.strRender || "";
  return {
    sourceId: raw.idPlayer,
    name: raw.strPlayer,
    team: raw.strTeam || "Free Agent",
    league: raw.strLeague || "",
    position: raw.strPosition || "MID",
    nationality: raw.strNationality || "",
    age: raw.dateBorn ? yearsSince(raw.dateBorn) : null,
    thumbnail: realPhoto || avatarFallback(raw.strPlayer),
    hasRealPhoto: Boolean(realPhoto),
    stats,
    computedRating: rating,
    fetchedAt: new Date(),
  };
}

function yearsSince(dateStr) {
  const born = new Date(dateStr);
  if (Number.isNaN(born.getTime())) return null;
  const diff = Date.now() - born.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

const STAFF_KEYWORDS = ["COACH", "MANAGER", "PHYSIO", "DIRECTOR", "SCOUT", "ANALYST"];
function isStaffRole(position = "") {
  const p = position.toUpperCase();
  return STAFF_KEYWORDS.some((kw) => p.includes(kw));
}

/** TheSportsDB's search_all_teams.php expects underscores in place of spaces. */
function slug(str = "") {
  return str.trim().replace(/\s+/g, "_");
}

export async function searchTeams(leagueOrName) {
  const cacheKey = `teams:${leagueOrName}`;
  const cached = memCache.get(cacheKey);
  if (cached) return cached;

  const { data } = await http.get("/search_all_teams.php", { params: { l: slug(leagueOrName) } });
  const teams = data?.teams || [];
  if (teams.length === 0) {
    console.warn(`[footballApi] no teams returned for league "${leagueOrName}" - check spelling/free-tier coverage.`);
  }
  memCache.set(cacheKey, teams);
  return teams;
}

export async function getPlayersByTeamId(teamId) {
  const cacheKey = `players:team:${teamId}`;
  const cached = memCache.get(cacheKey);
  if (cached) return cached;

  const { data } = await http.get("/lookup_all_players.php", { params: { id: teamId } });
  // Team rosters include backroom staff (coaches, managers) alongside
  // players - filter those out so the dashboard only shows footballers.
  const onlyPlayers = (data?.player || []).filter((p) => !isStaffRole(p.strPosition));
  const players = onlyPlayers.map(normalizePlayer);
  if (players.length === 0) {
    console.warn(`[footballApi] no players returned for team id ${teamId}.`);
  }
  memCache.set(cacheKey, players);
  return players;
}

export async function searchPlayersByName(name) {
  const cacheKey = `players:search:${name}`;
  const cached = memCache.get(cacheKey);
  if (cached) return cached;

  const { data } = await http.get("/searchplayers.php", { params: { p: slug(name) } });
  const players = (data?.player || []).map(normalizePlayer);
  memCache.set(cacheKey, players);
  return players;
}

export async function getAllLeagues() {
  const cacheKey = "leagues:all";
  const cached = memCache.get(cacheKey);
  if (cached) return cached;

  const { data } = await http.get("/all_leagues.php");
  const leagues = (data?.leagues || []).filter((l) => l.strSport === "Soccer");
  memCache.set(cacheKey, leagues, 3600);
  return leagues;
}

export { normalizePlayer };
