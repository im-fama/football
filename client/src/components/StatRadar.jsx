import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

export default function StatRadar({ stats = {} }) {
  const data = [
    { attribute: "PAC", value: stats.pace ?? 0 },
    { attribute: "SHO", value: Math.min(99, (stats.goals ?? 0) * 3 + 40) },
    { attribute: "PAS", value: stats.passAccuracy ?? 0 },
    { attribute: "DRI", value: stats.dribbling ?? 0 },
    { attribute: "DEF", value: Math.min(99, (stats.tacklesP90 ?? 0) * 15 + (stats.interceptionsP90 ?? 0) * 15) },
    { attribute: "PHY", value: stats.physical ?? 0 },
  ];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="#26313d" />
        <PolarAngleAxis dataKey="attribute" tick={{ fill: "#8a97a6", fontSize: 12, fontFamily: "Oswald" }} />
        <PolarRadiusAxis domain={[0, 99]} tick={false} axisLine={false} />
        <Radar
          name="Attributes"
          dataKey="value"
          stroke="#4ade80"
          fill="#22c55e"
          fillOpacity={0.35}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
