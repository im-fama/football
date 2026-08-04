import React from "react";
import { useSquad } from "../../context/SquadContext";



export default function FormationSelect() {
  const { formation, setFormation, availableFormations } = useSquad();
  return (
    <select
      value={formation}
      onChange={(e) => setFormation(e.target.value)}
      className="input-field py-2 bg-pitch-850 text-sm"
    >
      {availableFormations.map((f) => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </select>
  );
}
