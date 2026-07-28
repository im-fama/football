import { useRef, useState } from "react";
import { useTactics } from "../context/TacticsContext";
import Pitch from "../components/pitch/Pitch";
import PitchPlayerCard from "../components/pitch/PitchPlayerCard";
import BenchPanel from "../components/pitch/BenchPanel";
import VerticalSidebar from "../components/pitch/VerticalSidebar";
import DrawingLayer from "../components/pitch/DrawingLayer";
import Ball from "../components/pitch/Ball";
import RadialPlayerMenu from "../components/modal/RadialPlayerMenu";
import PlayerModal from "../components/modal/PlayerModal";
import { INITIAL_TACTICS } from "../data/mockData";

let tacticIdCounter = INITIAL_TACTICS.length + 1;

export default function MatchPrepBoard() {
  const { state, actions } = useTactics();
  const pitchRef = useRef(null);

  // Radial Wheel Menu state
  const [radialPlayer, setRadialPlayer] = useState(null);
  // Full Player Modal state
  const [modalPlayer, setModalPlayer] = useState(null);
  const [initialModalTab, setInitialModalTab] = useState("overview");

  const handleSaveTactic = ({ name }) => {
    tacticIdCounter++;
    actions.saveTactic({
      id: `t${tacticIdCounter}`,
      name,
      formation: state.formation,
      description: `Saved on ${new Date().toLocaleDateString()}`,
      color: "#3ddc84",
      createdAt: new Date().toISOString().slice(0, 10),
      slots: Object.fromEntries(
        state.pitchPlayers.map((p, i) => [i, p.id])
      ),
    });
  };

  // Clicking a player card opens the EA SPORTS FC Radial Menu
  const handlePlayerClick = (player) => {
    setRadialPlayer(player);
  };

  // Radial menu slice click opens the full 6-tab PlayerModal pre-focused on that tab
  const handleSelectRadialOption = (tabId) => {
    if (radialPlayer) {
      setModalPlayer(radialPlayer);
      setInitialModalTab(tabId);
      setRadialPlayer(null);
    }
  };

  const handleSubstitute = (playerId) => {
    actions.pitchToBench(playerId);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", position: "relative" }}>
      {/* Main Pitch Area */}
      <div
        ref={pitchRef}
        style={{ flex: 1, position: "relative", overflow: "hidden", height: "100%" }}
      >
        <Pitch flipped={state.flipped}>
          {/* Drawing layer */}
          <DrawingLayer containerRef={pitchRef} />

          <Ball pitchRef={pitchRef} />

          {/* Draggable EA Sports FC style FUT Player Cards on Pitch */}
          {state.pitchPlayers.map((player) => (
            <PitchPlayerCard
              key={player.id}
              player={player}
              pitchRef={pitchRef}
              onClickPlayer={handlePlayerClick}
            />
          ))}
        </Pitch>

        <VerticalSidebar onSaveTactic={(tactic) => actions.saveTactic({ ...tactic, id: Date.now().toString(), formation: state.formation })} />

        {/* Drawing Mode Banner */}
        {state.drawingMode && (
          <div
            style={{
              position: "absolute",
              bottom: 140,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(8px)",
              padding: "0.4rem 1rem",
              borderRadius: 999,
              fontSize: "0.72rem",
              fontWeight: "600",
              color: "#f5b942",
              border: "1px solid rgba(245,185,66,0.3)",
              pointerEvents: "none",
              zIndex: 35,
            }}
          >
            ✏️ Drawing mode: {state.drawingMode} — click and drag on pitch to draw
          </div>
        )}

        {/* Empty Pitch Hint */}
        {state.pitchPlayers.length === 0 && (
          <div
            style={{
              position: "absolute",
              top: "45%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>⚽</div>
            <p
              style={{
                fontSize: "0.9rem",
                color: "rgba(255,255,255,0.6)",
                fontFamily: "'Oswald', sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              Drag players from the bottom bench panel onto the pitch
            </p>
          </div>
        )}

        {/* Bottom Bench Panel Drawer overlaying pitch */}
        <BenchPanel pitchRef={pitchRef} onClickPlayer={handlePlayerClick} />
      </div>

      {/* EA SPORTS FC 360° Circular Radial Wheel Action Menu */}
      {radialPlayer && (
        <RadialPlayerMenu
          player={radialPlayer}
          onClose={() => setRadialPlayer(null)}
          onSelectOption={handleSelectRadialOption}
          onSubstitute={handleSubstitute}
        />
      )}

      {/* Full 6-Tab Analytical Dossier Player Modal */}
      {modalPlayer && (
        <PlayerModal
          player={modalPlayer}
          defaultTab={initialModalTab}
          onClose={() => setModalPlayer(null)}
        />
      )}
    </div>
  );
}
