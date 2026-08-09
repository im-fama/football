import React, { useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { useSquad } from "../context/SquadContext";
import SquadLoader from "../components/pitch/SquadLoader";
import FormationGrid from "../components/pitch/FormationGrid";
import BenchRail from "../components/pitch/BenchRail";
import VerticalSidebar from "../components/sidebar/VerticalSidebar";
import PlayerModal from "../components/PlayerModal";
import PlayerSearchModal from "../components/modal/PlayerSearchModal";
import PlayerContextMenu from "../components/pitch/PlayerContextMenu";
import PlayerImagePickerModal from "../components/modal/PlayerImagePickerModal";
import ConfirmModal from "../components/modal/ConfirmModal";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PitchView() {
  const {
    substitute,
    swapStarters,
    removeStarter,
    selectedTeamName,
    selectedTeamBadge,
    starters,
    setStarters,
    setBench,
    searchResults,
    error
  } = useSquad();

  // Chemistry & Rating Calculations
  const playersArray = Object.values(starters).filter(Boolean);
  
  let teamRating = 0;
  if (playersArray.length > 0) {
    teamRating = Math.round(
      playersArray.reduce((acc, p) => acc + (p.computedRating ?? p.overallRating ?? 75), 0) /
        playersArray.length
    );
  }

  let totalChemistry = 0;
  const leagueCounts = {};
  const nationCounts = {};
  const clubCounts = {};

  playersArray.forEach((p) => {
    if (p.league) leagueCounts[p.league] = (leagueCounts[p.league] || 0) + 1;
    if (p.nationality) nationCounts[p.nationality] = (nationCounts[p.nationality] || 0) + 1;
    if (p.teamId) clubCounts[p.teamId] = (clubCounts[p.teamId] || 0) + 1;
  });

  playersArray.forEach((p) => {
    let playerChem = 0;
    if (clubCounts[p.teamId] >= 7) playerChem += 3;
    else if (clubCounts[p.teamId] >= 4) playerChem += 2;
    else if (clubCounts[p.teamId] >= 2) playerChem += 1;

    if (leagueCounts[p.league] >= 8) playerChem += 3;
    else if (leagueCounts[p.league] >= 5) playerChem += 2;
    else if (leagueCounts[p.league] >= 3) playerChem += 1;

    if (nationCounts[p.nationality] >= 8) playerChem += 3;
    else if (nationCounts[p.nationality] >= 5) playerChem += 2;
    else if (nationCounts[p.nationality] >= 2) playerChem += 1;

    totalChemistry += Math.min(3, playerChem);
  });

  const topLeagues = Object.entries(leagueCounts).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const topNations = Object.entries(nationCounts).sort((a, b) => b[1] - a[1]).slice(0, 2);

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [searchSlot, setSearchSlot] = useState(null);
  const [photoTargetPlayer, setPhotoTargetPlayer] = useState(null);
  const [confirmModalConfig, setConfirmModalConfig] = useState(null);
  
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    // Search Result -> Pitch Slot or Bench
    if (sourceId === "searchResults") {
      const draggedPlayer = searchResults.find(p => `search_${p._id}` === draggableId);
      if (!draggedPlayer) return;

      if (destId.startsWith("slot_")) {
        const slotCode = destId.replace("slot_", "");
        setStarters(prev => ({ ...prev, [slotCode]: draggedPlayer }));
      } else if (destId === "bench") {
        setBench(prev => [...prev, draggedPlayer]);
      }
      return;
    }

    // Bench -> Pitch Slot
    if (sourceId === "bench" && destId.startsWith("slot_")) {
      const slotCode = destId.replace("slot_", "");
      substitute(draggableId, slotCode);
    }
    // Pitch Slot A -> Pitch Slot B
    else if (sourceId.startsWith("slot_") && destId.startsWith("slot_")) {
      const slotCodeA = sourceId.replace("slot_", "");
      const slotCodeB = destId.replace("slot_", "");
      swapStarters(slotCodeA, slotCodeB);
    }
    // Pitch Slot -> Bench
    else if (sourceId.startsWith("slot_") && destId === "bench") {
      const slotCode = sourceId.replace("slot_", "");
      removeStarter(slotCode);
    }
  };

  const handleCardClick = (player, slotCode, e) => {
    // If e is not provided (e.g. from BenchRail), fallback to normal modal
    if (!e || !slotCode) {
      setSelectedPlayer(player);
      return;
    }
    
    e.stopPropagation();
    setContextMenu({
      player,
      slotCode,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleContextMenuAction = (action) => {
    if (!contextMenu) return;
    const { player, slotCode } = contextMenu;

    if (action === 'stats') {
      setSelectedPlayer(player);
    } else if (action === 'photo') {
      setPhotoTargetPlayer({ player, slotCode });
    } else if (action === 'remove') {
      setConfirmModalConfig({
        isOpen: true,
        title: "Remove Starter",
        message: `Are you sure you want to remove ${player.name || 'this player'} from ${slotCode}?`,
        confirmText: "Remove",
        variant: "danger",
        onConfirm: () => {
          removeStarter(slotCode);
          setConfirmModalConfig(null);
        }
      });
    } else if (action === 'swap') {
      alert("Drag and drop a player to swap positions!");
    }
  };

  const handleSelectPlayerImage = (selectedImagePlayer) => {
    if (!photoTargetPlayer) return;
    const newThumbnail = selectedImagePlayer.thumbnail || selectedImagePlayer.photoUrl;
    if (!newThumbnail) return;

    setConfirmModalConfig({
      isOpen: true,
      title: "Update Player Image",
      message: `Are you sure you want to update ${photoTargetPlayer.player.name}'s picture?`,
      confirmText: "Update Picture",
      variant: "info",
      onConfirm: () => {
        setStarters((prev) => ({
          ...prev,
          [photoTargetPlayer.slotCode]: {
            ...prev[photoTargetPlayer.slotCode],
            thumbnail: newThumbnail,
            photoUrl: newThumbnail
          }
        }));
        setPhotoTargetPlayer(null);
        setConfirmModalConfig(null);
      }
    });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex-1 flex flex-col overflow-hidden relative bg-black">
        {/* Global Stadium Background for the entire view */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 pointer-events-none"
        style={{ backgroundImage: 'url(/stadium_bg.png)' }}
      />
      
      {/* Left Sidebar Toggle */}
      <button 
        onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
        className="absolute top-8 left-0 z-40 bg-black/60 text-white p-2 rounded-r-lg border border-l-0 border-white/20 hover:bg-black/90 transition-all pointer-events-auto shadow-lg"
        title="Toggle Left Sidebar"
      >
        {leftSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* FC26 Left HUD overlay */}
      <div className={`absolute top-8 left-12 z-30 w-64 pointer-events-none transition-transform duration-300 ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-[150%]'}`}>
        <div className="flex items-start gap-4 mb-8">
          {selectedTeamBadge && (
            <img 
              src={selectedTeamBadge} 
              alt="" 
              className="h-16 w-16 object-contain filter drop-shadow-md" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <div className="flex flex-col text-white shadow-text">
            <h1 className="font-display text-2xl font-bold tracking-wide uppercase leading-tight">
              {selectedTeamName || "Squad Builder"}
            </h1>
            <div className="flex text-gold-500 text-sm mt-0.5">
              ★★★★★
            </div>
            <div className="font-display text-xs tracking-widest mt-1 opacity-80">
              RATING <span className="font-bold text-lg ml-2">{teamRating || '--'}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-4 w-full pointer-events-auto">
          <div className="flex justify-between items-center border-b border-white/20 pb-2 mb-3">
            <span className="font-display text-xs tracking-widest text-white/80">TOTAL CHEMISTRY</span>
            <span className="font-display font-bold text-lg">{totalChemistry}/33</span>
          </div>
          <div className="space-y-3 opacity-80">
            {topLeagues.map(league => (
              <div key={league[0]} className="flex justify-between items-center">
                <span className="text-xs truncate max-w-[140px]">{league[0]}</span>
                <span className="text-brand-400 font-bold text-[10px]">
                  {'★'.repeat(Math.min(3, Math.floor(league[1] / 2) || 1))}
                </span>
              </div>
            ))}
            {topNations.map(nation => (
              <div key={nation[0]} className="flex justify-between items-center">
                <span className="text-xs truncate max-w-[140px]">{nation[0]}</span>
                <span className="text-brand-400 font-bold text-[10px]">
                  {'★'.repeat(Math.min(3, Math.floor(nation[1] / 2) || 1))}
                </span>
              </div>
            ))}
            {topLeagues.length === 0 && topNations.length === 0 && (
              <div className="text-xs text-center opacity-50">Add players to build chemistry</div>
            )}
          </div>
        </div>

        <div className="mt-8 pointer-events-auto">
          <SquadLoader onSearchPlayerClick={handleCardClick} />
        </div>
      </div>

      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-pulse-red/15 border border-pulse-red/40 text-pulse-red text-xs font-semibold px-4 py-2 rounded-lg backdrop-blur">
          {error}
        </div>
      )}

      {/* Play Area */}
      <div className="flex-1 min-h-0 relative w-full h-full">
        <div className="absolute inset-0">
          <FormationGrid onCardClick={handleCardClick} onEmptySlotClick={setSearchSlot} />
        </div>
        
        <VerticalSidebar />
        
        {/* Bench Rail floated at bottom */}
        <BenchRail onCardClick={handleCardClick} />
      </div>
      
      
      <PlayerModal
        player={selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />

      {searchSlot && (
        <PlayerSearchModal 
          targetSlot={searchSlot} 
          onClose={() => setSearchSlot(null)} 
        />
      )}

      {contextMenu && (
        <PlayerContextMenu
          player={contextMenu.player}
          slotCode={contextMenu.slotCode}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onAction={handleContextMenuAction}
        />
      )}

      {photoTargetPlayer && (
        <PlayerImagePickerModal
          onSelectPlayerImage={handleSelectPlayerImage}
          onClose={() => setPhotoTargetPlayer(null)}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmModalConfig}
        title={confirmModalConfig?.title}
        message={confirmModalConfig?.message}
        confirmText={confirmModalConfig?.confirmText}
        cancelText="Cancel"
        variant={confirmModalConfig?.variant || "danger"}
        onConfirm={confirmModalConfig?.onConfirm}
        onCancel={() => setConfirmModalConfig(null)}
      />
    </div>
    </DragDropContext>
  );
}
