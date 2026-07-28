import React from "react";
import { useSquad } from "../../context/SquadContext";

const PRESET_FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "5-3-2"];

export default function FormationSelect() {
  const { formation, setFormation } = useSquad();
  return (
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
  );
}
