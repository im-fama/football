import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import FutCard from "../FutCard";
import { useSquad } from "../../context/SquadContext";
import { UserPlus } from "lucide-react";

export default function BenchRail({ onCardClick }) {
  const { bench } = useSquad();

  // Filter subs vs reserves vs staff
  const substitutes = bench.filter(
    (p) => p.position !== "MGR" && p.position !== "COACH"
  );
  const staff = bench.filter(
    (p) => p.position === "MGR" || p.position === "COACH"
  );

  return (
    <div className="w-full bg-pitch-900/95 border-t border-pitch-700/60 p-4 shadow-card select-none">
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-4">
          <span className="font-display text-sm font-semibold uppercase tracking-wider text-brand-300">
            Squad Bench
          </span>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 rounded bg-pulse-blue/15 text-pulse-blue text-[10px] font-bold">
              SUB ({substitutes.length})
            </span>
            <span className="px-2 py-0.5 rounded bg-pulse-amber/15 text-pulse-amber text-[10px] font-bold">
              MGR ({staff.length})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-pitch-500 font-medium">
          <UserPlus className="h-3.5 w-3.5 text-brand-400 animate-pulse" />
          Drag players onto the field or swap them
        </div>
      </div>

      <Droppable droppableId="bench" direction="horizontal" type="player">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex items-center gap-4 overflow-x-auto min-h-[110px] py-1 px-2 scrollbar-thin rounded-xl transition-colors ${
              snapshot.isDraggingOver ? "bg-brand-500/5 border border-dashed border-brand-500/25" : ""
            }`}
          >
            {bench.map((player, index) => (
              <Draggable key={player._id} draggableId={player._id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    onClick={() => onCardClick(player)}
                    style={{
                      ...dragProvided.draggableProps.style,
                    }}
                    className={`flex-shrink-0 transition-transform ${
                      dragSnapshot.isDragging ? "scale-105" : "hover:-translate-y-1"
                    }`}
                  >
                    <FutCard player={player} isMini={true} showStats={false} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {bench.length === 0 && (
              <div className="w-full text-center py-6 text-sm text-pitch-500 font-medium">
                No players on the bench.
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
