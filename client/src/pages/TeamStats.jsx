import React, { useEffect, useState } from "react";
import { useSquad } from "../context/SquadContext";
import api from "../services/api";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Activity, Shield, Flame, Target } from "lucide-react";

export default function TeamStats() {
  const { selectedTeamId, selectedTeamName } = useSquad();
  const [leaderboards, setLeaderboards] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [passingNetwork, setPassingNetwork] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [shotMap, setShotMap] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load leaderboards & matches
  useEffect(() => {
    if (!selectedTeamId) return;

    setLoading(true);
    Promise.all([
      api.getLeaderboards(selectedTeamId),
      api.getTeamMatches(selectedTeamId)
    ])
      .then(([lbData, matchesData]) => {
        setLeaderboards(lbData);
        const matchL = matchesData.matches || [];
        setMatches(matchL);
        if (matchL.length) {
          setSelectedMatchId(matchL[0]._id);
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [selectedTeamId]);

  // Load match visualizer data
  useEffect(() => {
    if (!selectedMatchId) return;

    Promise.all([
      api.getPassingNetwork(selectedMatchId),
      api.getHeatmap(selectedMatchId),
      api.getShotMap(selectedMatchId)
    ])
      .then(([passData, heatData, shotData]) => {
        setPassingNetwork(passData.passMap || []);
        setHeatmapPoints(heatData.zones || []);
        setShotMap(shotData.shotMap || []);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [selectedMatchId]);

  // Fallback mocks if empty
  const defaultLeaderboards = leaderboards || {
    goals: [
      { name: "Erling Haaland", value: 32 },
      { name: "Bukayo Saka", value: 15 },
      { name: "Jude Bellingham", value: 12 }
    ],
    assists: [
      { name: "Sandro Tonali", value: 11 },
      { name: "Bukayo Saka", value: 10 },
      { name: "Kylian Mbappé", value: 8 }
    ],
    passAccuracy: [
      { name: "Sandro Tonali", value: 92 },
      { name: "Jude Bellingham", value: 89 },
      { name: "Piero Hincapié", value: 88 }
    ],
    tackles: [
      { name: "Takashi Mori", value: 4.2 },
      { name: "Piero Hincapié", value: 3.8 },
      { name: "Henrik Larsen", value: 3.1 }
    ]
  };

  const selectedMatch = matches.find(m => m._id === selectedMatchId);

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-thin max-w-7xl mx-auto w-full flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Team Analytics Dossier</h1>
        <p className="text-xs text-pitch-500 font-semibold tracking-wide uppercase mt-1">
          Performance metrics & visual analysis for {selectedTeamName || "squad"}
        </p>
      </div>

      {/* Match selector panel */}
      {matches.length > 0 && (
        <div className="bg-pitch-900/50 border border-pitch-700/60 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">
              Selected Match
            </span>
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="input-field bg-pitch-800 border-pitch-700 py-1.5 text-sm"
            >
              {matches.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.homeTeamId?.name} vs {m.awayTeamId?.name} ({m.homeScore} - {m.awayScore})
                </option>
              ))}
            </select>
          </div>

          {selectedMatch && (
            <div className="flex items-center gap-4 text-xs font-semibold text-pitch-400">
              <span>Date: {new Date(selectedMatch.date).toLocaleDateString()}</span>
              <span>Competition: Serie A Preset</span>
            </div>
          )}
        </div>
      )}

      {/* Visual coordinates maps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Passing Network */}
        <div className="bg-pitch-900/60 border border-pitch-700/60 p-4 rounded-xl flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3 self-start">
            <Activity className="h-4 w-4 text-brand-400" />
            <span className="font-display text-sm font-semibold text-white">Passing Network</span>
          </div>

          <div className="relative w-full aspect-[3/4] max-w-[280px] bg-pitch-950 rounded-lg overflow-hidden border border-pitch-800">
            {/* Pitch Marking */}
            <div className="absolute inset-0 border border-pitch-800/40 opacity-40 m-2 flex flex-col justify-between">
              <div className="h-[25%] border-b border-pitch-800/40" />
              <div className="h-[25%] border-b border-pitch-800/40 flex justify-center items-center">
                <div className="w-16 h-16 rounded-full border border-pitch-800/40" />
              </div>
              <div className="h-[25%] border-t border-pitch-800/40" />
            </div>

            {/* Plotting passes */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              {passingNetwork.map((p, idx) => (
                <line
                  key={idx}
                  x1={p.from.x}
                  y1={p.from.y}
                  x2={p.to.x}
                  y2={p.to.y}
                  stroke="#4ade80"
                  strokeWidth={Math.min(5, p.weight * 0.8)}
                  strokeLinecap="round"
                  opacity={0.65}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Defensive Heatmap */}
        <div className="bg-pitch-900/60 border border-pitch-700/60 p-4 rounded-xl flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3 self-start">
            <Flame className="h-4 w-4 text-pulse-red" />
            <span className="font-display text-sm font-semibold text-white">Defensive Heatmap</span>
          </div>

          <div className="relative w-full aspect-[3/4] max-w-[280px] bg-pitch-950 rounded-lg overflow-hidden border border-pitch-800">
            <div className="absolute inset-0 border border-pitch-800/40 opacity-40 m-2 flex flex-col justify-between" />
            {/* Glow spots */}
            {heatmapPoints.map((pt, idx) => (
              <div
                key={idx}
                className="absolute w-4 h-4 rounded-full bg-pulse-red/60 filter blur-sm -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${pt.x}%`,
                  top: `${pt.y}%`,
                  opacity: pt.intensity
                }}
              />
            ))}
          </div>
        </div>

        {/* Shot map */}
        <div className="bg-pitch-900/60 border border-pitch-700/60 p-4 rounded-xl flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3 self-start">
            <Target className="h-4 w-4 text-pulse-amber" />
            <span className="font-display text-sm font-semibold text-white">Shots Map</span>
          </div>

          <div className="relative w-full aspect-[3/4] max-w-[280px] bg-pitch-950 rounded-lg overflow-hidden border border-pitch-800">
            <div className="absolute inset-0 border border-pitch-800/40 opacity-40 m-2 flex flex-col justify-between" />
            {shotMap.map((s, idx) => (
              <div
                key={idx}
                className={`absolute w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center -translate-x-1/2 -translate-y-1/2 text-[8px] font-bold ${
                  s.goal ? "bg-pulse-green" : s.onTarget ? "bg-pulse-blue" : "bg-pulse-red"
                }`}
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`
                }}
                title={`Minute ${s.minute} ${s.goal ? "(Goal)" : s.onTarget ? "(On target)" : "(Off target)"}`}
              >
                ⚽
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Season Leaderboards Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Goals */}
        <div className="bg-pitch-900/60 border border-pitch-700/60 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-display text-sm font-semibold text-white">Top Goal Scorers</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={defaultLeaderboards.goals} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fill: "#8a97a6", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#111c17", borderColor: "#1a2921" }} />
                <Bar dataKey="value" fill="#4ade80" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Assists */}
        <div className="bg-pitch-900/60 border border-pitch-700/60 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-display text-sm font-semibold text-white">Top Playmakers (Assists)</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={defaultLeaderboards.assists} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fill: "#8a97a6", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#111c17", borderColor: "#1a2921" }} />
                <Bar dataKey="value" fill="#4f8ff7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
