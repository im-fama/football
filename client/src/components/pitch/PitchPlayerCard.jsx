import { useRef, useState, useCallback } from "react";
import { useTactics } from "../../context/TacticsContext";
import FutCard from "../shared/FutCard";

export default function PitchPlayerCard({ player, pitchRef, onClickPlayer }) {
  const { state, actions } = useTactics();
  const cardRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragStart = useRef(null);
  const hasMoved = useRef(false);

  const getPitchCoords = useCallback(
    (clientX, clientY) => {
      if (!pitchRef?.current) return { x: player.pitchX, y: player.pitchY };
      const rect = pitchRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      return {
        x: Math.max(3, Math.min(97, x)),
        y: Math.max(3, Math.min(97, y)),
      };
    },
    [pitchRef, player.pitchX, player.pitchY]
  );

  // ── Mouse Drag & Click Handlers ──
  const handleMouseDown = useCallback(
    (e) => {
      if (state.drawingMode) return;
      e.stopPropagation();
      e.preventDefault();
      hasMoved.current = false;
      dragStart.current = { clientX: e.clientX, clientY: e.clientY };
      setIsDragging(true);

      const handleMouseMove = (me) => {
        const dx = Math.abs(me.clientX - dragStart.current.clientX);
        const dy = Math.abs(me.clientY - dragStart.current.clientY);
        if (dx > 4 || dy > 4) hasMoved.current = true;
        if (!hasMoved.current) return;
        const { x, y } = getPitchCoords(me.clientX, me.clientY);
        actions.movePitchPlayer(player.id, x, y);
      };

      const handleMouseUp = (me) => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        setIsDragging(false);

        if (!hasMoved.current) {
          // Clicked player card -> open 6-tab modal
          onClickPlayer(player);
          return;
        }

        // Check if dropped on another on-pitch player
        const els = document.elementsFromPoint(me.clientX, me.clientY);
        const target = els.find(
          (el) => el.dataset.playerid && el.dataset.playerid !== player.id
        );
        if (target) {
          actions.swapPitchPlayers(player.id, target.dataset.playerid);
        }
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [state.drawingMode, player, actions, getPitchCoords, onClickPlayer]
  );

  const handleDragEnter = () => setIsDragOver(true);
  const handleDragLeave = () => setIsDragOver(false);

  return (
    <div
      ref={cardRef}
      className={`pitch-player-card ${isDragging ? "dragging" : ""} ${isDragOver ? "drag-over" : ""}`}
      style={{
        left: `${player.pitchX}%`,
        top: `${player.pitchY}%`,
        transition: isDragging
          ? "none"
          : "left 0.35s cubic-bezier(0.4,0,0.2,1), top 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}
      data-playerid={player.id}
      onMouseDown={handleMouseDown}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <FutCard
        player={player}
        slotLabel={player.slotLabel}
        isMini={false}
        showStats={true}
      />
    </div>
  );
}
