import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import Navbar from "../components/Navbar";
import SearchFilters from "../components/SearchFilters";
import PlayerCard from "../components/PlayerCard";
import PlayerModal from "../components/PlayerModal";
import LoadingSpinner from "../components/LoadingSpinner";
import * as api from "../services/api";

// Matches server/src/services/footballApiService.js FEATURED_LEAGUES -
// used so the dashboard can pick a sensible default on first load.
const DEFAULT_LEAGUE = "English Premier League";

export default function Dashboard() {
  const [apiOnline, setApiOnline] = useState(true);
  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [position, setPosition] = useState("ALL");

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .getHealth()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));

    api
      .getLeagues()
      .then((data) => {
        const list = data.leagues || [];
        setLeagues(list);
        const preferred = list.find((l) => l.strLeague === DEFAULT_LEAGUE);
        setSelectedLeague(preferred ? preferred.strLeague : list[0]?.strLeague || "");
      })
      .catch(() => setApiOnline(false));
  }, []);

  useEffect(() => {
    if (!selectedLeague) {
      setTeams([]);
      setSelectedTeam("");
      return;
    }
    api
      .getTeams(selectedLeague)
      .then((data) => {
        const list = data.teams || [];
        setTeams(list);
        setSelectedTeam(list[0]?.idTeam || "");
      })
      .catch(() => setTeams([]));
  }, [selectedLeague]);

  useEffect(() => {
    if (!selectedTeam) return;
    setLoading(true);
    setError("");
    api
      .getPlayersByTeam(selectedTeam)
      .then((data) => setPlayers(data.players || []))
      .catch(() =>
        setError(
          "Could not load this squad. Make sure the server and MongoDB are running (see README) and that SPORTSDB_API_KEY is set to \"123\"."
        )
      )
      .finally(() => setLoading(false));
  }, [selectedTeam]);

  async function handleSearch() {
    if (!query || query.trim().length < 2) return;
    setLoading(true);
    setError("");
    setSelectedTeam("");
    try {
      const data = await api.searchPlayers(query.trim());
      setPlayers(data.players || []);
    } catch {
      setError("Search failed. Check that the server is running and reachable.");
    } finally {
      setLoading(false);
    }
  }

  const filteredPlayers = useMemo(() => {
    if (position === "ALL") return players;
    return players.filter((p) => (p.position || "").toUpperCase().includes(positionKeyword(position)));
  }, [players, position]);

  const currentTeam = teams.find((t) => String(t.idTeam) === String(selectedTeam));

  return (
    <div className="min-h-screen pb-20">
      <Navbar query={query} onQueryChange={setQuery} onSubmit={handleSearch} apiOnline={apiOnline} />

      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" /> Live Player Intelligence
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {currentTeam ? currentTeam.strTeam : "Player Intelligence Dashboard"}
            </h1>
            <p className="mt-1 text-sm text-pitch-500">
              Browse a squad, search any player, and open a card for ML-driven rating &amp; form predictions.
            </p>
          </div>
          {currentTeam?.strTeamBadge && (
            <img
              src={currentTeam.strTeamBadge}
              alt={`${currentTeam.strTeam} badge`}
              className="h-16 w-16 object-contain drop-shadow-lg"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
        </motion.div>

        <SearchFilters
          leagues={leagues}
          selectedLeague={selectedLeague}
          onLeagueChange={setSelectedLeague}
          teams={teams}
          selectedTeam={selectedTeam}
          onTeamChange={setSelectedTeam}
          position={position}
          onPositionChange={setPosition}
        />

        <div className="mt-6">
          {loading && <LoadingSpinner label="Fetching players" />}

          {!loading && error && (
            <div className="flex items-start gap-3 rounded-xl border border-pulse-red/30 bg-pulse-red/10 p-5 text-sm text-pulse-red">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && filteredPlayers.length === 0 && (
            <div className="rounded-xl border border-dashed border-pitch-600 bg-pitch-900/40 p-12 text-center">
              <p className="font-display text-lg text-pitch-500">No players loaded yet</p>
              <p className="mt-1 text-sm text-pitch-600">
                Pick a league and club above, or search for a player by name to get started. If this
                stays empty, run <code className="rounded bg-pitch-800 px-1.5 py-0.5 text-brand-400">npm run seed</code> in{" "}
                <code className="rounded bg-pitch-800 px-1.5 py-0.5 text-brand-400">/server</code> to pre-populate the database.
              </p>
            </div>
          )}

          {!loading && !error && filteredPlayers.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredPlayers.map((p, i) => (
                <PlayerCard key={p._id || p.sourceId} player={p} index={i} onClick={setSelectedPlayer} />
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          poolTeamId={selectedTeam}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}

function positionKeyword(code) {
  switch (code) {
    case "GK":
      return "GOALKEEPER";
    case "DEF":
      return "DEFEND";
    case "MID":
      return "MID";
    case "FWD":
      return "FORWARD";
    default:
      return "";
  }
}
