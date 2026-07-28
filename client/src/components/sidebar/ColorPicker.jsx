import React from "react";
import { useSquad } from "../../context/SquadContext";

const COLOR_PRESETS = ["#4ade80", "#ef5a5a", "#4f8ff7", "#f5b942", "#ffffff"];

export default function ColorPicker() {
  const { strokeColor, setStrokeColor } = useSquad();

  return (
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
  );
}
