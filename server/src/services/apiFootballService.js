/**
 * API-Football Core Infrastructure Service (Phase 1)
 *
 * Connects to api-football (v3.football.api-sports.io) to fetch:
 *   - Master team IDs           (Single Source of Truth)
 *   - Upcoming league fixtures
 *   - Current league standings
 *
 * When API_FOOTBALL_KEY is not set, returns high-quality fallback/mock
 * data so the pipeline never breaks.
 *
 * Daily sync budget: 100 free requests / day.
 */

import axios from "axios";
import NodeCache from "node-cache";
import League from "../models/League.js";
import Team from "../models/Team.js";

const API_KEY = process.env.API_FOOTBALL_KEY || "";
const BASE_URL = "https://v3.football.api-sports.io";

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "x-apisports-key": API_KEY,
    "Content-Type": "application/json",
  },
});

// In-memory cache to avoid burning daily quota on duplicate calls
const cache = new NodeCache({ stdTTL: 3600 });

// ─── Top-tier league IDs on API-Football ────────────────────────────
const TOP_LEAGUES = [
  { id: 39,  name: "Premier League",  country: "England" },
  { id: 140, name: "La Liga",         country: "Spain" },
  { id: 135, name: "Serie A",         country: "Italy" },
  { id: 78,  name: "Bundesliga",      country: "Germany" },
  { id: 61,  name: "Ligue 1",         country: "France" },
];

// ─── Fallback mock data (used when no API key is configured) ────────
function mockStandings(leagueName) {
  const clubs = {
    "Premier League": [
      { rank: 1, name: "Arsenal",        played: 38, won: 28, draw: 6, lost: 4, gf: 91, ga: 29, gd: 62, pts: 90, form: "WWDWW" },
      { rank: 2, name: "Manchester City", played: 38, won: 27, draw: 7, lost: 4, gf: 96, ga: 34, gd: 62, pts: 88, form: "WWWDL" },
      { rank: 3, name: "Liverpool",      played: 38, won: 24, draw: 8, lost: 6, gf: 86, ga: 41, gd: 45, pts: 80, form: "WLWWW" },
      { rank: 4, name: "Aston Villa",    played: 38, won: 20, draw: 8, lost: 10, gf: 76, ga: 61, gd: 15, pts: 68, form: "DWWLW" },
      { rank: 5, name: "Tottenham",      played: 38, won: 20, draw: 6, lost: 12, gf: 74, ga: 61, gd: 13, pts: 66, form: "WDWWL" },
    ],
    "La Liga": [
      { rank: 1, name: "Real Madrid",     played: 38, won: 29, draw: 4, lost: 5, gf: 87, ga: 26, gd: 61, pts: 91, form: "WWWWL" },
      { rank: 2, name: "Barcelona",       played: 38, won: 26, draw: 7, lost: 5, gf: 79, ga: 44, gd: 35, pts: 85, form: "WWDWW" },
      { rank: 3, name: "Girona",          played: 38, won: 25, draw: 6, lost: 7, gf: 85, ga: 46, gd: 39, pts: 81, form: "LWWWW" },
      { rank: 4, name: "Atletico Madrid", played: 38, won: 24, draw: 4, lost: 10, gf: 70, ga: 43, gd: 27, pts: 76, form: "WDWWW" },
      { rank: 5, name: "Athletic Club",   played: 38, won: 19, draw: 11, lost: 8, gf: 61, ga: 37, gd: 24, pts: 68, form: "WDDWW" },
    ],
    "Serie A": [
      { rank: 1, name: "Inter Milan", played: 38, won: 29, draw: 7, lost: 2, gf: 89, ga: 22, gd: 67, pts: 94, form: "WWWDW" },
      { rank: 2, name: "AC Milan",    played: 38, won: 22, draw: 9, lost: 7, gf: 76, ga: 49, gd: 27, pts: 75, form: "WLDWW" },
      { rank: 3, name: "Juventus",    played: 38, won: 19, draw: 14, lost: 5, gf: 54, ga: 31, gd: 23, pts: 71, form: "DDWWW" },
      { rank: 4, name: "Atalanta",    played: 38, won: 23, draw: 3, lost: 12, gf: 68, ga: 48, gd: 20, pts: 69, form: "WWWLW" },
      { rank: 5, name: "Bologna",     played: 38, won: 19, draw: 10, lost: 9, gf: 54, ga: 32, gd: 22, pts: 68, form: "WDWWL" },
    ],
    "Bundesliga": [
      { rank: 1, name: "Bayer Leverkusen", played: 34, won: 28, draw: 6, lost: 0, gf: 89, ga: 24, gd: 65, pts: 90, form: "WWWDW" },
      { rank: 2, name: "Bayern Munich",    played: 34, won: 23, draw: 3, lost: 8, gf: 94, ga: 45, gd: 49, pts: 72, form: "WWLWW" },
      { rank: 3, name: "VfB Stuttgart",    played: 34, won: 23, draw: 2, lost: 9, gf: 78, ga: 39, gd: 39, pts: 73, form: "WDWLW" },
      { rank: 4, name: "RB Leipzig",       played: 34, won: 19, draw: 6, lost: 9, gf: 77, ga: 47, gd: 30, pts: 63, form: "WLWDW" },
      { rank: 5, name: "Borussia Dortmund", played: 34, won: 18, draw: 6, lost: 10, gf: 68, ga: 43, gd: 25, pts: 60, form: "WWWLW" },
    ],
    "Ligue 1": [
      { rank: 1, name: "PSG",      played: 34, won: 27, draw: 5, lost: 2, gf: 87, ga: 32, gd: 55, pts: 86, form: "WWWWW" },
      { rank: 2, name: "Monaco",   played: 34, won: 22, draw: 3, lost: 9, gf: 73, ga: 46, gd: 27, pts: 69, form: "WLWWW" },
      { rank: 3, name: "Brest",    played: 34, won: 19, draw: 9, lost: 6, gf: 55, ga: 32, gd: 23, pts: 68, form: "DWWWD" },
      { rank: 4, name: "Lille",    played: 34, won: 18, draw: 10, lost: 6, gf: 58, ga: 34, gd: 24, pts: 64, form: "WDDWW" },
      { rank: 5, name: "Nice",     played: 34, won: 16, draw: 10, lost: 8, gf: 52, ga: 38, gd: 14, pts: 58, form: "DWWLW" },
    ],
  };
  return clubs[leagueName] || clubs["Premier League"];
}

