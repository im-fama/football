import React from "react";
import { Zap } from "lucide-react";
import { useSquad } from "../../context/SquadContext";

export default function LaserPenTool() {
  const { drawingMode, setDrawingMode } = useSquad();
  const isActive = drawingMode === "laser";

  const handleToggle = () => {
    setDrawingMode(isActive ? null : "laser");
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-lg flex items-center justify-center border transition-all ${
        isActive
          ? "bg-pulse-amber/15 text-pulse-amber border-pulse-amber/50"
          : "bg-pitch-800 text-pitch-450 border-pitch-700 hover:text-white"
      }`}
      title="Laser Pen Tool"
    >
      <Zap className="h-5 w-5" />
    </button>
  );
}
