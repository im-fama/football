import React, { useState } from "react";
import { useSquad } from "../../context/SquadContext";
import { Search, Loader2 } from "lucide-react";
import { searchPlayers } from "../../services/api";
import { Droppable, Draggable } from "@hello-pangea/dnd";

export default function SquadLoader({ onSearchPlayerClick }) {
  const {
    leagues,
    teams,
    selectedLeague,
    setSelectedLeague,
    selectedTeamId,
    setSelectedTeamId,
    setSelectedTeamName,
    setSelectedTeamBadge,
    loadSquad,
    loading,
    searchResults,
    setSearchResults,
    isSearching,
    setIsSearching
  } = useSquad();

  const [searchQuery, setSearchQuery] = useState("");

  const handleLeagueChange = (e) => {
    setSelectedLeague(e.target.value);
  };

  const handleTeamChange = (e) => {
    const id = e.target.value;
    setSelectedTeamId(id);
    const selectedTeam = teams.find((t) => String(t.idTeam || t.sourceId || t._id) === String(id));
    if (selectedTeam) {
      setSelectedTeamName(selectedTeam.strTeam || selectedTeam.name || "");
      setSelectedTeamBadge(selectedTeam.strTeamBadge || selectedTeam.badgeUrl || "");
    }
  };

  const handleLoadSquad = () => {
    if (selectedTeamId) {
      loadSquad(selectedTeamId);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery || searchQuery.trim().length < 2) return;
    setIsSearching(true);
    try {
      const data = await searchPlayers(searchQuery.trim());
      setSearchResults(data.players || []);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-pitch-900/80 backdrop-blur border border-pitch-700/60 p-4 rounded-xl shadow-card">
      <div className="flex flex-wrap items-center gap-4">
        {/* League selector */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">
            League
          </label>
          <select
            value={selectedLeague}
            onChange={handleLeagueChange}
            className="input-field py-2 text-sm bg-pitch-800 text-white border-pitch-700"
          >
            <option value="" className="bg-pitch-900 text-white">Select League</option>
            {leagues.map((l) => (
              <option key={l.sourceId || l._id} value={l.name || l.strLeague} className="bg-pitch-900 text-white">
                {l.name || l.strLeague}
              </option>
            ))}
          </select>
        </div>

        {/* Team selector */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">
            Club / Squad
          </label>
          <select
            value={selectedTeamId}
            onChange={handleTeamChange}
            disabled={!teams.length}
            className="input-field py-2 text-sm bg-pitch-800 text-white border-pitch-700 disabled:opacity-50"
          >
            <option value="" className="bg-pitch-900 text-white">Select Team</option>
            {teams.map((t) => {
              const id = t.idTeam || t.sourceId || t._id;
              const name = t.strTeam || t.name;
              return (
                <option key={id} value={id} className="bg-pitch-900 text-white">
                  {name}
                </option>
              );
            })}
          </select>
        </div>

        {/* Action Button */}
        <div className="flex items-end h-[58px]">
          <button
            onClick={handleLoadSquad}
            disabled={loading || !selectedTeamId}
            className="btn-primary py-2.5 px-6 flex items-center gap-2 hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Load Squad"
            )}
          </button>
        </div>
      </div>

      {/* Free Text Scout Search */}
      <form onSubmit={handleSearch} className="relative flex items-center border-t border-pitch-800 pt-3">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Scout a player by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 pr-4 py-2 bg-pitch-950 text-sm border-pitch-800 focus:border-brand-500"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pitch-500" />
        </div>
        <button
          type="submit"
          className="ml-2 btn-secondary py-2 px-4 text-sm"
        >
          {isSearching ? "..." : "Search"}
        </button>
      </form>

      {/* Search results popup */}
      {searchResults.length > 0 && (
        <div className="absolute top-[165px] left-4 right-4 z-40 bg-pitch-950 border border-pitch-700/60 p-3 rounded-lg shadow-2xl max-h-[300px] flex flex-col">
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-pitch-800">
            <span className="text-xs font-semibold text-pitch-400">Search Results</span>
            <button
              onClick={() => setSearchResults([])}
              className="text-xs text-pulse-red hover:underline"
            >
              Clear
            </button>
          </div>
          <Droppable droppableId="searchResults" isDropDisabled={true}>
            {(provided) => (
              <div 
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col gap-2 overflow-y-auto pr-1"
              >
                {searchResults.map((player, index) => (
                  <Draggable key={player._id} draggableId={`search_${player._id}`} index={index}>
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        onClick={() => {
                          onSearchPlayerClick(player);
                          setSearchResults([]);
                        }}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                          dragSnapshot.isDragging ? "bg-pitch-800 shadow-xl z-50 border border-brand-500/50" : "bg-pitch-900/50 hover:bg-pitch-800/60"
                        }`}
                        style={{
                          ...dragProvided.draggableProps.style,
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-pitch-800 flex items-center justify-center font-bold text-xs text-brand-400 border border-pitch-700 overflow-hidden shrink-0">
                          {player.thumbnail ? (
                            <img src={player.thumbnail} alt="" className="object-cover w-full h-full" />
                          ) : (
                            player.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{player.name}</div>
                          <div className="text-xs text-pitch-500 truncate">
                            {player.position} · {player.team} · OVR {player.overallRating || 65}
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      )}
    </div>
  );
}
