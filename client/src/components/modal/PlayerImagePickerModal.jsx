import React, { useState, useEffect } from "react";
import { searchPlayers } from "../../services/api";
import { Search, X, UserCheck, Image } from "lucide-react";

export default function PlayerImagePickerModal({ onSelectPlayerImage, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initial search with popular players
    handleSearch("Messi");
  }, []);

  const handleSearch = async (q) => {
    setLoading(true);
    try {
      const data = await searchPlayers(q || "A");
      setResults(data.players || []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitSearch = (e) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-pitch-900 border border-brand-500/40 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-pitch-800 bg-pitch-950/60">
          <div className="flex items-center gap-2 text-white">
            <Image className="h-5 w-5 text-brand-400" />
            <h2 className="font-display font-bold text-lg uppercase tracking-wide">
              Select Player Image from Existing Teams
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-pitch-400 hover:text-white p-1 rounded-lg bg-pitch-800/50 hover:bg-pitch-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-5 border-b border-pitch-800 bg-pitch-900">
          <form onSubmit={onSubmitSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pitch-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search real players (e.g. Messi, Mbappé, Haaland)..."
                className="w-full pl-10 pr-4 py-2.5 bg-pitch-950 border border-pitch-700 rounded-xl text-sm text-white placeholder-pitch-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <button
              type="submit"
              className="bg-brand-500 hover:bg-brand-400 text-pitch-950 font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              Search
            </button>
          </form>
        </div>

        {/* Grid Results */}
        <div className="p-5 flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-pitch-400 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              <span className="text-sm">Fetching player images...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-pitch-400 text-sm">
              No matching players found. Try a different search term.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {results.map((player) => (
                <div
                  key={player._id || player.sourceId}
                  onClick={() => {
                    onSelectPlayerImage(player);
                    onClose();
                  }}
                  className="bg-pitch-950 border border-pitch-800 hover:border-brand-500 rounded-xl p-3 flex flex-col items-center cursor-pointer transition-all hover:scale-105 group relative"
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-pitch-900 border border-pitch-700 mb-2 flex items-center justify-center relative">
                    {player.thumbnail ? (
                      <img
                        src={player.thumbnail}
                        alt={player.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="font-bold text-xs text-brand-400 uppercase">
                        {player.name?.[0]}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-xs text-white truncate max-w-full text-center group-hover:text-brand-300">
                    {player.name}
                  </span>
                  <span className="text-[10px] text-pitch-400 truncate max-w-full text-center">
                    {player.team || "Club"} • {player.position}
                  </span>
                  <div className="mt-2 text-[10px] bg-brand-500/20 text-brand-400 font-bold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Select Image
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