function mockFixtures(leagueName) {
  const teamNames = mockStandings(leagueName).map((t) => t.name);
  const now = new Date();
  return Array.from({ length: 5 }, (_, i) => {
    const home = teamNames[i % teamNames.length];
    const away = teamNames[(i + 2) % teamNames.length];
    const d = new Date(now);
    d.setDate(d.getDate() + i + 1);
    return {
      fixtureId: `mock_fix_${i}_${leagueName.replace(/\s/g, "")}`,
      date: d.toISOString(),
      status: "NS",
      home,
      away,
      homeScore: null,
      awayScore: null,
      venue: `Stadium ${i + 1}`,
    };
  });
}

// ─── Live API methods (consume daily quota) ─────────────────────────

/**
 * Fetch current standings for a league from API-Football.
 * Falls back to mock data when key is absent.
 */
export async function fetchStandings(leagueId, season = new Date().getFullYear()) {
  const leagueMeta = TOP_LEAGUES.find((l) => l.id === leagueId);
  const leagueName = leagueMeta?.name || "Premier League";

  if (!API_KEY) {
    return { league: leagueName, standings: mockStandings(leagueName) };
  }

  const cKey = `standings:${leagueId}:${season}`;
  const hit = cache.get(cKey);
  if (hit) return hit;

  try {
    const { data } = await http.get("/standings", {
      params: { league: leagueId, season },
    });

    const raw = data?.response?.[0]?.league?.standings?.[0] || [];
    const standings = raw.map((t) => ({
      rank: t.rank,
      name: t.team?.name,
      teamId: t.team?.id,
      logo: t.team?.logo,
      played: t.all?.played || 0,
      won: t.all?.win || 0,
      draw: t.all?.draw || 0,
      lost: t.all?.lose || 0,
      gf: t.all?.goals?.for || 0,
      ga: t.all?.goals?.against || 0,
      gd: t.goalsDiff || 0,
      pts: t.points || 0,
      form: t.form || "",
    }));

    const result = { league: leagueName, standings };
    cache.set(cKey, result);
    return result;
  } catch (err) {
    console.error(`[API-Football] standings error for league ${leagueId}:`, err.message);
    return { league: leagueName, standings: mockStandings(leagueName) };
  }
}

/**
 * Fetch upcoming fixtures for a league.
 */
export async function fetchFixtures(leagueId, season = new Date().getFullYear()) {
  const leagueMeta = TOP_LEAGUES.find((l) => l.id === leagueId);
  const leagueName = leagueMeta?.name || "Premier League";

  if (!API_KEY) {
    return { league: leagueName, fixtures: mockFixtures(leagueName) };
  }

  const cKey = `fixtures:${leagueId}:${season}`;
  const hit = cache.get(cKey);
  if (hit) return hit;

  try {
    const { data } = await http.get("/fixtures", {
      params: { league: leagueId, season, next: 10 },
    });

    const fixtures = (data?.response || []).map((f) => ({
      fixtureId: f.fixture?.id,
      date: f.fixture?.date,
      status: f.fixture?.status?.short || "NS",
      home: f.teams?.home?.name,
      away: f.teams?.away?.name,
      homeScore: f.goals?.home,
      awayScore: f.goals?.away,
      venue: f.fixture?.venue?.name || "",
    }));

    const result = { league: leagueName, fixtures };
    cache.set(cKey, result);
    return result;
  } catch (err) {
    console.error(`[API-Football] fixtures error for league ${leagueId}:`, err.message);
    return { league: leagueName, fixtures: mockFixtures(leagueName) };
  }
}

/**
 * Sync master team IDs and league data into MongoDB.
 * This is called from the daily cron sync script.
 */
export async function syncMasterData() {
  const results = { leagues: 0, teams: 0, errors: [] };

  for (const leagueMeta of TOP_LEAGUES) {
    try {
      // Upsert league
      await League.findOneAndUpdate(
        { sourceId: String(leagueMeta.id) },
        { sourceId: String(leagueMeta.id), name: leagueMeta.name, country: leagueMeta.country },
        { upsert: true, new: true }
      );
      results.leagues++;

      // Fetch standings to get team list with IDs
      const { standings } = await fetchStandings(leagueMeta.id);
      const league = await League.findOne({ sourceId: String(leagueMeta.id) });

      for (const row of standings) {
        await Team.findOneAndUpdate(
          { sourceId: String(row.teamId || row.name) },
          {
            sourceId: String(row.teamId || row.name),
            name: row.name,
            badgeUrl: row.logo || "",
            leagueId: league?._id || null,
          },
          { upsert: true, new: true }
        );
        results.teams++;
      }
    } catch (err) {
      results.errors.push(`${leagueMeta.name}: ${err.message}`);
    }
  }

  return results;
}

export { TOP_LEAGUES };
