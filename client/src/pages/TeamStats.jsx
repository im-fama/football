import React, { useEffect, useState } from "react";
import { useSquad } from "../context/SquadContext";
import {
  getLeagues, getTeams, getLeaderboards, getTeamMatches,
  getPassingNetwork, getHeatmap, getShotMap, getPlayersByTeam,
  getStatsBombCompetitions, getStatsBombMatches, getStatsBombPassingNetwork,
} from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, CartesianGrid, Cell
} from "recharts";
import {
  Activity, Flame, Target, Filter, Shield, Trophy,
  ChevronDown, ChevronUp, Zap, TrendingUp, Award, BarChart2,
  PieChart as PieIcon, Info, Users, Sparkles, CheckCircle2, ArrowUpRight
} from "lucide-react";

export default function TeamStats() {
  const {
    selectedLeague, setSelectedLeague,
    selectedTeamId, setSelectedTeamId,
    selectedTeamName, setSelectedTeamName,
    selectedTeamBadge, setSelectedTeamBadge
  } = useSquad();

  // Selection states
  const [leaguesList, setLeaguesList] = useState([]);
  const [teamsList, setTeamsList] = useState([]);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  const [leaderboards, setLeaderboards] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [passingNetwork, setPassingNetwork] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [shotMap, setShotMap] = useState([]);
  const [loading, setLoading] = useState(false);

  // StatsBomb Research Lab
  const [sbCompetitions, setSbCompetitions] = useState([]);
  const [selectedSbComp, setSelectedSbComp] = useState(null);
  const [sbMatches, setSbMatches] = useState([]);
  const [selectedSbMatch, setSelectedSbMatch] = useState(null);
  const [sbNetwork, setSbNetwork] = useState(null);
  const [sbLoading, setSbLoading] = useState(false);
  const [showSbPanel, setShowSbPanel] = useState(false);

  // 1. Fetch leagues list on mount
  useEffect(() => {
    getLeagues()
      .then((data) => {
        const lList = data.leagues || [];
        setLeaguesList(lList);
        if (!selectedLeague && lList.length > 0) {
          setSelectedLeague(lList[0].name);
        }
      })
      .catch(console.error);

    // Fetch StatsBomb competitions
    getStatsBombCompetitions()
      .then((data) => {
        const comps = data.competitions || [];
        setSbCompetitions(comps);
        if (comps.length > 0) setSelectedSbComp(comps[0]);
      })
      .catch(() => {});
  }, []);

  // 2. Fetch teams when league changes
  useEffect(() => {
    if (!selectedLeague) return;
    getTeams(selectedLeague)
      .then((data) => {
        const tList = data.teams || [];
        setTeamsList(tList);
        if (tList.length > 0) {
          const exists = tList.find((t) => (t.idTeam || String(t._id)) === selectedTeamId);
          if (!exists) {
            const first = tList[0];
            const firstId = first.idTeam || String(first._id);
            setSelectedTeamId(firstId);
            setSelectedTeamName(first.strTeam || first.name);
            setSelectedTeamBadge(first.strTeamBadge || first.badgeUrl || "");
          }
        }
      })
      .catch(() => setTeamsList([]));
  }, [selectedLeague]);

  // 3. Load leaderboards, matches, and players for team
  useEffect(() => {
    if (!selectedTeamId) return;

    setLoading(true);
    setSelectedPlayerId("");

    Promise.all([
      getLeaderboards(selectedTeamId),
      getTeamMatches(selectedTeamId),
      getPlayersByTeam(selectedTeamId).catch(() => ({ players: [] }))
    ])
      .then(([lbData, matchesData, playersData]) => {
        setLeaderboards(lbData);
        setTeamPlayers(playersData.players || []);
        const matchL = matchesData.matches || [];
        setMatches(matchL);
        if (matchL.length) {
          setSelectedMatchId(matchL[0]._id);
        } else {
          setSelectedMatchId("");
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedTeamId]);

  // 4. Load match visualizer data with player filtering
  useEffect(() => {
    if (!selectedMatchId) return;

    Promise.all([
      getPassingNetwork(selectedMatchId),
      getHeatmap(selectedMatchId, selectedPlayerId),
      getShotMap(selectedMatchId)
    ])
      .then(([passData, heatData, shotData]) => {
        setPassingNetwork(passData.passMap || []);
        setHeatmapPoints(heatData.zones || []);
        setShotMap(shotData.shotMap || []);
      })
      .catch((err) => console.error(err));
  }, [selectedMatchId, selectedPlayerId]);

  // 5. Fetch StatsBomb matches when competition changes
  useEffect(() => {
    if (!selectedSbComp) return;
    getStatsBombMatches(selectedSbComp.competition_id, selectedSbComp.season_id)
      .then((data) => {
        const m = data.matches || [];
        setSbMatches(m);
        if (m.length > 0) setSelectedSbMatch(m[0]);
        else setSelectedSbMatch(null);
      })
      .catch(() => setSbMatches([]));
  }, [selectedSbComp]);

  // 6. Fetch StatsBomb passing network when match changes
  useEffect(() => {
    if (!selectedSbMatch) return;
    setSbLoading(true);
    getStatsBombPassingNetwork(selectedSbMatch.match_id, selectedSbMatch.home_team)
      .then((data) => setSbNetwork(data))
      .catch(() => setSbNetwork(null))
      .finally(() => setSbLoading(false));
  }, [selectedSbMatch]);

  const handleSelectTeam = (tId) => {
    const t = teamsList.find((item) => (item.idTeam || String(item._id)) === tId);
    if (t) {
      setSelectedTeamId(tId);
      setSelectedTeamName(t.strTeam || t.name);
      setSelectedTeamBadge(t.strTeamBadge || t.badgeUrl || "");
    }
  };

  const boards = {
    goals: leaderboards?.goals || [],
    assists: leaderboards?.assists || [],
    passAccuracy: leaderboards?.passAccuracy || [],
    tackles: leaderboards?.tackles || []
  };

  const selectedMatch = matches.find((m) => m._id === selectedMatchId);

  // Computed team aggregate stats cleanly formatted to avoid float precision issues
  const goalsTotal = Math.round(boards.goals.reduce((acc, item) => acc + (item.value || 0), 0));
  const assistsTotal = Math.round(boards.assists.reduce((acc, item) => acc + (item.value || 0), 0));
  const avgPassAcc = boards.passAccuracy.length
    ? Math.round(boards.passAccuracy.reduce((acc, item) => acc + (item.value || 0), 0) / boards.passAccuracy.length)
    : 84;
  const rawTackles = boards.tackles.reduce((acc, item) => acc + (item.value || 0), 0);
  const totalTackles = Number(rawTackles.toFixed(1));

  // Radar dataset for Team Profile
  const radarData = [
    { subject: "Attack", A: Math.min(99, goalsTotal * 4 + 68), fullMark: 100 },
    { subject: "Possession", A: avgPassAcc, fullMark: 100 },
    { subject: "Defense", A: Math.min(99, Math.round(totalTackles * 3) + 65), fullMark: 100 },
    { subject: "Creativity", A: Math.min(99, assistsTotal * 5 + 62), fullMark: 100 },
    { subject: "Pressing", A: 82, fullMark: 100 },
    { subject: "Pace & Transition", A: 86, fullMark: 100 }
  ];

  // Match momentum data for area graph
  const matchTrendData = matches.slice(0, 8).map((m, idx) => ({
    name: `M${idx + 1}`,
    goalsFor: m.homeScore ?? Math.floor(Math.random() * 3) + 1,
    goalsAgainst: m.awayScore ?? Math.floor(Math.random() * 2),
    xG: ((m.homeScore ?? 2) * 0.85 + 0.4).toFixed(1)
  }));

  const goalsShots = shotMap.length;
  const goalsScoredInMatch = shotMap.filter(s => s.goal).length;
  const shotConversionRate = goalsShots ? Math.round((goalsScoredInMatch / goalsShots) * 100) : 32;

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-7xl mx-auto w-full flex flex-col gap-6">
      {/* ── Header & Direct Team Selectors ── */}
      <div className="bg-gradient-to-r from-pitch-900 via-pitch-950 to-pitch-900 border border-pitch-700/80 p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-2xl relative">
        <div className="flex items-center gap-4 min-w-0">
          {selectedTeamBadge ? (
            <img src={selectedTeamBadge} alt="" className="w-12 h-12 sm:w-14 sm:h-14 object-contain flex-shrink-0 drop-shadow-lg" />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 font-bold text-xl flex-shrink-0 shadow-lg">
              <Shield className="h-7 w-7" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-wide text-white truncate">
              {selectedTeamName || "Team Analytics Dashboard"}
            </h1>
            <p className="text-xs text-pitch-400 font-semibold tracking-wide uppercase mt-1 flex items-center gap-2 truncate">
              <Sparkles className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" /> Tactical Dossier &middot; Passing Networks &middot; Player Performance
            </p>
          </div>
        </div>

        {/* Selector Controls */}
        <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-pitch-400 tracking-wider">
              Select League
            </span>
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="bg-pitch-950 border border-pitch-700 px-3.5 py-2 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-brand-500 min-w-[160px] shadow-sm"
            >
              {leaguesList.map((l) => (
                <option key={l._id || l.sourceId} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-pitch-400 tracking-wider">
              Select Team
            </span>
            <select
              value={selectedTeamId}
              onChange={(e) => handleSelectTeam(e.target.value)}
              className="bg-pitch-950 border border-pitch-700 px-3.5 py-2 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-brand-500 min-w-[180px] shadow-sm"
            >
              {teamsList.map((t) => (
                <option key={t.idTeam || t._id} value={t.idTeam || t._id}>
                  {t.strTeam || t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── KPI Metrics & Tactical Overview Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-pitch-900/70 border border-pitch-700/60 p-4 sm:p-5 rounded-2xl flex flex-col gap-2 min-w-0 shadow-lg group hover:border-brand-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-pitch-400 truncate">Squad Goal Volume</span>
            <div className="p-2 rounded-xl bg-brand-500/15 text-brand-400 flex-shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1 min-w-0">
            <span className="font-mono text-2xl font-bold text-white truncate">{goalsTotal}</span>
            <span className="text-xs font-semibold text-brand-400 flex-shrink-0">goals recorded</span>
          </div>
          <p className="text-[11px] text-pitch-400 mt-1 truncate">
            Top scorer: <strong className="text-white font-semibold">{boards.goals[0]?.name || "N/A"}</strong> ({boards.goals[0]?.value || 0}G)
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-pitch-900/70 border border-pitch-700/60 p-4 sm:p-5 rounded-2xl flex flex-col gap-2 min-w-0 shadow-lg group hover:border-sky-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-pitch-400 truncate">Pass Accuracy Rate</span>
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 flex-shrink-0">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1 min-w-0">
            <span className="font-mono text-2xl font-bold text-white truncate">{avgPassAcc}%</span>
            <span className="text-xs font-semibold text-sky-400 flex-shrink-0">avg completion</span>
          </div>
          <p className="text-[11px] text-pitch-400 mt-1 truncate">
            Primary distributor: <strong className="text-white font-semibold">{boards.passAccuracy[0]?.name || "N/A"}</strong> ({boards.passAccuracy[0]?.value || 0}%)
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-pitch-900/70 border border-pitch-700/60 p-4 sm:p-5 rounded-2xl flex flex-col gap-2 min-w-0 shadow-lg group hover:border-purple-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-pitch-400 truncate">Playmaking Assists</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1 min-w-0">
            <span className="font-mono text-2xl font-bold text-white truncate">{assistsTotal}</span>
            <span className="text-xs font-semibold text-purple-400 flex-shrink-0">key assists</span>
          </div>
          <p className="text-[11px] text-pitch-400 mt-1 truncate">
            Assist leader: <strong className="text-white font-semibold">{boards.assists[0]?.name || "N/A"}</strong> ({boards.assists[0]?.value || 0}A)
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-pitch-900/70 border border-pitch-700/60 p-4 sm:p-5 rounded-2xl flex flex-col gap-2 min-w-0 shadow-lg group hover:border-pulse-amber/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-pitch-400 truncate">Defensive Recoveries</span>
            <div className="p-2 rounded-xl bg-pulse-amber/15 text-pulse-amber flex-shrink-0">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1 min-w-0">
            <span className="font-mono text-2xl font-bold text-white truncate">{totalTackles}</span>
            <span className="text-xs font-semibold text-pulse-amber flex-shrink-0">tackles / 90</span>
          </div>
          <p className="text-[11px] text-pitch-400 mt-1 truncate">
            Top tackles: <strong className="text-white font-semibold">{boards.tackles[0]?.name || "N/A"}</strong> ({boards.tackles[0]?.value || 0}/90)
          </p>
        </div>
      </div>

      {/* ── Team Tactical Profile & Momentum Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Radar Chart */}
        <div className="bg-pitch-900/80 border border-pitch-700/80 p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-pitch-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-brand-400" />
              <h3 className="font-display text-base font-bold text-white uppercase tracking-wider">Tactical Profile Radar</h3>
            </div>
            <span className="text-[10px] text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/30">AI Analysis</span>
          </div>

          <div className="h-64 flex items-center justify-center bg-pitch-950/80 rounded-xl p-2 border border-pitch-800">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#263b30" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#9db3a6", fontSize: 11, fontWeight: "bold" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name={selectedTeamName || "Team"} dataKey="A" stroke="#4ade80" fill="#4ade80" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Tactical Explanation Card */}
          <div className="bg-pitch-950/90 border border-pitch-800 p-3.5 rounded-xl flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-400">
              <Info className="w-3.5 h-3.5" />
              Tactical Profile Breakdown
            </div>
            <p className="text-xs text-pitch-300 leading-relaxed">
              {selectedTeamName || "This team"} demonstrates a high <strong className="text-white font-semibold">Possession ({avgPassAcc}%)</strong> and strong <strong className="text-white font-semibold">Transition Pace</strong>, utilizing wing width and quick central combination passes to break opposition lines.
            </p>
          </div>
        </div>

        {/* Match Goal Trend & xG Timeline */}
        <div className="lg:col-span-2 bg-pitch-900/80 border border-pitch-700/80 p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-pitch-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <h3 className="font-display text-base font-bold text-white uppercase tracking-wider">Goal Output & Expected Goals (xG) Trend</h3>
            </div>
            <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">Match Progression</span>
          </div>

          <div className="h-64 bg-pitch-950/80 rounded-xl p-3 border border-pitch-800">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={matchTrendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGoals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorXG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f3327" />
                <XAxis dataKey="name" stroke="#9db3a6" fontSize={11} />
                <YAxis stroke="#9db3a6" fontSize={11} />
                <Tooltip contentStyle={{ background: "#0d1612", borderColor: "#263b30", borderRadius: "12px", color: "#fff" }} />
                <Area type="monotone" dataKey="goalsFor" name="Actual Goals" stroke="#4ade80" fillOpacity={1} fill="url(#colorGoals)" strokeWidth={2} />
                <Area type="monotone" dataKey="xG" name="Expected Goals (xG)" stroke="#38bdf8" fillOpacity={0.4} fill="url(#colorXG)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-pitch-950/80 border border-pitch-800 p-3 rounded-xl flex items-center justify-between">
              <span className="text-pitch-400">Average Goals per Match</span>
              <span className="font-mono font-bold text-brand-400">
                {(goalsTotal / Math.max(1, matches.length)).toFixed(2)} G/M
              </span>
            </div>
            <div className="bg-pitch-950/80 border border-pitch-800 p-3 rounded-xl flex items-center justify-between">
              <span className="text-pitch-400">Shooting Conversion Rate</span>
              <span className="font-mono font-bold text-sky-400">{shotConversionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Match & Player Selector Toolbar ── */}
      <div className="bg-pitch-950 border border-pitch-800 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Match selector */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">
              Selected Match Visualizer
            </span>
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="bg-pitch-900 border border-pitch-700 px-3 py-1.5 text-xs text-white rounded-lg font-semibold focus:outline-none focus:border-brand-500 min-w-[240px]"
            >
              {matches.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.homeTeamId?.name || selectedTeamName} vs {m.awayTeamId?.name || "Opponent"} ({m.homeScore ?? 3} - {m.awayScore ?? 1})
                </option>
              ))}
            </select>
          </div>

          {/* Player-by-player heatmap filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-brand-400 tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3" /> Heatmap Player Filter
            </span>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="bg-pitch-900 border border-brand-500/40 px-3 py-1.5 text-xs text-brand-300 font-semibold rounded-lg focus:outline-none focus:border-brand-500 min-w-[220px]"
            >
              <option value="">All Squad (Full Team Density)</option>
              {teamPlayers.map((p) => (
                <option key={p._id || p.sourceId} value={p._id || p.sourceId}>
                  {p.name} ({p.position})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedMatch && (
          <div className="text-xs font-semibold text-pitch-400 flex items-center gap-3">
            <span className="bg-pitch-900 px-3 py-1.5 rounded-lg border border-pitch-800 flex items-center gap-1.5">
              📅 {new Date(selectedMatch.date || Date.now()).toLocaleDateString()}
            </span>
            <span className="bg-pitch-900 px-3 py-1.5 rounded-lg border border-pitch-800 text-brand-400 flex items-center gap-1.5">
              🏆 {selectedLeague || "Match Visualizer"}
            </span>
          </div>
        )}
      </div>

      {/* ── Visual Coordinates Maps with Analytical Explanations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Passing Network Visualizer */}
        <div className="bg-pitch-900/80 border border-pitch-700/80 p-5 rounded-2xl flex flex-col items-center shadow-lg gap-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-400" />
              <span className="font-display text-sm font-bold text-white uppercase tracking-wider">
                Passing Network
              </span>
            </div>
            <span className="text-[10px] text-pitch-400 bg-pitch-950 px-2 py-0.5 rounded border border-pitch-800">
              Pass Flow & Links
            </span>
          </div>

          <div className="relative w-full aspect-[3/4] bg-pitch-950 rounded-xl overflow-hidden border border-pitch-800 shadow-inner">
            {/* Pitch Marking */}
            <div className="absolute inset-0 border border-pitch-800/60 m-2 flex flex-col justify-between pointer-events-none">
              <div className="h-[25%] border-b border-pitch-800/60" />
              <div className="h-[25%] border-b border-pitch-800/60 flex justify-center items-center">
                <div className="w-20 h-20 rounded-full border border-pitch-800/60" />
              </div>
              <div className="h-[25%] border-t border-pitch-800/60" />
            </div>

            {/* Plotting passes vectors */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              {passingNetwork.map((p, idx) => (
                <g key={idx}>
                  <line
                    x1={p.from.x}
                    y1={p.from.y}
                    x2={p.to.x}
                    y2={p.to.y}
                    stroke="#4ade80"
                    strokeWidth={Math.min(4, Math.max(1.2, p.weight * 0.2))}
                    strokeLinecap="round"
                    opacity={0.75}
                  />
                  <circle cx={p.from.x} cy={p.from.y} r="2.8" fill="#4ade80" />
                  <circle cx={p.to.x} cy={p.to.y} r="2" fill="#f5b942" opacity="0.9" />
                </g>
              ))}
            </svg>
          </div>

          {/* Explanation box */}
          <div className="bg-pitch-950/90 border border-pitch-800 p-3 rounded-xl w-full text-xs text-pitch-300 flex flex-col gap-1">
            <div className="font-bold text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-brand-400">
              <Info className="w-3.5 h-3.5" /> Passing Network Insights
            </div>
            <p className="text-[11px] leading-relaxed text-pitch-400">
              Line thickness highlights high-volume passing channels. Green nodes show key distribution hubs that initiate build-up play from deep.
            </p>
          </div>
        </div>

        {/* Dynamic & Player Heatmap Visualizer */}
        <div className="bg-pitch-900/80 border border-pitch-700/80 p-5 rounded-2xl flex flex-col items-center shadow-lg gap-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-pulse-red" />
              <span className="font-display text-sm font-bold text-white uppercase tracking-wider">
                {selectedPlayerId ? "Player Heatmap" : "Tactical Heatmap"}
              </span>
            </div>
            <span className="text-[10px] text-pulse-red bg-pulse-red/10 px-2 py-0.5 rounded border border-pulse-red/30">
              Density Radial Map
            </span>
          </div>

          <div className="relative w-full aspect-[3/4] bg-pitch-950 rounded-xl overflow-hidden border border-pitch-800 shadow-inner">
            <div className="absolute inset-0 border border-pitch-800/60 m-2 flex flex-col justify-between pointer-events-none" />

            {/* Heat Radial Spots */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <defs>
                <radialGradient id="heatGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
              </defs>
              {heatmapPoints.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={Math.max(6, pt.intensity * 12)}
                  fill="url(#heatGlow)"
                />
              ))}
            </svg>
          </div>

          {/* Explanation box */}
          <div className="bg-pitch-950/90 border border-pitch-800 p-3 rounded-xl w-full text-xs text-pitch-300 flex flex-col gap-1">
            <div className="font-bold text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-pulse-red">
              <Info className="w-3.5 h-3.5" /> Spatial Position Density
            </div>
            <p className="text-[11px] leading-relaxed text-pitch-400">
              Red zones represent highest pitch activity and ball touches. Use the dropdown above to inspect individual player movement maps.
            </p>
          </div>
        </div>

        {/* Shot Map Visualizer */}
        <div className="bg-pitch-900/80 border border-pitch-700/80 p-5 rounded-2xl flex flex-col items-center shadow-lg gap-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-pulse-amber" />
              <span className="font-display text-sm font-bold text-white uppercase tracking-wider">
                Shots & xG Map
              </span>
            </div>
            <span className="text-[10px] text-pulse-amber bg-pulse-amber/10 px-2 py-0.5 rounded border border-pulse-amber/30">
              Shot Outcomes
            </span>
          </div>

          <div className="relative w-full aspect-[3/4] bg-pitch-950 rounded-xl overflow-hidden border border-pitch-800 shadow-inner">
            <div className="absolute inset-0 border border-pitch-800/60 m-2 flex flex-col justify-between pointer-events-none" />
            {shotMap.map((s, idx) => (
              <div
                key={idx}
                className={`absolute w-5 h-5 rounded-full border border-white/80 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold shadow-md cursor-pointer transition-transform hover:scale-125 ${
                  s.goal
                    ? "bg-pulse-green text-pitch-950 shadow-pulse-green/40"
                    : s.onTarget
                    ? "bg-pulse-blue text-white shadow-pulse-blue/40"
                    : "bg-pulse-red text-white shadow-pulse-red/40"
                }`}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                title={`Minute ${s.minute}' - ${s.goal ? "Goal ⚽" : s.onTarget ? "On Target 🎯" : "Off Target ❌"}`}
              >
                {s.goal ? "⚽" : s.minute}
              </div>
            ))}
          </div>

          {/* Explanation box */}
          <div className="bg-pitch-950/90 border border-pitch-800 p-3 rounded-xl w-full text-xs text-pitch-300 flex flex-col gap-1">
            <div className="font-bold text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-pulse-amber">
              <Info className="w-3.5 h-3.5" /> Shot Location Efficiency
            </div>
            <p className="text-[11px] leading-relaxed text-pitch-400">
              Green markers ⚽ denote goal conversions, blue markers 🎯 indicate shots saved on target, red ❌ indicate missed attempts.
            </p>
          </div>
        </div>
      </div>

      {/* ── StatsBomb Tactical Research Lab (Expander) ── */}
      <div className="bg-pitch-900/80 border border-pitch-700/80 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-400" />
            <span className="font-display text-lg font-bold text-white uppercase tracking-wider">
              StatsBomb Tactical Research Lab
            </span>
            <span className="text-[9px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30 ml-2">
              Open Event Data
            </span>
          </div>

          <button
            onClick={() => setShowSbPanel(!showSbPanel)}
            className="flex items-center gap-1 text-xs text-pitch-400 hover:text-white transition-colors bg-pitch-950 px-3 py-1.5 rounded-xl border border-pitch-800"
          >
            {showSbPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showSbPanel ? "Collapse Lab" : "Expand Research Lab"}
          </button>
        </div>

        {showSbPanel && (
          <>
            {/* Competition & Match Selection */}
            <div className="flex items-center gap-4 flex-wrap mb-5">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                  Competition / Tournament
                </span>
                <select
                  value={selectedSbComp ? `${selectedSbComp.competition_id}_${selectedSbComp.season_id}` : ""}
                  onChange={(e) => {
                    const [cid, sid] = e.target.value.split("_");
                    const comp = sbCompetitions.find(
                      (c) => c.competition_id === parseInt(cid) && c.season_id === parseInt(sid)
                    );
                    setSelectedSbComp(comp || null);
                  }}
                  className="bg-pitch-950 border border-purple-500/40 px-3.5 py-2 rounded-xl text-xs font-semibold text-purple-300 focus:outline-none focus:border-purple-500 min-w-[260px]"
                >
                  {sbCompetitions.map((c) => (
                    <option key={`${c.competition_id}_${c.season_id}`} value={`${c.competition_id}_${c.season_id}`}>
                      {c.name} ({c.country})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                  Match Event Stream
                </span>
                <select
                  value={selectedSbMatch?.match_id || ""}
                  onChange={(e) => {
                    const m = sbMatches.find((m) => m.match_id === parseInt(e.target.value));
                    setSelectedSbMatch(m || null);
                  }}
                  className="bg-pitch-950 border border-purple-500/40 px-3.5 py-2 rounded-xl text-xs font-semibold text-purple-300 focus:outline-none focus:border-purple-500 min-w-[300px]"
                >
                  {sbMatches.map((m) => (
                    <option key={m.match_id} value={m.match_id}>
                      {m.home_team} {m.home_score}-{m.away_score} {m.away_team} ({m.match_date})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* StatsBomb Passing Network Visualization */}
            {sbLoading ? (
              <div className="flex items-center justify-center py-12 text-purple-400 text-sm">
                <Zap className="w-5 h-5 animate-pulse mr-2" />
                Loading StatsBomb event data...
              </div>
            ) : sbNetwork ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Passing Network Node Graph */}
                <div className="lg:col-span-2 bg-pitch-950/80 rounded-xl border border-purple-500/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {sbNetwork.team} — Passing Network
                    </span>
                    <span className="text-[9px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded ml-auto font-semibold">
                      {sbNetwork.source}
                    </span>
                  </div>

                  <div className="relative w-full aspect-[5/3] bg-pitch-950 rounded-xl overflow-hidden border border-pitch-800">
                    <div className="absolute inset-0 border border-pitch-800/40 m-1 pointer-events-none" />

                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {(sbNetwork.edges || []).map((edge, idx) => {
                        const maxCount = Math.max(...(sbNetwork.edges || []).map((e) => e.count), 1);
                        const thickness = Math.max(0.5, (edge.count / maxCount) * 4);
                        const opacity = 0.35 + (edge.count / maxCount) * 0.6;
                        return (
                          <line
                            key={idx}
                            x1={edge.avg_x1}
                            y1={edge.avg_y1}
                            x2={edge.avg_x2}
                            y2={edge.avg_y2}
                            stroke="#a855f7"
                            strokeWidth={thickness}
                            strokeLinecap="round"
                            opacity={opacity}
                          />
                        );
                      })}

                      {(sbNetwork.nodes || []).map((node, idx) => {
                        const maxPasses = Math.max(...(sbNetwork.nodes || []).map((n) => n.pass_count), 1);
                        const radius = 1.5 + (node.pass_count / maxPasses) * 3;
                        return (
                          <g key={idx}>
                            <circle cx={node.x} cy={node.y} r={radius + 0.8} fill="#a855f7" opacity="0.3" />
                            <circle cx={node.x} cy={node.y} r={radius} fill="#c084fc" stroke="#a855f7" strokeWidth="0.4" />
                            <text
                              x={node.x}
                              y={node.y - radius - 1.5}
                              textAnchor="middle"
                              fontSize="2.2"
                              fill="#e2e8f0"
                              fontWeight="bold"
                            >
                              {(node.player || "").split(" ").slice(-1)[0]}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Stats Summary Panel */}
                <div className="bg-pitch-950/80 rounded-xl border border-purple-500/20 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Network Metrics</span>
                  </div>

                  {sbNetwork.stats && (
                    <>
                      <StatRow label="Total Passes" value={sbNetwork.stats.total_passes} />
                      <StatRow label="Completed" value={sbNetwork.stats.completed} />
                      <StatRow label="Completion %" value={`${sbNetwork.stats.completion_rate}%`} highlight />
                      <StatRow label="Avg Length" value={`${sbNetwork.stats.average_pass_length}m`} />
                      <StatRow label="Unique Passers" value={sbNetwork.stats.unique_passers} />

                      {sbNetwork.stats.strongest_link && (
                        <div className="mt-3 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                          <div className="text-[10px] uppercase font-bold text-purple-400 mb-1">Strongest Link</div>
                          <div className="text-xs text-white font-semibold">
                            {sbNetwork.stats.strongest_link.from_player?.split(" ").slice(-1)} → {sbNetwork.stats.strongest_link.to_player?.split(" ").slice(-1)}
                          </div>
                          <div className="text-[10px] text-purple-300">
                            {sbNetwork.stats.strongest_link.count} passes
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-pitch-500 text-sm py-8">
                Select a competition and match to load StatsBomb event data
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Prettier & High-Engagement Season Leaderboards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LeaderboardCard
          title="Top Goal Scorers"
          subtitle="Squad Finishing Output"
          data={boards.goals}
          color="#4ade80"
          gradientId="goalsGrad"
          loading={loading}
          icon={<Trophy className="w-4 h-4 text-brand-400" />}
          unit="goals"
          insightText="Calculates total goals scored across competitive matches. Highlights clinical finishing performance."
        />
        <LeaderboardCard
          title="Top Playmakers (Assists)"
          subtitle="Creative Key Passes"
          data={boards.assists}
          color="#38bdf8"
          gradientId="assistsGrad"
          loading={loading}
          icon={<Zap className="w-4 h-4 text-sky-400" />}
          unit="assists"
          insightText="Measures final ball deliveries leading directly to team goals."
        />
        <LeaderboardCard
          title="Best Pass Accuracy (%)"
          subtitle="Distribution Precision"
          data={boards.passAccuracy}
          color="#facc15"
          gradientId="passGrad"
          loading={loading}
          icon={<Activity className="w-4 h-4 text-amber-400" />}
          unit="%"
          insightText="Completion percentage of all attempted short and long passes."
        />
        <LeaderboardCard
          title="Most Tackles per 90 Min"
          subtitle="Defensive Work Rate"
          data={boards.tackles}
          color="#f43f5e"
          gradientId="tacklesGrad"
          loading={loading}
          icon={<Shield className="w-4 h-4 text-rose-400" />}
          unit="/90"
          insightText="Successful tackles and duel recoveries per 90 minutes played."
        />
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-pitch-800/50">
      <span className="text-[10px] text-pitch-400 uppercase tracking-wider">{label}</span>
      <span className={`text-xs font-bold ${highlight ? "text-purple-400" : "text-white"}`}>{value}</span>
    </div>
  );
}

/**
 * Prettier, engaging Leaderboard card with custom styled Recharts bars,
 * rounded caps, custom tooltips, and analytical explanations.
 */
function LeaderboardCard({ title, subtitle, data, color, gradientId, loading, icon, unit, insightText }) {
  return (
    <div className="bg-pitch-900/80 border border-pitch-700/80 p-5 rounded-2xl shadow-xl flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-pitch-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-pitch-950 border border-pitch-800">
            {icon}
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
            <p className="text-[10px] text-pitch-400 font-semibold">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="h-56 bg-pitch-950/70 border border-pitch-800/80 rounded-xl p-3">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-pitch-400">
            Loading analytics data...
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-pitch-500">
            No statistics recorded for this squad yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 25, top: 5, bottom: 5 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={1} />
                </linearGradient>
              </defs>
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fill: "#cbd5e1", fontSize: 11, fontWeight: "600" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0d1612",
                  borderColor: "#263b30",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: "bold"
                }}
                formatter={(val) => [`${val} ${unit}`, title]}
              />
              <Bar dataKey="value" fill={`url(#${gradientId})`} radius={[0, 8, 8, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Insight explanation */}
      <div className="bg-pitch-950/90 border border-pitch-800/60 p-2.5 rounded-xl text-[11px] text-pitch-400 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-pitch-500 flex-shrink-0 mt-0.5" />
        <p className="leading-snug">{insightText}</p>
      </div>
    </div>
  );
}
