import React from "react";
import { Edit2 } from "lucide-react";
import { useSquad } from "../../context/SquadContext";

export default function PenTool() {
  const { drawingMode, setDrawingMode } = useSquad();
  const isActive = drawingMode === "pen";

  const handleToggle = () => {
    setDrawingMode(isActive ? null : "pen");
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-lg flex items-center justify-center border transition-all ${
        isActive
          ? "bg-brand-500 text-pitch-950 border-brand-400"
          : "bg-pitch-800 text-pitch-450 border-pitch-700 hover:text-white"
      }`}
      title="Pen Tool"
    >
      <Edit2 className="h-5 w-5" />
    </button>
  );
}
