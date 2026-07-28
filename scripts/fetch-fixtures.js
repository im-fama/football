import "dotenv/config";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = process.env.SPORTSDB_BASE_URL || "https://www.thesportsdb.com/api/v1/json";
const KEY = process.env.SPORTSDB_API_KEY || "123";

const http = axios.create({ baseURL: `${BASE}/${KEY}` });
const fixturesDir = path.join(__dirname, "..", "database", "fixtures");

// Ensure fixtures directory exists
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

async function fetchLeagues() {
  console.log("Fetching soccer leagues...");
  const { data } = await http.get("/all_leagues.php");
  const leagues = (data?.leagues || [])
    .filter((l) => l.strSport === "Soccer")
    .slice(0, 5)
    .map((l) => ({
      sourceId: l.idLeague,
      name: l.strLeague,
      country: l.strCountry || ""
    }));
  
  fs.writeFileSync(path.join(fixturesDir, "leagues.json"), JSON.stringify(leagues, null, 2));
  console.log(`Saved ${leagues.length} leagues.`);
  return leagues;
}

async function fetchTeams(leagues) {
  console.log("Fetching teams for leagues...");
  const allTeams = [];
  
  for (const league of leagues) {
    try {
      console.log(`Fetching teams for ${league.name}...`);
      const { data } = await http.get(`/search_all_teams.php?l=${encodeURIComponent(league.name)}`);
      const teams = (data?.teams || []).slice(0, 4).map((t) => ({
        sourceId: t.idTeam,
        leagueSourceId: league.sourceId,
        name: t.strTeam,
        badgeUrl: t.strTeamBadge || "",
        stadium: t.strStadium || ""
      }));
      allTeams.push(...teams);
    } catch (err) {
      console.error(`Failed to fetch teams for ${league.name}:`, err.message);
    }
  }

  fs.writeFileSync(path.join(fixturesDir, "teams.json"), JSON.stringify(allTeams, null, 2));
  console.log(`Saved ${allTeams.length} teams.`);
  return allTeams;
}

async function main() {
  try {
    const leagues = await fetchLeagues();
    await fetchTeams(leagues);
    console.log("Fixtures download complete!");
  } catch (err) {
    console.error("Fetch fixtures failed:", err);
  }
}

main();
