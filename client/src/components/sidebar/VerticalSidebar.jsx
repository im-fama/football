import React, { useState } from "react";
import { useSquad } from "../../context/SquadContext";
import { useAuth } from "../../context/AuthContext";
import { Edit2, Zap, Palette, Trash2, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../services/api";

const PRESET_FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "5-3-2"];
const COLOR_PRESETS = ["#4ade80", "#ef5a5a", "#4f8ff7", "#f5b942", "#ffffff"];

export default function VerticalSidebar() {
  const {
    formation,
    setFormation,
    drawingMode,
    setDrawingMode,
    strokeColor,
    setStrokeColor,
    setDrawings,
    starters,
    selectedTeamId
  } = useSquad();
  const { user } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleCollapsed = () => setCollapsed(!collapsed);

  const handleDrawingModeToggle = (mode) => {
    if (drawingMode === mode) {
      setDrawingMode(null);
    } else {
      setDrawingMode(mode);
    }
  };

  const handleSaveBoard = async () => {
    if (!user) {
      alert("Please login to save a tactical board snapshot!");
      return;
    }
    const name = boardName.trim() || `Tactic - ${formation} - ${new Date().toLocaleDateString()}`;
    setSaving(true);
    try {
      const lineupItems = Object.entries(starters).map(([slot, player], index) => ({
        slotIndex: index,
        slotLabel: slot,
        playerId: player._id
      }));

      await api.createBoard({
        title: name,
        formationName: formation,
        lineup: lineupItems,
        notes: `Lineup snapshot for team ${selectedTeamId || "general"}`
      });
      alert(`Tactical board "${name}" saved successfully!`);
      setBoardName("");
    } catch (err) {
      console.error(err);
      alert("Failed to save tactical board snapshot.");
    } finally {
      setSaving(false);
    }
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
          className={`p-2 rounded-lg ${drawingMode === "pen" ? "bg-brand-500 text-pitch-950" : "text-pitch-400 hover:text-white"}`}
          title="Pen Tool"
        >
          <Edit2 className="h-5 w-5" />
        </button>
        <button
          onClick={() => handleDrawingModeToggle("laser")}
          className={`p-2 rounded-lg ${drawingMode === "laser" ? "bg-pulse-amber/20 text-pulse-amber border border-pulse-amber/50" : "text-pitch-400 hover:text-white"}`}
          title="Laser Pen"
        >
          <Zap className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute right-4 top-4 bottom-4 w-64 z-30 bg-pitch-900/90 backdrop-blur border border-pitch-700/60 rounded-xl flex flex-col p-4 gap-4 shadow-card select-none scrollbar-thin overflow-y-auto">
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
          className="input-field py-2 bg-pitch-850 text-sm"
        >
          {PRESET_FORMATIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="h-[1px] w-full bg-pitch-800" />

      {/* Drawing Layer Controls */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">
          Telestrator Tools
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => handleDrawingModeToggle("pen")}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold border transition-all ${
              drawingMode === "pen"
                ? "bg-brand-500 text-pitch-950 border-brand-400"
                : "bg-pitch-800 text-pitch-300 border-pitch-700 hover:text-white"
            }`}
          >
            <Edit2 className="h-4 w-4" />
            Pen
          </button>
          <button
            onClick={() => handleDrawingModeToggle("laser")}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold border transition-all ${
              drawingMode === "laser"
                ? "bg-pulse-amber/15 text-pulse-amber border-pulse-amber/50"
                : "bg-pitch-800 text-pitch-300 border-pitch-700 hover:text-white"
            }`}
          >
            <Zap className="h-4 w-4 animate-pulse" />
            Laser
          </button>
        </div>

        {/* Color picker preset */}
        {drawingMode && (
          <div className="flex flex-col gap-1.5 mt-2">
            <span className="text-[10px] font-semibold text-pitch-550">Brush Color</span>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => setStrokeColor(color)}
                  className={`w-6 h-6 rounded-full border transition-transform ${
                    strokeColor === color ? "scale-110 border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Clear drawings */}
        <button
          onClick={() => setDrawings([])}
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
    </div>
  );
}
