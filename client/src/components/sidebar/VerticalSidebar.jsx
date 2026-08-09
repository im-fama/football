import React, { useState, useEffect } from "react";
import { useSquad } from "../../context/SquadContext";
import { useAuth } from "../../context/AuthContext";
import { Edit2, Zap, Eraser, CirclePlus, Trash2, Camera, ChevronLeft, ChevronRight, Sparkles, FolderKanban, Play } from "lucide-react";
import { createBoard, getBoards, deleteBoard, getPlayer } from "../../services/api";
import TacticsSuggestionModal from "../pitch/TacticsSuggestionModal";
import AddColorModal from "../modal/AddColorModal";
import ConfirmModal from "../modal/ConfirmModal";

const DEFAULT_COLOR_PRESETS = ["#4ade80", "#ef5a5a", "#4f8ff7", "#f5b942", "#ffffff"];

export default function VerticalSidebar() {
  const {
    formation,
    setFormation,
    availableFormations,
    slots,
    drawingMode,
    setDrawingMode,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    penColor,
    laserColor,
    drawings,
    setDrawings,
    starters,
    setStarters,
    selectedTeamId,
    footballPosition,
    toggleFootball
  } = useSquad();
  const { user } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedBoards, setSavedBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [showTacticsModal, setShowTacticsModal] = useState(false);
  const [showAddColorModal, setShowAddColorModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState(null);
  const [colorPresets, setColorPresets] = useState(DEFAULT_COLOR_PRESETS);

  useEffect(() => {
    fetchBoards();
  }, [user]);

  const fetchBoards = async () => {
    if (!user) return;
    setLoadingBoards(true);
    try {
      const res = await getBoards();
      setSavedBoards(res.boards || []);
    } catch (err) {
      console.error("Failed to load tactical boards", err);
    } finally {
      setLoadingBoards(false);
    }
  };

  const toggleCollapsed = () => setCollapsed(!collapsed);

  const handleDrawingModeToggle = (mode) => {
    if (drawingMode === mode) {
      setDrawingMode(null);
    } else {
      setDrawingMode(mode);
    }
  };

  const handleFootballToggle = () => {
    if (drawingMode) setDrawingMode(null);
    toggleFootball();
  };

  const addColorPreset = (color) => {
    setStrokeColor(color);
    setColorPresets((prev) => (prev.includes(color) ? prev : [...prev, color]));
  };

  const handleClearDrawings = () => {
    if (drawings.length === 0) return;
    setConfirmModalConfig({
      isOpen: true,
      title: "Clear Drawings",
      message: "Are you sure you want to clear all telestrator drawings from the pitch?",
      confirmText: "Clear All",
      variant: "danger",
      onConfirm: () => {
        setDrawings([]);
        setConfirmModalConfig(null);
      }
    });
  };

  const handleSaveBoard = async () => {
    if (!user) {
      alert("Please login or sign in to save a tactical board snapshot!");
      return;
    }
    const name = boardName.trim() || `Tactic - ${formation} - ${new Date().toLocaleDateString()}`;
    setSaving(true);
    try {
      const lineupItems = Object.entries(starters)
        .filter(([, player]) => player)
        .map(([slot, player], index) => ({
          slotIndex: index,
          slotLabel: slot,
          playerId: player._id
        }));

      const customSlots =
        formation === "Custom" ? slots.map((s) => ({ code: s.code, x: s.x, y: s.y })) : undefined;

      await createBoard({
        title: name,
        formationName: formation,
        lineup: lineupItems,
        customSlots,
        drawings,
        notes: `Lineup snapshot for team ${selectedTeamId || "general"}`
      });
      alert(`Tactical board "${name}" saved successfully!`);
      setBoardName("");
      fetchBoards();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to save tactical board snapshot.");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadBoard = async (board) => {
    if (board.formationName) {
      setFormation(board.formationName);
    }
    setDrawings(Array.isArray(board.drawings) ? board.drawings : []);

    if (board.lineup?.length) {
      try {
        const players = await Promise.all(
          board.lineup
            .filter((item) => item.playerId)
            .map((item) =>
              getPlayer(item.playerId)
                .then((res) => ({ slot: item.slotLabel, player: res.player }))
                .catch(() => null)
            )
        );
        const restored = {};
        players.filter(Boolean).forEach(({ slot, player }) => {
          if (slot && player) restored[slot] = player;
        });
        if (Object.keys(restored).length) setStarters(restored);
      } catch (err) {
        console.error("Failed to restore saved lineup", err);
      }
    }
  };

  const handleDeleteSavedBoard = (id, title, e) => {
    e.stopPropagation();
    setConfirmModalConfig({
      isOpen: true,
      title: "Delete Board",
      message: `Are you sure you want to delete board "${title || 'Tactical Board'}"?`,
      confirmText: "Delete",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteBoard(id);
          setSavedBoards((prev) => prev.filter((b) => b._id !== id));
        } catch (err) {
          console.error("Failed to delete board", err);
        } finally {
          setConfirmModalConfig(null);
        }
      }
    });
  };

  if (collapsed) {
    return (
      <div className="absolute right-4 top-4 bottom-4 w-12 z-30 bg-pitch-900/90 backdrop-blur border border-pitch-700/60 rounded-xl flex flex-col items-center py-4 gap-4 shadow-card">
        <button onClick={toggleCollapsed} className="text-pitch-400 hover:text-white p-1">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="h-[1px] w-8 bg-pitch-800" />
        <button
          onClick={() => handleDrawingModeToggle("pen")}
          className={`relative p-2 rounded-lg ${drawingMode === "pen" ? "bg-pulse-amber/20 text-pulse-amber border border-pulse-amber/50" : "text-pitch-400 hover:text-white"}`}
          title="Pen Tool"
        >
          <Edit2
            className={`h-5 w-5 ${drawingMode === "pen" ? "animate-pulse" : ""}`}
            style={{
              color: penColor,
              filter: drawingMode === "pen" ? "drop-shadow(0 0 10px rgba(245,197,19,0.6))" : "none"
            }}
          />
        </button>
        <button
          onClick={() => handleDrawingModeToggle("laser")}
          className={`relative p-2 rounded-lg ${drawingMode === "laser" ? "bg-pulse-amber/20 text-pulse-amber border border-pulse-amber/50" : "text-pitch-400 hover:text-white"}`}
          title="Laser Pen"
        >
          <Zap className="h-5 w-5" style={{ color: laserColor }} />
        </button>
        <button
          onClick={() => handleDrawingModeToggle("eraser")}
          className={`p-2 rounded-lg ${drawingMode === "eraser" ? "bg-pulse-red/20 text-pulse-red border border-pulse-red/50" : "text-pitch-400 hover:text-white"}`}
          title="Eraser"
        >
          <Eraser className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute right-4 top-4 bottom-4 w-64 z-50 bg-pitch-900/90 backdrop-blur border border-pitch-700/60 rounded-xl flex flex-col p-4 gap-4 shadow-card select-none scrollbar-thin overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-semibold uppercase tracking-wider text-brand-300">
          Tactics Board
        </span>
        <button onClick={toggleCollapsed} className="text-pitch-400 hover:text-white p-1">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="h-[1px] w-full bg-pitch-800" />

      {/* Formation Select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">
          Formation
        </label>
        <select
          value={formation}
          onChange={(e) => setFormation(e.target.value)}
          className="input-field py-2 bg-pitch-850 text-white text-sm border-pitch-700"
        >
          {availableFormations.map((f) => (
            <option key={f} value={f} className="bg-pitch-900 text-white">
              {f}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowTacticsModal(true)}
          className="mt-2 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500/20 to-brand-600/20 text-brand-300 border border-brand-500/30 hover:bg-brand-500/30 py-2 rounded-lg text-sm font-semibold transition-all"
        >
          <Sparkles className="w-4 h-4" />
          AI Tactics
        </button>
      </div>

      <div className="h-[1px] w-full bg-pitch-800" />

      {/* Drawing Layer Controls */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">
          Tools
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => handleDrawingModeToggle("pen")}
            className={`relative w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
              drawingMode === "pen"
                ? "bg-pulse-amber/15 text-pulse-amber border-pulse-amber/50"
                : "bg-pitch-800 text-pitch-300 border-pitch-700 hover:text-white"
            }`}
            title="Pen"
          >
            <Edit2 className="h-5 w-5" style={{ color: penColor }} />
          </button>
          <button
            onClick={() => handleDrawingModeToggle("laser")}
            className={`relative w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
              drawingMode === "laser"
                ? "bg-pulse-amber/15 text-pulse-amber border-pulse-amber/50"
                : "bg-pitch-800 text-pitch-300 border-pitch-700 hover:text-white"
            }`}
            title="Laser"
          >
            <Zap className="h-5 w-5" style={{ color: laserColor }} />
          </button>
          <button
            onClick={() => handleDrawingModeToggle("eraser")}
            className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
              drawingMode === "eraser"
                ? "bg-pulse-red/15 text-pulse-red border-pulse-red/50"
                : "bg-pitch-800 text-pitch-300 border-pitch-700 hover:text-white"
            }`}
            title="Eraser"
          >
            <Eraser className="h-5 w-5" />
          </button>
          <button
            onClick={handleFootballToggle}
            className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
              footballPosition
                ? "bg-brand-500 text-pitch-950 border-brand-400"
                : "bg-pitch-800 text-pitch-300 border-pitch-700 hover:text-white"
            }`}
            title="Ball"
          >
            <img src="/football.png" alt="Ball" className="h-5 w-5" />
          </button>
        </div>

        {/* Color picker preset & Pen Size */}
        {drawingMode === "pen" || drawingMode === "laser" ? (
          <div className="relative flex flex-col gap-3 mt-2">
            <div className="w-full flex items-center gap-2.5 overflow-x-auto hide-scrollbar py-2 px-1">
              {colorPresets.map((color) => (
                <button
                  key={color}
                  onClick={() => addColorPreset(color)}
                  className={`flex-shrink-0 w-8 h-8 rounded-full border transition-all ${
                    strokeColor === color
                      ? "border-2 border-white ring-2 ring-white/40 scale-105 shadow-md"
                      : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select ${color}`}
                />
              ))}
              <button
                type="button"
                onClick={() => setShowAddColorModal(true)}
                className="flex-shrink-0 w-8 h-8 rounded-full border border-pitch-700 bg-pitch-850 flex items-center justify-center text-pitch-300 hover:bg-pitch-800 hover:text-white hover:border-brand-400 transition"
                title="Add colour"
              >
                <CirclePlus className="h-4 w-4" />
              </button>
            </div>

            {/* Pen Size selector */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-pitch-800/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">
                  Pen Size
                </span>
                <span className="text-[10px] font-mono font-bold text-brand-400">
                  {strokeWidth || 3}px
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[2, 4, 6, 8, 12].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setStrokeWidth(size)}
                    className={`flex-1 py-1 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                      (strokeWidth || 3) === size
                        ? "bg-brand-500/20 text-brand-300 border-brand-500/50"
                        : "bg-pitch-850 text-pitch-400 border-pitch-800 hover:text-white"
                    }`}
                    title={`Size ${size}px`}
                  >
                    <span
                      className="rounded-full bg-current"
                      style={{ width: Math.max(3, Math.min(10, size)), height: Math.max(3, Math.min(10, size)) }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Clear drawings */}
        <button
          onClick={handleClearDrawings}
          className="mt-2 w-full py-2 bg-pitch-800 hover:bg-pulse-red/15 hover:text-pulse-red text-pitch-300 font-semibold rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Clear Drawings
        </button>
      </div>

      <div className="h-[1px] w-full bg-pitch-800" />

      {/* Snapshot Save */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">
          Save Play / Snapshot
        </label>
        <input
          type="text"
          placeholder="Snapshot Name..."
          value={boardName}
          onChange={(e) => setBoardName(e.target.value)}
          className="input-field py-1.5 bg-pitch-950 text-xs border-pitch-800 focus:border-brand-500"
        />
        <button
          onClick={handleSaveBoard}
          disabled={saving}
          className="w-full btn-primary py-2 flex items-center justify-center gap-1.5 text-xs font-bold hover:brightness-110"
        >
          <Camera className="h-4 w-4" />
          {saving ? "Saving..." : "Save Tactical Board"}
        </button>
      </div>

      <div className="h-[1px] w-full bg-pitch-800" />

      {/* Saved Tactical Boards List below Save Button */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase font-bold text-brand-400 tracking-wider flex items-center gap-1">
            <FolderKanban className="w-3.5 h-3.5" /> Saved Boards ({savedBoards.length})
          </label>
        </div>

        {loadingBoards ? (
          <div className="text-[11px] text-pitch-500 py-2 text-center">Loading boards...</div>
        ) : savedBoards.length === 0 ? (
          <div className="text-[11px] text-pitch-500 py-2 text-center bg-pitch-950/50 rounded-lg border border-pitch-800">
            No saved boards. Type a name and click "Save Tactical Board" to create one.
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
            {savedBoards.map((board) => (
              <div
                key={board._id}
                onClick={() => handleLoadBoard(board)}
                className="bg-pitch-950 hover:bg-pitch-800 border border-pitch-800 hover:border-brand-500/50 p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all group"
              >
                <div className="flex flex-col truncate pr-2">
                  <span className="font-bold text-xs text-white truncate group-hover:text-brand-300">
                    {board.title}
                  </span>
                  <span className="text-[10px] text-pitch-400">
                    {board.formationName || "4-3-3"} • {new Date(board.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="p-1 text-brand-400 group-hover:scale-110 transition-transform">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </span>
                  <button
                    onClick={(e) => handleDeleteSavedBoard(board._id, board.title, e)}
                    className="p-1 text-pitch-500 hover:text-pulse-red transition-colors"
                    title="Delete board"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showTacticsModal && (
        <TacticsSuggestionModal onClose={() => setShowTacticsModal(false)} />
      )}

      <AddColorModal
        isOpen={showAddColorModal}
        onClose={() => setShowAddColorModal(false)}
        onAddColor={addColorPreset}
      />

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
  );
}

