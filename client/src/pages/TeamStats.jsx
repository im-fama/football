import React, { useEffect, useState } from "react";
import { useSquad } from "../context/SquadContext";
import {
  getLeagues, getTeams, getLeaderboards, getTeamMatches,
  getPassingNetwork, getHeatmap, getShotMap, getPlayersByTeam,
  getStandings, getFixtures, getApiFootballLeagues,
  getStatsBombCompetitions, getStatsBombMatches, getStatsBombPassingNetwork,
} from "../services/api";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Activity, Flame, Target, Filter, Shield, Trophy, Globe, Calendar, Database, ChevronDown, ChevronUp, Zap } from "lucide-react";

export default function TeamStats() {
  const { selectedLeague, setSelectedLeague, selectedTeamId, setSelectedTeamId, selectedTeamName, setSelectedTeamName, setSelectedTeamBadge } = useSquad();

  // Selection states directly on page
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

  // Phase 1: API-Football Standings & Fixtures
  const [apiLeagues, setApiLeagues] = useState([]);
  const [selectedApiLeague, setSelectedApiLeague] = useState(39);
  const [standings, setStandings] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [showStandings, setShowStandings] = useState(true);

  // Phase 3: StatsBomb Research Lab
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

    // Fetch API-Football leagues
    getApiFootballLeagues()
      .then((data) => setApiLeagues(data.leagues || []))
      .catch(() => {});

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

  // 5. Fetch API-Football standings & fixtures when league selector changes
  useEffect(() => {
    if (!selectedApiLeague) return;
    Promise.all([
      getStandings(selectedApiLeague).catch(() => ({ standings: [] })),
      getFixtures(selectedApiLeague).catch(() => ({ fixtures: [] })),
    ]).then(([sData, fData]) => {
      setStandings(sData.standings || []);
      setFixtures(fData.fixtures || []);
    });
  }, [selectedApiLeague]);

  // 6. Fetch StatsBomb matches when competition changes
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

  // 7. Fetch StatsBomb passing network when match changes
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

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-thin max-w-7xl mx-auto w-full flex flex-col gap-6">
      {/* Header & Direct Selectors */}
      <div className="bg-pitch-900/80 border border-pitch-700/80 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-wide">
            Team Analytics & Heatmap Dossier
          </h1>
          <p className="text-xs text-pitch-400 font-semibold tracking-wide uppercase mt-1">
            Visual metrics, passing networks & player-by-player analysis
          </p>
        </div>

        {/* League & Team Selector Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-pitch-400 tracking-wider">
              Select League
            </span>
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="bg-pitch-950 border border-pitch-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-brand-500 max-w-[200px]"
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
              className="bg-pitch-950 border border-pitch-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-brand-500 max-w-[220px]"
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

      {/* Match & Player Selector Toolbar */}
      <div className="bg-pitch-950 border border-pitch-800 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Match selector */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">
              Selected Match
            </span>
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="bg-pitch-900 border border-pitch-700 px-3 py-1 text-xs text-white rounded-lg"
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
              className="bg-pitch-900 border border-brand-500/40 px-3 py-1 text-xs text-brand-300 font-semibold rounded-lg focus:outline-none focus:border-brand-500"
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
            <span className="bg-pitch-900 px-3 py-1 rounded-lg border border-pitch-800">
              📅 {new Date(selectedMatch.date || Date.now()).toLocaleDateString()}
            </span>
            <span className="bg-pitch-900 px-3 py-1 rounded-lg border border-pitch-800 text-brand-400">
              🏆 {selectedLeague || "Match Visualizer"}
            </span>
          </div>
        )}
      </div>

      {/* Visual Coordinates Maps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Passing Network Visualizer */}
        <div className="bg-pitch-900/80 border border-pitch-700/80 p-5 rounded-2xl flex flex-col items-center shadow-lg">
          <div className="flex items-center justify-between w-full mb-3">
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
                    opacity={0.7}
                  />
                  <circle cx={p.from.x} cy={p.from.y} r="2.5" fill="#4ade80" />
                  <circle cx={p.to.x} cy={p.to.y} r="1.8" fill="#f5b942" opacity="0.8" />
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Dynamic & Player Heatmap Visualizer */}
        <div className="bg-pitch-900/80 border border-pitch-700/80 p-5 rounded-2xl flex flex-col items-center shadow-lg">
          <div className="flex items-center justify-between w-full mb-3">
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
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
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
        </div>

        {/* Shot Map Visualizer */}
        <div className="bg-pitch-900/80 border border-pitch-700/80 p-5 rounded-2xl flex flex-col items-center shadow-lg">
          <div className="flex items-center justify-between w-full mb-3">
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
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          Phase 1: API-Football Standings & Fixtures
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-pitch-900/80 border border-pitch-700/80 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-brand-400" />
            <span className="font-display text-lg font-bold text-white uppercase tracking-wider">
              Live League Standings & Fixtures
            </span>
            <span className="text-[9px] text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/30 ml-2">
              API-Football
            </span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedApiLeague}
              onChange={(e) => setSelectedApiLeague(parseInt(e.target.value))}
              className="bg-pitch-950 border border-pitch-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-brand-500"
            >
              {apiLeagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.country})
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowStandings(!showStandings)}
              className="flex items-center gap-1 text-xs text-pitch-400 hover:text-white transition-colors"
            >
              {showStandings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showStandings ? "Collapse" : "Expand"}
            </button>
          </div>
        </div>

        {showStandings && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Standings Table */}
            <div className="bg-pitch-950/80 rounded-xl border border-pitch-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-pulse-amber" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Table Standings</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-pitch-400 border-b border-pitch-800">
                      <th className="text-left py-2 px-1">#</th>
                      <th className="text-left py-2 px-1">Team</th>
                      <th className="text-center py-2 px-1">P</th>
                      <th className="text-center py-2 px-1">W</th>
                      <th className="text-center py-2 px-1">D</th>
                      <th className="text-center py-2 px-1">L</th>
                      <th className="text-center py-2 px-1">GD</th>
                      <th className="text-center py-2 px-1 text-brand-400 font-bold">Pts</th>
                      <th className="text-center py-2 px-1">Form</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-pitch-800/50 hover:bg-pitch-800/30 transition-colors ${
                          i < 4 ? "bg-brand-500/5" : ""
                        }`}
                      >
                        <td className="py-1.5 px-1 font-bold text-pitch-300">{row.rank}</td>
                        <td className="py-1.5 px-1 font-semibold text-white truncate max-w-[120px]">{row.name}</td>
                        <td className="text-center py-1.5 px-1 text-pitch-400">{row.played}</td>
                        <td className="text-center py-1.5 px-1 text-pulse-green">{row.won}</td>
                        <td className="text-center py-1.5 px-1 text-pitch-400">{row.draw}</td>
                        <td className="text-center py-1.5 px-1 text-pulse-red">{row.lost}</td>
                        <td className="text-center py-1.5 px-1 text-pitch-300">
                          {row.gd > 0 ? `+${row.gd}` : row.gd}
                        </td>
                        <td className="text-center py-1.5 px-1 text-brand-400 font-bold">{row.pts}</td>
                        <td className="text-center py-1.5 px-1">
                          <div className="flex gap-0.5 justify-center">
                            {(row.form || "").split("").slice(0, 5).map((ch, fi) => (
                              <span
                                key={fi}
                                className={`w-3.5 h-3.5 rounded-full text-[7px] flex items-center justify-center font-bold ${
                                  ch === "W" ? "bg-pulse-green text-pitch-950" :
                                  ch === "D" ? "bg-pitch-500 text-white" :
                                  ch === "L" ? "bg-pulse-red text-white" : "bg-pitch-700"
                                }`}
                              >
                                {ch}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {standings.length === 0 && (
                  <div className="text-center text-pitch-500 text-xs py-6">No standings available</div>
                )}
              </div>
            </div>

            {/* Upcoming Fixtures */}
            <div className="bg-pitch-950/80 rounded-xl border border-pitch-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-pulse-blue" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Upcoming Fixtures</span>
              </div>
              <div className="flex flex-col gap-2">
                {fixtures.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-pitch-900/60 px-3 py-2.5 rounded-lg border border-pitch-800/50 hover:border-pitch-700 transition-colors">
                    <div className="flex-1 text-right">
                      <span className="text-xs font-semibold text-white">{f.home}</span>
                    </div>
                    <div className="px-3 flex flex-col items-center">
                      <span className="text-[9px] text-pitch-500 font-medium">
                        {new Date(f.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <span className="text-xs font-bold text-brand-400">
                        {f.homeScore !== null ? `${f.homeScore} - ${f.awayScore}` : "vs"}
                      </span>
                      <span className="text-[8px] text-pitch-600 uppercase">{f.status}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-white">{f.away}</span>
                    </div>
                  </div>
                ))}
                {fixtures.length === 0 && (
                  <div className="text-center text-pitch-500 text-xs py-6">No upcoming fixtures</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          Phase 3: StatsBomb Tactical Research Lab
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-pitch-900/80 border border-pitch-700/80 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-400" />
            <span className="font-display text-lg font-bold text-white uppercase tracking-wider">
              StatsBomb Research Lab
            </span>
            <span className="text-[9px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30 ml-2">
              Open Data
            </span>
          </div>

          <button
            onClick={() => setShowSbPanel(!showSbPanel)}
            className="flex items-center gap-1 text-xs text-pitch-400 hover:text-white transition-colors"
          >
            {showSbPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showSbPanel ? "Collapse" : "Expand Research Lab"}
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
                  className="bg-pitch-950 border border-purple-500/40 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-300 focus:outline-none focus:border-purple-500 max-w-[280px]"
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
                  Match
                </span>
                <select
                  value={selectedSbMatch?.match_id || ""}
                  onChange={(e) => {
                    const m = sbMatches.find((m) => m.match_id === parseInt(e.target.value));
                    setSelectedSbMatch(m || null);
                  }}
                  className="bg-pitch-950 border border-purple-500/40 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-300 focus:outline-none focus:border-purple-500 max-w-[320px]"
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
                    <span className="text-[9px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded ml-auto">
                      {sbNetwork.source}
                    </span>
                  </div>

                  <div className="relative w-full aspect-[5/3] bg-pitch-950 rounded-xl overflow-hidden border border-pitch-800">
                    {/* Pitch background */}
                    <div className="absolute inset-0 border border-pitch-800/40 m-1 pointer-events-none" />

                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {/* Pass edges (line-thickness vectors) */}
                      {(sbNetwork.edges || []).map((edge, idx) => {
                        const maxCount = Math.max(...(sbNetwork.edges || []).map((e) => e.count), 1);
                        const thickness = Math.max(0.5, (edge.count / maxCount) * 4);
                        const opacity = 0.3 + (edge.count / maxCount) * 0.6;
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

                      {/* Player nodes */}
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
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Network Stats</span>
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

                  {/* Top Connections */}
                  <div className="mt-2">
                    <div className="text-[10px] uppercase font-bold text-pitch-400 mb-2">Top Connections</div>
                    {(sbNetwork.edges || []).slice(0, 5).map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px] py-1 border-b border-pitch-800/50">
                        <span className="text-pitch-300 truncate max-w-[140px]">
                          {e.from_player?.split(" ").slice(-1)} → {e.to_player?.split(" ").slice(-1)}
                        </span>
                        <span className="text-purple-400 font-bold">{e.count}</span>
                      </div>
                    ))}
                  </div>
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

      {/* Season Leaderboards Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Leaderboard title="Top Goal Scorers" data={boards.goals} color="#4ade80" loading={loading} />
        <Leaderboard title="Top Playmakers (Assists)" data={boards.assists} color="#4f8ff7" loading={loading} />
        <Leaderboard title="Best Pass Accuracy (%)" data={boards.passAccuracy} color="#d9b45f" loading={loading} />
        <Leaderboard title="Most Tackles / 90" data={boards.tackles} color="#ef5a5a" loading={loading} />
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

function Leaderboard({ title, data, color, loading }) {
  return (
    <div className="bg-pitch-900/80 border border-pitch-700/80 p-5 rounded-2xl shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-brand-400" />
        <span className="font-display text-sm font-bold text-white uppercase tracking-wider">{title}</span>
      </div>
      <div className="h-52">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-pitch-400">
            Loading analytics data...
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-pitch-500">
            No statistics recorded for this team yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={110} tick={{ fill: "#9db3a6", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#111c17", borderColor: "#1a2921", borderRadius: "8px" }} />
              <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
