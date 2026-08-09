import React, { useState, useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { searchPlayers } from "../services/api";

/**
 * Inline player search dropdown. When the user types a name the component
 * queries the API and shows a dropdown of matching players.  Selecting one
 * fires `onSelect(player)`.
 */
export default function InlinePlayerSearch({ onSelect, placeholder = "Search player by name...", className = "" }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = async (q) => {
    if (!q || q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await searchPlayers(q, { limit: 10 });
      setResults(res.players || []);
      setOpen(true);
    } catch (err) {
      console.error("Inline search failed", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelect = (player) => {
    onSelect(player);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-pitch-500 group-focus-within:text-brand-400 transition-colors" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2.5 bg-pitch-950 border border-pitch-700 rounded-xl text-sm text-white placeholder-pitch-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-400 animate-spin" />
        )}
        {!loading && query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-pitch-500 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full bg-pitch-900 border border-pitch-700 rounded-xl shadow-2xl overflow-hidden max-h-[260px] overflow-y-auto scrollbar-thin">
          {results.map((player) => (
            <button
              key={player._id}
              onClick={() => handleSelect(player)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-pitch-800 transition-colors text-left border-b border-pitch-800/50 last:border-b-0"
            >
              {/* Mini avatar */}
              <div className="w-8 h-8 rounded-lg bg-pitch-800 border border-pitch-700 flex items-center justify-center text-[10px] font-bold text-pitch-400 uppercase flex-shrink-0 overflow-hidden">
                {player.imageUrl ? (
                  <img src={player.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  player.name?.charAt(0) || "?"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{player.name}</p>
                <p className="text-[10px] text-pitch-400 truncate">
                  {player.team || "Unknown"} · {player.position || "?"} · OVR {player.overallRating ?? player.computedRating ?? "—"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 mt-1.5 w-full bg-pitch-900 border border-pitch-700 rounded-xl shadow-2xl p-4 text-center">
          <p className="text-xs text-pitch-500">No players found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
