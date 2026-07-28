import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import FutCard from "../FutCard";
import { useSquad } from "../../context/SquadContext";

export default function FormationGrid({ onCardClick }) {
  const { slots, starters } = useSquad();

  return (
    <div className="relative w-full h-full min-h-[620px] rounded-2xl overflow-hidden border border-pitch-700/60 bg-pitch-950 shadow-card">
      {/* mowed-grass stripes */}
      <div
        className="absolute inset-0 opacity-[0.16] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #1a2921 0px, #1a2921 90px, #16221b 90px, #16221b 180px)",
        }}
      />

      {/* radial floodlight glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,197,94,0.14), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(34,197,94,0.08), transparent 60%)",
        }}
      />

      {/* Pitch Lines SVG */}
      <svg
        className="absolute left-1/2 top-0 h-full w-[1200px] max-w-none -translate-x-1/2 opacity-[0.15] pointer-events-none"
        viewBox="0 0 1400 1600"
        preserveAspectRatio="xMidYMin slice"
        fill="none"
      >
        <rect x="20" y="20" width="1360" height="1560" rx="4" stroke="#7ee2a8" strokeWidth="3" />
        <line x1="20" y1="800" x2="1380" y2="800" stroke="#7ee2a8" strokeWidth="3" />
        <circle cx="700" cy="800" r="160" stroke="#7ee2a8" strokeWidth="3" />
        <circle cx="700" cy="800" r="5" fill="#7ee2a8" />
        {/* top penalty box */}
        <rect x="410" y="20" width="580" height="260" stroke="#7ee2a8" strokeWidth="3" />
        <rect x="550" y="20" width="300" height="100" stroke="#7ee2a8" strokeWidth="3" />
        <path d="M 550 280 A 160 160 0 0 0 850 280" stroke="#7ee2a8" strokeWidth="3" />
        {/* bottom penalty box */}
        <rect x="410" y="1320" width="580" height="260" stroke="#7ee2a8" strokeWidth="3" />
        <rect x="550" y="1480" width="300" height="100" stroke="#7ee2a8" strokeWidth="3" />
        <path d="M 550 1320 A 160 160 0 0 1 850 1320" stroke="#7ee2a8" strokeWidth="3" />
      </svg>

      {/* Slots overlay */}
      {slots.map((slot) => {
        const player = starters[slot.code];
        const isOccupied = !!player;

        return (
          <div
            key={slot.code}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          >
            <Droppable droppableId={`slot_${slot.code}`} type="player">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`w-[100px] h-[155px] flex flex-col items-center justify-center rounded-xl transition-all duration-200 ${
                    snapshot.isDraggingOver
                      ? "bg-brand-500/10 border-2 border-dashed border-brand-400 scale-105 shadow-brandGlow"
                      : isOccupied
                      ? "border-transparent"
                      : "border border-dashed border-pitch-600 bg-pitch-900/30 hover:border-pitch-500"
                  }`}
                >
                  {player ? (
                    <Draggable draggableId={player._id} index={0}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          onClick={() => onCardClick(player)}
                          style={{
                            ...dragProvided.draggableProps.style,
                          }}
                          className={`pitch-player-card ${
                            dragSnapshot.isDragging ? "dragging" : ""
                          }`}
                        >
                          <FutCard player={player} slotLabel={slot.code} />
                        </div>
                      )}
                    </Draggable>
                  ) : (
                    <div className="flex flex-col items-center text-center p-2 pointer-events-none">
                      <div className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">
                        {slot.code}
                      </div>
                      <div className="text-[18px] mt-1 text-pitch-600 opacity-60">➕</div>
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        );
      })}
    </div>
  );
}
