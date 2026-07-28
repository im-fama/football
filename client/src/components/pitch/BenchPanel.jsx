import { useState, useRef } from "react";
import { useTactics } from "../../context/TacticsContext";
import FutCard from "../shared/FutCard";
import { ChevronDown, ChevronUp, UserPlus } from "lucide-react";

function BenchCardWrapper({ player, pitchRef, onClickPlayer }) {
  const { actions } = useTactics();
  const [dragging, setDragging] = useState(false);
  const dragData = useRef(null);

  const handleMouseDown = (e) => {
    if (player.role === "coach") {
      onClickPlayer(player);
      return;
    }
    e.preventDefault();
    dragData.current = { startX: e.clientX, startY: e.clientY };
    let moved = false;

    const handleMove = (me) => {
      const dx = Math.abs(me.clientX - dragData.current.startX);
      const dy = Math.abs(me.clientY - dragData.current.startY);
      if (dx > 5 || dy > 5) {
        moved = true;
        setDragging(true);
      }
    };

    const handleUp = (me) => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      setDragging(false);

      if (!moved) {
        // Open player modal on tap/click
        onClickPlayer(player);
        return;
      }

      // Check drop on pitch
      if (!pitchRef?.current) return;
      
      const els = document.elementsFromPoint(me.clientX, me.clientY);
      const targetPitchPlayer = els.find((el) => el.dataset.playerid && el.dataset.playerid !== player.id);

      if (targetPitchPlayer) {
        // Swap bench player with pitch player
        actions.swapBenchPitch(player.id, targetPitchPlayer.dataset.playerid);
        return;
      }

      const rect = pitchRef.current.getBoundingClientRect();
      if (
        me.clientX >= rect.left &&
        me.clientX <= rect.right &&
        me.clientY >= rect.top &&
        me.clientY <= rect.bottom
      ) {
        const x = ((me.clientX - rect.left) / rect.width) * 100;
        const y = ((me.clientY - rect.top) / rect.height) * 100;
        actions.benchToPitch(
          player.id,
          Math.max(3, Math.min(97, x)),
          Math.max(3, Math.min(97, y))
        );
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        cursor: "grab",
        opacity: dragging ? 0.5 : player.role === "injured" ? 0.65 : 1,
        transform: dragging ? "scale(1.05)" : "none",
        transition: "opacity 0.2s, transform 0.2s",
        flexShrink: 0,
      }}
      title={`${player.name} — Click for modal, drag to pitch`}
    >
      <FutCard player={player} slotLabel={player.slotLabel || player.position} isMini={true} showStats={false} />
    </div>
  );
}

export default function BenchPanel({ pitchRef, onClickPlayer }) {
  const { state } = useTactics();
  const [collapsed, setCollapsed] = useState(false);

  const substitutes = state.benchPlayers.filter(
    (p) => p.role === "bench" || (p.role === "starter" && !state.pitchPlayers.some(pp => pp.id === p.id))
  );
  const reserves = state.benchPlayers.filter(
    (p) => p.role === "injured" || (!p.role && !state.pitchPlayers.some(pp => pp.id === p.id))
  );
  const staff = state.benchPlayers.filter((p) => p.role === "coach");

  return (
    <div className={`bottom-bench-panel ${collapsed ? "collapsed" : ""}`}>
      {/* Drawer Top Header Bar with Arrow Toggle */}
      <div
        className="bottom-bench-header"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: "0.85rem",
              fontWeight: "700",
              color: "#f0d68a",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            SQUAD BENCH
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <span
              style={{
                padding: "1px 6px",
                borderRadius: 4,
                fontSize: "0.62rem",
                fontWeight: "700",
                background: "rgba(79,143,247,0.18)",
                color: "#4f8ff7",
              }}
            >
              SUB ({substitutes.length})
            </span>
            <span
              style={{
                padding: "1px 6px",
                borderRadius: 4,
                fontSize: "0.62rem",
                fontWeight: "700",
                background: "rgba(239,90,90,0.18)",
                color: "#ef5a5a",
              }}
            >
              RES ({reserves.length})
            </span>
            <span
              style={{
                padding: "1px 6px",
                borderRadius: 4,
                fontSize: "0.62rem",
                fontWeight: "700",
                background: "rgba(217,180,95,0.18)",
                color: "#d9b45f",
              }}
            >
              MGR ({staff.length})
            </span>
          </div>
        </div>

        {/* Center Drag Hint */}
        <div
          style={{
            fontSize: "0.68rem",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <UserPlus size={12} color="#3ddc84" />
          Drag players onto the pitch
        </div>

        {/* Right Arrow Button */}
        <button
          className="btn-icon"
          style={{
            height: 24,
            padding: "0 8px",
            width: "auto",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: "0.68rem",
            fontWeight: "700",
            color: "var(--text-secondary)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed((c) => !c);
          }}
        >
          <span>{collapsed ? "SHOW BENCH" : "HIDE BENCH"}</span>
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Bench Cards Horizontal Scroll Bar */}
      <div className="bottom-bench-body">
        {/* SUB Section */}
        {substitutes.length > 0 && (
          <div className="bench-section">
            <div className="bench-section-label">SUB</div>
            {substitutes.map((p) => (
              <BenchCardWrapper
                key={p.id}
                player={p}
                pitchRef={pitchRef}
                onClickPlayer={onClickPlayer}
              />
            ))}
          </div>
        )}

        {/* RES Section */}
        {reserves.length > 0 && (
          <div className="bench-section" style={{ paddingLeft: 8, borderLeft: "1px stroke var(--border-color)" }}>
            <div className="bench-section-label">RES</div>
            {reserves.map((p) => (
              <BenchCardWrapper
                key={p.id}
                player={p}
                pitchRef={pitchRef}
                onClickPlayer={onClickPlayer}
              />
            ))}
          </div>
        )}

        {/* MGR Section */}
        {staff.length > 0 && (
          <div className="bench-section" style={{ paddingLeft: 8, borderLeft: "1px stroke var(--border-color)" }}>
            <div className="bench-section-label">MGR</div>
            {staff.map((p) => (
              <BenchCardWrapper
                key={p.id}
                player={p}
                pitchRef={pitchRef}
                onClickPlayer={onClickPlayer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
