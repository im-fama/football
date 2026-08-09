import React, { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import { searchPlayers } from "../../services/api";
import { useSquad } from "../../context/SquadContext";
import FutCard from "../FutCard";

export default function PlayerSearchModal({ targetSlot, onClose, onSelect }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const { updateStarter } = useSquad();

  // Slot codes carry a numeric suffix (CB1, CDM2) that positions never have.
  const slotPosition = targetSlot ? targetSlot.replace(/\d+$/, "") : "";

  useEffect(() => {
    fetchPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSlot]);

  const fetchPlayers = async (searchQuery = "") => {
    setLoading(true);
    try {
      // With no search term, pre-filter to the slot's position so the grid
      // opens on relevant players instead of the global top 50.
      const data = await searchPlayers(searchQuery, {
        limit: 50,
        position: searchQuery ? "ALL" : slotPosition || "ALL"
      });
      setPlayers(data.players || []);
    } catch (err) {
      console.error(err);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPlayers(query);
  };

  const handleSelectPlayer = (player) => {
    if (onSelect) {
      onSelect(player);
    } else if (targetSlot) {
      updateStarter(targetSlot, player);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-pitch-900 border border-pitch-700 w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-pitch-800 bg-pitch-950">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-widest text-white uppercase">
              Club Player Selection
            </h2>
            {targetSlot && (
              <p className="text-pitch-400 text-sm mt-1">
                Selecting player for position: <span className="text-brand-400 font-bold">{targetSlot}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-pitch-800 bg-black/20 flex gap-4">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-pitch-950 text-white rounded-lg border border-pitch-800 focus:border-brand-500 transition-colors"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pitch-500 h-5 w-5" />
          </form>
          <button 
            onClick={handleSearch}
            className="btn-primary px-6 py-2.5 rounded-lg font-bold uppercase tracking-wider"
          >
            Search
          </button>
        </div>

        {/* Results Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
            </div>
          ) : players.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-pitch-500">
              <p className="text-xl font-display uppercase tracking-widest">No players found</p>
              <p className="text-sm mt-2">Try a different search term or load the Kaggle dataset.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {players.map((player) => (
                <div 
                  key={player._id} 
                  onClick={() => handleSelectPlayer(player)}
                  className="cursor-pointer transform hover:scale-105 hover:-translate-y-2 transition-all duration-300"
                >
                  <FutCard player={player} />
                  <div className="mt-3 text-center">
                    <p className="text-sm font-bold text-white truncate px-2">{player.name}</p>
                    <p className="text-xs text-pitch-400">{player.position}</p>
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
