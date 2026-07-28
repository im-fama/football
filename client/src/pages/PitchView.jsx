import React, { useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { useSquad } from "../context/SquadContext";
import SquadLoader from "../components/pitch/SquadLoader";
import FormationGrid from "../components/pitch/FormationGrid";
import DrawingLayer from "../components/pitch/DrawingLayer";
import BenchRail from "../components/pitch/BenchRail";
import VerticalSidebar from "../components/sidebar/VerticalSidebar";
import PlayerModal from "../components/PlayerModal";

export default function PitchView() {
  const { substitute, swapStarters, removeStarter, selectedTeamName, selectedTeamBadge } = useSquad();
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const sourceId = source.droppableId;
    const destId = destination.droppableId;

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

  const handleCardClick = (player) => {
    setSelectedPlayer(player);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Search & Loader Bar */}
      <div className="p-4 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {selectedTeamBadge && (
              <img
                src={selectedTeamBadge}
                alt=""
                className="h-12 w-12 object-contain filter drop-shadow-md"
              />
            )}
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {selectedTeamName || "Squad Tactical Board"}
              </h1>
              <p className="text-xs text-pitch-500 font-medium">
                Live interactive line-up preparation & telestrator system
              </p>
            </div>
          </div>
          
          <div className="w-full md:w-auto md:max-w-md">
            <SquadLoader onSearchPlayerClick={handleCardClick} />
          </div>
        </div>
      </div>

      {/* Play Area */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 min-h-0 relative mx-auto w-full max-w-5xl px-4 pb-4 flex flex-col">
          <div className="flex-1 min-h-0 relative">
            <FormationGrid onCardClick={handleCardClick} />
            <DrawingLayer />
            <VerticalSidebar />
          </div>
          
          {/* Bench Rail */}
          <div className="mt-4 z-20">
            <BenchRail onCardClick={handleCardClick} />
          </div>
        </div>
      </DragDropContext>

      {/* Player Modal */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
