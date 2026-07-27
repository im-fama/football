import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { statBarColor } from "../utils/cardTier";

export default function StatBar({ stats = {} }) {
  const data = [
    { name: "Goals", value: stats.goals ?? 0, scaled: Math.min(99, (stats.goals ?? 0) * 4) },
    { name: "Assists", value: stats.assists ?? 0, scaled: Math.min(99, (stats.assists ?? 0) * 6) },
    { name: "Pass Acc%", value: stats.passAccuracy ?? 0, scaled: stats.passAccuracy ?? 0 },
    { name: "Tackles/90", value: stats.tacklesP90 ?? 0, scaled: Math.min(99, (stats.tacklesP90 ?? 0) * 20) },
    { name: "Duels Won%", value: stats.duelsWonPct ?? 0, scaled: stats.duelsWonPct ?? 0 },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <XAxis type="number" domain={[0, 99]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fill: "#8a97a6", fontSize: 12, fontFamily: "Inter" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
          contentStyle={{ background: "#131a22", border: "1px solid #26313d", borderRadius: 8, fontSize: 12 }}
          formatter={(_, __, item) => [item.payload.value, item.payload.name]}
        />
        <Bar dataKey="scaled" radius={[0, 6, 6, 0]} barSize={14}>
          {data.map((d, i) => (
            <Cell key={i} fill={statBarColor(d.scaled)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
