import React, { useState, useEffect } from "react";
import { Search, Star, Users, Scale, SlidersHorizontal, Brain, Plus, Trash2, ArrowRight } from "lucide-react";
import FutCard from "../components/FutCard";
import StatRadar from "../components/StatRadar";
import PlayerModal from "../components/PlayerModal";
import api, { searchPlayers, getSimilarPlayers, getWatchlist, addToWatchlist, removeFromWatchlist } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Scouting() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("search"); // 'search' | 'similar' | 'watchlist' | 'compare'

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Similar Player Finder state
  const [targetPlayer, setTargetPlayer] = useState(null);
  const [similarResults, setSimilarResults] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Watchlist state
  const [watchlist, setWatchlist] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);

  // Compare state
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);

  // Modal
  const [modalPlayer, setModalPlayer] = useState(null);

  // Load watchlist on mount if logged in
  useEffect(() => {
    if (user) {
      loadWatchlist();
    }
  }, [user]);

  const loadWatchlist = async () => {
    setLoadingWatchlist(true);
    try {
      const res = await getWatchlist();
      setWatchlist(res.watchlist || []);
    } catch (err) {
      console.error("Failed to load watchlist", err);
    } finally {
      setLoadingWatchlist(false);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setSearching(true);
    try {
      // Filtering server-side matters: the pool is ~20k players, so narrowing
      // a 24-row page in the browser would miss almost every match.
      const res = await searchPlayers(searchQuery, { position: positionFilter, limit: 30 });
      setSearchResults(res.players || []);
    } catch (err) {
      console.error("Search error", err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    // If no search query, still fetch to get a default list of players
    handleSearch();
  }, [positionFilter]);

  const handleFindSimilar = async (player) => {
    setTargetPlayer(player);
    setActiveTab("similar");
    setLoadingSimilar(true);
    try {
      const res = await getSimilarPlayers(player._id || player.sourceId, null, 5);
      setSimilarResults(res.results || []);
    } catch (err) {
      console.error("Failed to fetch similar players", err);
      setSimilarResults([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleToggleWatchlist = async (player) => {
    if (!user) {
      alert("Please login or register to save players to your watchlist.");
      return;
    }
    const isSaved = isPlayerInWatchlist(player._id);
    try {
      if (isSaved) {
        await removeFromWatchlist(player._id);
      } else {
        await addToWatchlist(player._id, "Added from Scouting tab");
      }
      await loadWatchlist();
    } catch (err) {
      console.error("Watchlist action failed", err);
    }
  };

  // The API returns { _id, note, addedAt, player } — the enriched player sits
  // under `player`, not `playerId`.
  const isPlayerInWatchlist = (playerId) => {
    return watchlist.some((item) => String(item.player?._id) === String(playerId));
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full flex flex-col gap-6">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-pitch-800 pb-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Scouting & Intelligence</h1>
          <p className="text-xs text-pitch-500 font-semibold tracking-wide uppercase mt-1">
            KNN Similarity Engine &middot; Multi-Attribute Search &middot; Head-to-Head Comparison
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex items-center gap-2 bg-pitch-900/80 p-1.5 rounded-xl border border-pitch-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "search" ? "bg-brand-500 text-pitch-950 shadow-md" : "text-pitch-400 hover:text-white"
            }`}
          >
            <Search className="h-3.5 w-3.5" /> Search Pool
          </button>
          <button
            onClick={() => setActiveTab("similar")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "similar" ? "bg-brand-500 text-pitch-950 shadow-md" : "text-pitch-400 hover:text-white"
            }`}
          >
            <Brain className="h-3.5 w-3.5" /> ML Finder
          </button>
          <button
            onClick={() => setActiveTab("compare")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "compare" ? "bg-brand-500 text-pitch-950 shadow-md" : "text-pitch-400 hover:text-white"
            }`}
          >
            <Scale className="h-3.5 w-3.5" /> Compare (H2H)
          </button>
          <button
            onClick={() => setActiveTab("watchlist")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "watchlist" ? "bg-brand-500 text-pitch-950 shadow-md" : "text-pitch-400 hover:text-white"
            }`}
          >
            <Star className="h-3.5 w-3.5" /> Watchlist ({watchlist.length})
          </button>
        </div>
      </div>

      {/* SEARCH TAB */}
      {activeTab === "search" && (
        <div className="flex flex-col gap-6">
          {/* Search bar & Filters */}
          <form onSubmit={handleSearch} className="bg-pitch-900/60 border border-pitch-700/60 p-4 rounded-xl flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pitch-500" />
              <input
                type="text"
                placeholder="Search player by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-pitch-950 border border-pitch-700 rounded-lg text-sm text-white placeholder-pitch-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-pitch-500" />
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="bg-pitch-950 border border-pitch-700 text-white rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Positions</option>
                <option value="GK">Goalkeepers (GK)</option>
                <option value="CB">Center Backs (CB)</option>
                <option value="LB,LWB">Left Backs (LB/LWB)</option>
                <option value="RB,RWB">Right Backs (RB/RWB)</option>
                <option value="CM,CDM,CAM,LM,RM">Midfielders (CM/CDM/CAM/LM/RM)</option>
                <option value="ST,CF,LW,RW">Strikers / Forwards (ST/CF/LW/RW)</option>
              </select>
            </div>

            <button
              type="submit"
              className="bg-brand-500 text-pitch-950 px-5 py-2 rounded-lg font-semibold text-sm hover:bg-brand-400 transition-colors"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {/* Results grid */}
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {searchResults.map((player) => {
                const inWatchlist = isPlayerInWatchlist(player._id);
                return (
                  <div key={player._id} className="relative group bg-pitch-900/40 border border-pitch-800 rounded-xl p-3 flex flex-col items-center gap-2 hover:border-pitch-700 transition-all">
                    <div className="cursor-pointer" onClick={() => setModalPlayer(player)}>
                      <FutCard player={player} showStats={true} />
                    </div>

                    <div className="flex items-center gap-1 w-full mt-1">
                      <button
                        onClick={() => handleFindSimilar(player)}
                        className="flex-1 bg-pitch-800 hover:bg-brand-500 hover:text-pitch-950 text-xs font-semibold py-1 px-2 rounded text-pitch-300 transition-colors flex items-center justify-center gap-1"
                        title="Find Similar Players"
                      >
                        <Brain className="h-3 w-3" /> Similar
                      </button>
                      <button
                        onClick={() => {
                          if (!compareA) setCompareA(player);
                          else if (!compareB) setCompareB(player);
                          else setCompareA(player);
                          setActiveTab("compare");
                        }}
                        className="bg-pitch-800 hover:bg-pitch-700 text-xs font-semibold py-1 px-2 rounded text-pitch-300 transition-colors"
                        title="Add to Compare"
                      >
                        <Scale className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleToggleWatchlist(player)}
                        className={`p-1.5 rounded transition-colors ${
                          inWatchlist ? "bg-amber-500/20 text-amber-400" : "bg-pitch-800 text-pitch-400 hover:text-amber-400"
                        }`}
                        title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                      >
                        <Star className={`h-3.5 w-3.5 ${inWatchlist ? "fill-amber-400" : ""}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-pitch-500 bg-pitch-900/30 border border-pitch-800/50 rounded-xl">
              <Search className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Type a name or pick a position above to scout players.</p>
            </div>
          )}
        </div>
      )}

      {/* SIMILAR PLAYERS (KNN) TAB */}
      {activeTab === "similar" && (
        <div className="flex flex-col gap-6">
          {targetPlayer ? (
            <div className="bg-pitch-900/60 border border-pitch-700/60 p-6 rounded-xl flex flex-col md:flex-row gap-6 items-center md:items-start">
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-2">Target Profile</span>
                <FutCard player={targetPlayer} showStats={true} />
              </div>

              <div className="flex-1 w-full">
                <h3 className="font-display text-xl font-bold mb-1">
                  ML Similarity Matches for {targetPlayer.name}
                </h3>
                <p className="text-xs text-pitch-500 mb-4">
                  Powered by KNN feature distance scaling (Pace, Shooting, Passing, Dribbling, Defending, Physical).
                </p>

                {loadingSimilar ? (
                  <p className="text-sm text-pitch-400 py-6">Calculating vector distances with ML microservice...</p>
                ) : similarResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {similarResults.map((res) => (
                      <div key={res.id} className="bg-pitch-950/80 border border-pitch-800 p-4 rounded-lg flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <FutCard player={res.player} isMini={true} />
                          <div>
                            <p className="font-semibold text-sm text-white">{res.player?.name}</p>
                            <p className="text-xs text-pitch-400">{res.player?.team} &middot; {res.player?.position}</p>
                            {res.key_differences && (
                              <p className="text-[11px] text-pitch-500 mt-1">
                                {Object.entries(res.key_differences)
                                  .slice(0, 2)
                                  .map(([k, v]) => `${v > 0 ? "+" : ""}${v} ${k}`)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-sm font-bold text-brand-400">{res.similarity_pct}%</span>
                          <p className="text-[10px] text-pitch-500 uppercase">Match</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-pitch-400 py-4">No close matches found in the loaded dataset.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-pitch-500 bg-pitch-900/30 border border-pitch-800/50 rounded-xl">
              <Brain className="h-10 w-10 mx-auto mb-2 text-brand-400/60" />
              <p className="text-sm">First select a player in the "Search Pool" tab and click "Similar".</p>
            </div>
          )}
        </div>
      )}

      {/* HEAD-TO-HEAD COMPARE TAB */}
      {activeTab === "compare" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Player A Selection */}
            <div className="bg-pitch-900/60 border border-pitch-700/60 p-4 rounded-xl flex flex-col items-center gap-4">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-pitch-400">Player A</h3>
              {compareA ? (
                <div className="flex flex-col items-center gap-3">
                  <FutCard player={compareA} showStats={true} />
                  <button onClick={() => setCompareA(null)} className="text-xs text-pulse-red hover:underline">Change Player</button>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-pitch-500">
                  Select Player A from search results or squad.
                </div>
              )}
            </div>

            {/* Player B Selection */}
            <div className="bg-pitch-900/60 border border-pitch-700/60 p-4 rounded-xl flex flex-col items-center gap-4">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-pitch-400">Player B</h3>
              {compareB ? (
                <div className="flex flex-col items-center gap-3">
                  <FutCard player={compareB} showStats={true} />
                  <button onClick={() => setCompareB(null)} className="text-xs text-pulse-red hover:underline">Change Player</button>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-pitch-500">
                  Select Player B from search results or squad.
                </div>
              )}
            </div>
          </div>

          {/* Comparison Stats & Radar */}
          {compareA && compareB && (
            <div className="bg-pitch-900/80 border border-pitch-700 p-6 rounded-xl flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h4 className="font-display text-lg font-bold mb-4">Attribute Comparison Radar</h4>
                <div className="h-64 border border-pitch-800 rounded-lg p-2 bg-pitch-950">
                  <StatRadar stats={compareA.stats} compareStats={compareB.stats} />
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-3">
                <h4 className="font-display text-lg font-bold">Attribute Breakdown</h4>
                {["pace", "shooting", "passing", "dribbling", "defending", "physical"].map((attr) => {
                  const valA = compareA.stats?.[attr] ?? 60;
                  const valB = compareB.stats?.[attr] ?? 60;
                  return (
                    <div key={attr} className="flex items-center text-xs gap-3">
                      <span className={`w-8 font-mono text-right ${valA > valB ? "text-brand-400 font-bold" : "text-pitch-400"}`}>{valA}</span>
                      <div className="flex-1 bg-pitch-950 h-2 rounded-full overflow-hidden flex">
                        <div className="bg-brand-400 h-full" style={{ width: `${valA}%` }} />
                      </div>
                      <span className="w-12 text-center uppercase font-bold text-pitch-500">{attr.slice(0, 3)}</span>
                      <div className="flex-1 bg-pitch-950 h-2 rounded-full overflow-hidden flex justify-end">
                        <div className="bg-sky-400 h-full" style={{ width: `${valB}%` }} />
                      </div>
                      <span className={`w-8 font-mono ${valB > valA ? "text-sky-400 font-bold" : "text-pitch-400"}`}>{valB}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* WATCHLIST TAB */}
      {activeTab === "watchlist" && (
        <div className="flex flex-col gap-6">
          {!user ? (
            <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-xl text-center text-amber-200">
              <Star className="h-8 w-8 mx-auto mb-2 text-amber-400" />
              <h3 className="font-bold text-lg mb-1">Account Required</h3>
              <p className="text-xs text-amber-300/80">Please log in from the Account menu in the header to view and manage your saved watchlist.</p>
            </div>
          ) : loadingWatchlist ? (
            <p className="text-sm text-pitch-400">Loading watchlist items...</p>
          ) : watchlist.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {watchlist.map((item) => {
                const player = item.player;
                if (!player) return null;
                return (
                  <div key={item._id} className="bg-pitch-900/60 border border-pitch-700/60 p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FutCard player={player} isMini={true} />
                      <div>
                        <p className="font-semibold text-sm text-white">{player.name}</p>
                        <p className="text-xs text-pitch-400">{player.team} &middot; {player.position}</p>
                        {item.note && <p className="text-[11px] text-pitch-500 italic mt-1">{item.note}</p>}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleWatchlist(player)}
                      className="p-2 bg-pitch-800 hover:bg-pulse-red/20 text-pitch-400 hover:text-pulse-red rounded-lg transition-colors"
                      title="Remove from Watchlist"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-pitch-500 bg-pitch-900/30 border border-pitch-800/50 rounded-xl">
              <Star className="h-10 w-10 mx-auto mb-2 text-amber-400/50" />
              <p className="text-sm">Your watchlist is currently empty. Star players from Search to keep track of them here!</p>
            </div>
          )}
        </div>
      )}

      {/* Modal detail */}
      {modalPlayer && (
        <PlayerModal player={modalPlayer} onClose={() => setModalPlayer(null)} />
      )}
    </div>
  );
}
