import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import FutCard from "../FutCard";
import { useSquad } from "../../context/SquadContext";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function BenchRail({ onCardClick }) {
  const { bench } = useSquad();

  // Filter subs vs reserves vs staff
  const substitutes = bench.filter(
    (p) => p.position !== "MGR" && p.position !== "COACH"
  );
  const staff = bench.filter(
    (p) => p.position === "MGR" || p.position === "COACH"
  );

  const [benchOpen, setBenchOpen] = useState(true);

  return (
    <div className={`absolute bottom-0 w-full z-20 select-none pointer-events-none transition-transform duration-300 ${benchOpen ? 'translate-y-0' : 'translate-y-[85%]'}`}>
      <div className="w-full relative flex justify-end px-8">
        <button 
          onClick={() => setBenchOpen(!benchOpen)}
          className="absolute -top-7 right-8 bg-pitch-900/90 text-white px-4 py-1.5 rounded-t-xl border border-b-0 border-white/20 hover:bg-black transition-all pointer-events-auto shadow-lg flex items-center gap-1 text-xs font-semibold"
          title="Toggle Bench"
        >
          <span>Bench</span>
          {benchOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>
      
      <div className="w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-4 pb-4 px-4 pointer-events-auto">


      <Droppable droppableId="bench" direction="horizontal" type="player">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex items-center overflow-x-auto min-h-[180px] pb-4 pt-8 px-4 scrollbar-hide transition-colors ${
              snapshot.isDraggingOver ? "bg-white/5 border border-dashed border-white/20 rounded-xl" : ""
            }`}
          >
            {/* SUB Label */}
            {substitutes.length > 0 && (
              <div className="flex flex-col items-center mr-2 opacity-60">
                <span className="font-display text-xs tracking-widest -rotate-90 origin-bottom mb-8">SUB</span>
                <div className="w-[1px] h-12 bg-white/40"></div>
              </div>
            )}
            
            {bench.map((player, index) => {
              // Decide if we are crossing the boundary to MGR to show the divider
              const isFirstMgr = player.position === "MGR" && index === substitutes.length;
              
              return (
                <React.Fragment key={player._id}>
                  {isFirstMgr && (
                    <div className="flex flex-col items-center mx-4 opacity-60">
                      <span className="font-display text-xs tracking-widest -rotate-90 origin-bottom mb-8">MGR</span>
                      <div className="w-[1px] h-12 bg-white/40"></div>
                    </div>
                  )}
                  
                  <Draggable draggableId={player._id} index={index}>
                    {(dragProvided, dragSnapshot) => {
                      const child = (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          onClick={() => onCardClick(player)}
                          style={{
                            ...dragProvided.draggableProps.style,
                          }}
                          className={`flex-shrink-0 -ml-10 first:-ml-0 transition-all duration-200 hover:-translate-y-4 hover:ml-0 hover:mr-6 hover:z-30 relative ${
                            dragSnapshot.isDragging ? "scale-105 z-50" : "z-10"
                          }`}
                        >
                          <div className="transform scale-[0.6] origin-bottom hover:scale-[0.65] transition-transform w-[140px] h-[200px]">
                            <FutCard player={player} showStats={false} />
                          </div>
                        </div>
                      );

                      if (dragSnapshot.isDragging) {
                        return document.body ? createPortal(child, document.body) : child;
                      }

                      return child;
                    }}
                  </Draggable>
                </React.Fragment>
              );
            })}
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
    </div>
  );
}
