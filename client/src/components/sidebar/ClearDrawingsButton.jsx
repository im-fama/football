import React from "react";
import { Trash2 } from "lucide-react";
import { useSquad } from "../../context/SquadContext";

export default function ClearDrawingsButton() {
  const { setDrawings } = useSquad();
  return (
    <button
      onClick={() => setDrawings([])}
      className="w-full py-2 bg-pitch-800 hover:bg-pulse-red/15 hover:text-pulse-red text-pitch-300 font-semibold rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors"
    >
      <Trash2 className="h-4 w-4" />
      Clear Drawings
    </button>
  );
}
