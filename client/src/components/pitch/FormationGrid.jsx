import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import FutCard from "../FutCard";
import { useSquad } from "../../context/SquadContext";
import DrawingLayer from "./DrawingLayer";
import { Move } from "lucide-react";

export default function FormationGrid({ onCardClick, onEmptySlotClick }) {
  const { formation, slots, setSlots, starters, footballPosition, placeFootball } = useSquad();
  const boardRef = useRef(null);

  const handlePointerDown = (e, slotCode) => {
    if (formation !== "Custom") return;

    e.preventDefault();
    e.stopPropagation();

    const handlePointerMove = (moveEvent) => {
      setSlots(prev => prev.map(s => {
        if (s.code === slotCode) {
          return {
            ...s,
            // Adjust scaling factors as needed for the 3D perspective
            x: Math.max(0, Math.min(100, s.x - (moveEvent.movementX * 0.2))),
            y: Math.max(0, Math.min(100, s.y - (moveEvent.movementY * 0.2)))
          };
        }
        return s;
      }));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };



  const clampBallCoords = (x, y) => ({
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(84, y))
  });

  const handleFootballPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const handlePointerMove = (moveEvent) => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const x = 100 - ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = 84 - ((moveEvent.clientY - rect.top) / rect.height) * 100;
      placeFootball(clampBallCoords(x, y));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  return (
    <div ref={boardRef} className="relative w-full h-full min-h-[620px] rounded-2xl overflow-hidden border border-pitch-700/60 shadow-card bg-black/40" style={{ perspective: '1200px' }}>

      {/* Stadium Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
        style={{ backgroundImage: 'url(/stadium_bg.png)' }}
      />

      {/* 3D Pitch Container */}
      <div className="absolute inset-0 w-full h-full" style={{ transform: 'rotateX(30deg) scale(1.1)', transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}>

        {/* mowed-grass stripes */}
        <div
          className="absolute inset-0 opacity-[0.25] pointer-events-none"
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



        {/* Drawing Layer moved outside 3D container */}
        {/* Slots overlay */}
        {slots.map((slot) => {
          const player = starters[slot.code];
          const isOccupied = !!player;

          return (
            <div
              key={slot.code}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: `${100 - slot.x}%`,
                top: `${75 - slot.y}%`,
                transform: 'translate(-50%, -50%) rotateX(-30deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              <Droppable droppableId={`slot_${slot.code}`} type="player">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`w-[100px] h-[155px] flex flex-col items-center justify-center rounded-xl transition-all duration-200 ${snapshot.isDraggingOver
                        ? "bg-brand-500/10 border-2 border-dashed border-brand-400 scale-105 shadow-brandGlow"
                        : isOccupied
                          ? "border-transparent"
                          : "border border-dashed border-pitch-600 bg-pitch-900/30 hover:border-pitch-500"
                      }`}
                  >
                    {formation === "Custom" && (
                      <div
                        className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white rounded p-1 cursor-move pointer-events-auto z-50 hover:bg-black/90 transition-colors"
                        onPointerDown={(e) => handlePointerDown(e, slot.code)}
                      >
                        <Move size={14} />
                      </div>
                    )}
                    {player ? (
                      <Draggable draggableId={player._id} index={0}>
                        {(dragProvided, dragSnapshot) => {
                          const child = (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              onClick={(e) => onCardClick(player, slot.code, e)}
                              style={{
                                ...dragProvided.draggableProps.style,
                              }}
                              className={`pitch-player-card ${dragSnapshot.isDragging ? "dragging" : ""
                                }`}
                            >
                              <FutCard player={player} slotLabel={slot.code} />
                            </div>
                          );

                          // Escape the 3D transformed container while dragging to fix offset bugs
                          if (dragSnapshot.isDragging) {
                            return document.body ? createPortal(child, document.body) : child;
                          }

                          return child;
                        }}
                      </Draggable>
                    ) : (
                      <div
                        className="flex flex-col items-center text-center p-2 cursor-pointer"
                        onClick={() => onEmptySlotClick && onEmptySlotClick(slot.code)}
                      >
                        <div className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">
                          {slot.code}
                        </div>
                        <div className="text-[18px] mt-1 text-pitch-600 opacity-60 hover:opacity-100 hover:scale-125 transition-all">➕</div>
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}

      </div> {/* End 3D Pitch Container */}

      {footballPosition && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 z-40 cursor-grab"
          style={{
            left: `${100 - footballPosition.x}%`,
            top: `${84 - footballPosition.y}%`,
            transform: 'translate(-50%, -50%) rotateX(-30deg)',
            transformStyle: 'preserve-3d'
          }}
          onPointerDown={handleFootballPointerDown}
        >
          <img
            src="/football.png"
            alt="Football"
            className="w-12 h-12 select-none pointer-events-none"
          />
        </div>
      )}

      {/* 2D Overlay Drawing Layer (Moved here so mouse coordinates map perfectly 1:1) */}
      <DrawingLayer />
    </div>
  );
}
