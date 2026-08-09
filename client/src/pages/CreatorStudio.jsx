import React, { useState, useEffect } from "react";
import { useSquad } from "../context/SquadContext";
import { getLeagues, getCustomTeams, createTeam, deleteTeam, createPlayer, getPlayersByTeam } from "../services/api";
import { PlusCircle, Shield, User, Image, Trash2, ArrowRight, ArrowLeft, CheckCircle2, Play, Users, Sparkles, AlertCircle } from "lucide-react";
import PlayerImagePickerModal from "../components/modal/PlayerImagePickerModal";
import { useNavigate } from "react-router-dom";

export default function CreatorStudio() {
  const { setSelectedLeague, setSelectedTeamId, setSelectedTeamName, setSelectedTeamBadge } = useSquad();
  const navigate = useNavigate();

  // Wizard state: 1 = Teams List, 2 = Team Info, 3 = Add 11+ Players, 4 = Finalize
  const [step, setStep] = useState(1);

  // Data state
  const [customTeams, setCustomTeams] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Team Form State
  const [teamName, setTeamName] = useState("");
  const [teamLeague, setTeamLeague] = useState("No League / Custom Teams");
  const [teamBadge, setTeamBadge] = useState("");
  const [teamStadium, setTeamStadium] = useState("");

  // Roster / Player Form State
  const [roster, setRoster] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [playerPosition, setPlayerPosition] = useState("ST");
  const [playerNat, setPlayerNat] = useState("England");
  const [playerAge, setPlayerAge] = useState(25);
  const [playerPhoto, setPlayerPhoto] = useState("");
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [stats, setStats] = useState({
    pace: 78,
    shooting: 75,
    passing: 74,
    dribbling: 76,
    defending: 55,
    physical: 72
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [customRes, leagueRes] = await Promise.all([
        getCustomTeams().catch(() => ({ teams: [] })),
        getLeagues().catch(() => ({ leagues: [] }))
      ]);
      setCustomTeams(customRes.teams || []);
      setLeagues(leagueRes.leagues || []);
    } catch (err) {
      console.error("Failed to load Creator Studio data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatChange = (stat, val) => {
    setStats((prev) => ({ ...prev, [stat]: Number(val) }));
  };

  const handleAddPlayerToDraft = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const overall = Math.round(
      (stats.pace + stats.shooting + stats.passing + stats.dribbling + stats.defending + stats.physical) / 6
    );

    const newPlayer = {
      tempId: `draft_${Date.now()}_${Math.random()}`,
      name: playerName.trim(),
      position: playerPosition,
      nationality: playerNat || "Unknown",
      age: Number(playerAge) || 25,
      photoUrl: playerPhoto.trim(),
      overallRating: overall,
      stats: { ...stats }
    };

    setRoster((prev) => [...prev, newPlayer]);

    // Reset player form for next player
    setPlayerName("");
    setPlayerPhoto("");
    setMessage(`Added ${newPlayer.name} (${newPlayer.position}) to squad roster!`);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleRemoveFromDraft = (tempId) => {
    setRoster((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const handlePickImage = (player) => {
    setPlayerPhoto(player.thumbnail || player.photoUrl || "");
    if (!playerName) setPlayerName(player.name || "");
    if (player.nationality) setPlayerNat(player.nationality);
    if (player.position) setPlayerPosition(player.position);
    if (player.stats) {
      setStats({
        pace: player.stats.pace || 75,
        shooting: player.stats.shooting || 75,
        passing: player.stats.passing || 75,
        dribbling: player.stats.dribbling || 75,
        defending: player.stats.defending || 75,
        physical: player.stats.physical || 75
      });
    }
  };

  const handleSaveFullTeam = async () => {
    if (roster.length < 11) {
      setErrorMsg(`Minimum 11 players required to form a full team. Currently added: ${roster.length}`);
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setMessage("Creating team and batch registering players in database...");

    try {
      // 1. Create team
      const newTeam = await createTeam({
        name: teamName,
        league: teamLeague,
        badgeUrl: teamBadge,
        stadium: teamStadium
      });

      const teamId = newTeam._id || newTeam.idTeam;

      // 2. Register all roster players
      await Promise.all(
        roster.map((player) =>
          createPlayer({
            name: player.name,
            position: player.position,
            nationality: player.nationality,
            age: player.age,
            photoUrl: player.photoUrl,
            teamId: teamId,
            stats: player.stats
          })
        )
      );

      setMessage(`🎉 Successfully created team "${teamName}" with ${roster.length} players!`);

      // 3. Reset form and refresh list
      await fetchInitialData();
      setTimeout(() => {
        setStep(1);
        setTeamName("");
        setTeamBadge("");
        setTeamStadium("");
        setRoster([]);
        setMessage("");
      }, 1500);
    } catch (err) {
      console.error("Failed to save team", err);
      setErrorMsg("Failed to save team and players. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTeamToPitch = async (team) => {
    setSelectedLeague("No League / Custom Teams");
    setSelectedTeamId(team._id || team.idTeam);
    setSelectedTeamName(team.name || team.strTeam);
    setSelectedTeamBadge(team.badgeUrl || team.strTeamBadge || "");
    navigate("/");
  };

  const handleDeleteCustomTeam = async (teamId) => {
    if (!window.confirm("Are you sure you want to delete this custom team and its players?")) return;
    try {
      await deleteTeam(teamId);
      setCustomTeams((prev) => prev.filter((t) => (t._id || t.idTeam) !== teamId));
      setMessage("Team deleted successfully.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete team.");
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-6 md:p-10 bg-pitch-950 overflow-y-auto scrollbar-thin">
      <div className="w-full max-w-5xl bg-pitch-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pitch-800 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-pitch-950 font-bold shadow-lg shadow-brand-500/20">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold uppercase tracking-widest text-white">
                Creator Studio
              </h1>
              <p className="text-xs text-pitch-400 font-medium">
                Step-by-step club creation wizard, ML analytics stats & player image integration
              </p>
            </div>
          </div>

          {step > 1 && (
            <button
              onClick={() => setStep((prev) => Math.max(1, prev - 1))}
              className="flex items-center gap-2 px-4 py-2 bg-pitch-800 hover:bg-pitch-700 text-pitch-200 text-xs font-bold rounded-xl transition-all border border-pitch-700"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>

        {/* Wizard Progress Indicator */}
        <div className="flex items-center justify-between max-w-2xl mx-auto mb-10 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-pitch-800 -translate-y-1/2 -z-0" />

          {/* Step 1 */}
          <div
            onClick={() => setStep(1)}
            className={`flex flex-col items-center gap-2 z-10 cursor-pointer ${
              step >= 1 ? "text-brand-400" : "text-pitch-600"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                step === 1
                  ? "bg-brand-500 text-pitch-950 border-white shadow-lg shadow-brand-500/30 scale-110"
                  : step > 1
                  ? "bg-brand-500/20 text-brand-400 border-brand-500"
                  : "bg-pitch-900 border-pitch-700 text-pitch-500"
              }`}
            >
              1
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Your Teams</span>
          </div>

          {/* Step 2 */}
          <div
            onClick={() => step >= 2 && setStep(2)}
            className={`flex flex-col items-center gap-2 z-10 ${
              step >= 2 ? "text-brand-400 cursor-pointer" : "text-pitch-600"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                step === 2
                  ? "bg-brand-500 text-pitch-950 border-white shadow-lg shadow-brand-500/30 scale-110"
                  : step > 2
                  ? "bg-brand-500/20 text-brand-400 border-brand-500"
                  : "bg-pitch-900 border-pitch-700 text-pitch-500"
              }`}
            >
              2
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Team Info</span>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => step >= 3 && setStep(3)}
            className={`flex flex-col items-center gap-2 z-10 ${
              step >= 3 ? "text-brand-400 cursor-pointer" : "text-pitch-600"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                step === 3
                  ? "bg-brand-500 text-pitch-950 border-white shadow-lg shadow-brand-500/30 scale-110"
                  : step > 3
                  ? "bg-brand-500/20 text-brand-400 border-brand-500"
                  : "bg-pitch-900 border-pitch-700 text-pitch-500"
              }`}
            >
              3
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Add 11+ Players</span>
          </div>
        </div>

        {/* Global Notifications */}
        {message && (
          <div className="mb-6 p-4 rounded-xl bg-brand-500/20 border border-brand-400/50 text-brand-300 text-sm font-semibold flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-brand-400 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-pulse-red/20 border border-pulse-red/50 text-pulse-red text-sm font-semibold flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-pulse-red flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Teams Overview & Init */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold text-white uppercase tracking-wider">
                  Created Custom Teams
                </h2>
                <p className="text-xs text-pitch-400">
                  Select a team to load on the main pitch, or click Create Team to build a new squad step-by-step.
                </p>
              </div>
              <button
                onClick={() => setStep(2)}
                className="bg-brand-500 hover:bg-brand-400 text-pitch-950 font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2 text-xs uppercase tracking-wider"
              >
                <PlusCircle className="w-4 h-4" /> Create New Team
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
              </div>
            ) : customTeams.length === 0 ? (
              <div className="bg-pitch-950/60 border border-pitch-800 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4">
                <Shield className="w-16 h-16 text-pitch-700" />
                <div>
                  <h3 className="text-lg font-bold text-white">No custom teams created yet</h3>
                  <p className="text-xs text-pitch-500 mt-1 max-w-md">
                    Start by clicking "Create New Team" to build your custom club, specify information, and register 11+ players with full analytics data.
                  </p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="mt-2 bg-brand-500 hover:bg-brand-400 text-pitch-950 font-bold px-6 py-3 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" /> Start Step-by-Step Creation
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customTeams.map((team) => (
                  <div
                    key={team._id || team.idTeam}
                    className="bg-pitch-950 border border-pitch-800 hover:border-brand-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all group"
                  >
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-pitch-900 border border-pitch-700 p-2 flex items-center justify-center flex-shrink-0">
                          {team.badgeUrl || team.strTeamBadge ? (
                            <img
                              src={team.badgeUrl || team.strTeamBadge}
                              alt=""
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <Shield className="w-8 h-8 text-brand-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base truncate group-hover:text-brand-300">
                            {team.name || team.strTeam}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px] text-pitch-400 mt-0.5">
                            <Users className="w-3.5 h-3.5 text-brand-400" />
                            <span>{team.playerCount || 11}+ Players</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t border-pitch-850 pt-4 mt-2">
                      <button
                        onClick={() => handleLoadTeamToPitch(team)}
                        className="flex-1 bg-brand-500/20 hover:bg-brand-500 text-brand-300 hover:text-pitch-950 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 border border-brand-500/30"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Load to Pitch
                      </button>
                      <button
                        onClick={() => handleDeleteCustomTeam(team._id || team.idTeam)}
                        className="p-2 bg-pitch-900 hover:bg-pulse-red/20 text-pitch-400 hover:text-pulse-red rounded-xl border border-pitch-800 transition-colors"
                        title="Delete Team"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Team Information */}
        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!teamName.trim()) return;
              setStep(3);
            }}
            className="space-y-6 max-w-2xl mx-auto"
          >
            <div className="text-center mb-6">
              <Shield className="w-12 h-12 text-brand-400 mx-auto mb-2" />
              <h2 className="text-xl font-display font-bold text-white uppercase tracking-wider">
                Step 2: Team Information
              </h2>
              <p className="text-xs text-pitch-400">Specify details for your new custom team</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-pitch-400 uppercase tracking-wider block mb-1.5">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Neo Tokyo FC, Golden Lions..."
                  className="w-full px-4 py-3 bg-pitch-950 border border-pitch-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-pitch-400 uppercase tracking-wider block mb-1.5">
                  League Selection
                </label>
                <select
                  value={teamLeague}
                  onChange={(e) => setTeamLeague(e.target.value)}
                  className="w-full px-4 py-3 bg-pitch-950 border border-pitch-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="No League / Custom Teams">No League / Standalone Custom Team</option>
                  {leagues.map((l) => (
                    <option key={l._id || l.sourceId} value={l.name}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-pitch-500 mt-1">
                  Selecting "No League" makes this team independently loadable across Pitch View & Team Stats.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-pitch-400 uppercase tracking-wider block mb-1.5">
                  Team Badge Logo URL (Optional)
                </label>
                <input
                  type="url"
                  value={teamBadge}
                  onChange={(e) => setTeamBadge(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-3 bg-pitch-950 border border-pitch-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-pitch-400 uppercase tracking-wider block mb-1.5">
                  Home Stadium Name (Optional)
                </label>
                <input
                  type="text"
                  value={teamStadium}
                  onChange={(e) => setTeamStadium(e.target.value)}
                  placeholder="e.g. Grand Taqtiq Arena"
                  className="w-full px-4 py-3 bg-pitch-950 border border-pitch-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-pitch-800">
              <button
                type="submit"
                className="bg-brand-500 hover:bg-brand-400 text-pitch-950 font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2 text-sm uppercase tracking-wider"
              >
                Proceed to Add Players <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Roster Creation (11+ Players) */}
        {step === 3 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between bg-pitch-950 p-4 rounded-2xl border border-pitch-800">
              <div>
                <h2 className="text-lg font-display font-bold text-white uppercase tracking-wider">
                  Step 3: Build Squad Roster ({teamName})
                </h2>
                <p className="text-xs text-pitch-400">
                  Add 11 or more players with full attributes required for database & ML analytics.
                </p>
              </div>
              <div
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                  roster.length >= 11
                    ? "bg-brand-500/20 border-brand-400 text-brand-300"
                    : "bg-pulse-amber/20 border-pulse-amber text-pulse-amber"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{roster.length} / 11 Players Added</span>
              </div>
            </div>

            {/* Player Input Form & Stats */}
            <form onSubmit={handleAddPlayerToDraft} className="bg-pitch-950/60 p-6 rounded-2xl border border-pitch-800 space-y-6">
              <div className="flex items-center justify-between border-b border-pitch-800 pb-3">
                <div className="flex items-center gap-2 text-brand-400 font-bold text-sm uppercase tracking-wider">
                  <User className="w-4 h-4" /> Add Player to {teamName}
                </div>

                <button
                  type="button"
                  onClick={() => setShowImagePicker(true)}
                  className="bg-pitch-800 hover:bg-pitch-700 text-brand-300 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border border-pitch-700 transition-colors"
                >
                  <Image className="w-4 h-4" /> Select Image from Existing Teams
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-pitch-400 tracking-wider block mb-1">Player Name *</label>
                  <input
                    type="text"
                    required
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. Carlos Silva"
                    className="w-full px-3 py-2 bg-pitch-900 border border-pitch-700 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-pitch-400 tracking-wider block mb-1">Position</label>
                  <select
                    value={playerPosition}
                    onChange={(e) => setPlayerPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-pitch-900 border border-pitch-700 rounded-lg text-xs text-white"
                  >
                    <option value="ST">ST - Striker</option>
                    <option value="LW">LW - Left Wing</option>
                    <option value="RW">RW - Right Wing</option>
                    <option value="CAM">CAM - Attacking Mid</option>
                    <option value="CM">CM - Central Mid</option>
                    <option value="CDM">CDM - Defensive Mid</option>
                    <option value="LB">LB - Left Back</option>
                    <option value="CB">CB - Center Back</option>
                    <option value="RB">RB - Right Back</option>
                    <option value="GK">GK - Goalkeeper</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-pitch-400 tracking-wider block mb-1">Nationality</label>
                  <input
                    type="text"
                    value={playerNat}
                    onChange={(e) => setPlayerNat(e.target.value)}
                    placeholder="e.g. Argentina, Brazil, Spain"
                    className="w-full px-3 py-2 bg-pitch-900 border border-pitch-700 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-pitch-400 tracking-wider block mb-1">Age</label>
                  <input
                    type="number"
                    min="16"
                    max="45"
                    value={playerAge}
                    onChange={(e) => setPlayerAge(e.target.value)}
                    className="w-full px-3 py-2 bg-pitch-900 border border-pitch-700 rounded-lg text-xs text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-pitch-400 tracking-wider block mb-1">Photo Image URL</label>
                  <input
                    type="text"
                    value={playerPhoto}
                    onChange={(e) => setPlayerPhoto(e.target.value)}
                    placeholder="https://... or click 'Select Image from Existing Teams'"
                    className="w-full px-3 py-2 bg-pitch-900 border border-pitch-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              {/* Stats Sliders for ML Models */}
              <div>
                <label className="text-[11px] font-bold text-brand-300 uppercase tracking-wider block mb-3">
                  ML Performance Attributes & Stats (0 - 99)
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {Object.keys(stats).map((st) => (
                    <div key={st} className="bg-pitch-900 p-2.5 rounded-lg border border-pitch-800 flex flex-col gap-1">
                      <div className="flex justify-between items-center text-xs font-bold text-pitch-300 uppercase">
                        <span>{st}</span>
                        <span className="text-brand-400">{stats[st]}</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="99"
                        value={stats[st]}
                        onChange={(e) => handleStatChange(st, e.target.value)}
                        className="w-full accent-brand-500 h-1.5 rounded-lg cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-brand-500 hover:bg-brand-400 text-pitch-950 font-bold px-6 py-2.5 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" /> Add Player to Roster
                </button>
              </div>
            </form>

            {/* Roster List Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                  Current Squad Roster ({roster.length} Players)
                </h3>
                {roster.length >= 11 ? (
                  <span className="text-xs text-brand-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Ready to finalize team
                  </span>
                ) : (
                  <span className="text-xs text-pulse-amber font-semibold">
                    Add {11 - roster.length} more player(s) to finish creation
                  </span>
                )}
              </div>

              {roster.length === 0 ? (
                <div className="p-8 text-center bg-pitch-950 border border-pitch-800 rounded-xl text-xs text-pitch-500">
                  No players added yet. Use the form above to add players to your team roster.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                  {roster.map((player, idx) => (
                    <div
                      key={player.tempId}
                      className="bg-pitch-950 border border-pitch-800 p-3 rounded-xl flex items-center justify-between hover:border-pitch-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pitch-900 border border-pitch-700 overflow-hidden flex items-center justify-center text-brand-400 font-bold text-xs">
                          {player.photoUrl ? (
                            <img src={player.photoUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            player.name[0]
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs truncate max-w-[120px]">
                            {player.name}
                          </div>
                          <div className="text-[10px] text-pitch-400 flex items-center gap-1.5 mt-0.5">
                            <span className="bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded font-bold">
                              {player.position}
                            </span>
                            <span>{player.overallRating} OVR</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveFromDraft(player.tempId)}
                        className="p-1.5 text-pitch-500 hover:text-pulse-red hover:bg-pulse-red/10 rounded-lg transition-colors"
                        title="Remove Player"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Finalize Button */}
            <div className="flex justify-between items-center pt-6 border-t border-pitch-800">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-pitch-800 hover:bg-pitch-700 text-pitch-300 text-xs font-bold rounded-xl transition-all"
              >
                Back to Team Info
              </button>

              <button
                onClick={handleSaveFullTeam}
                disabled={roster.length < 11 || loading}
                className={`px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-xl ${
                  roster.length >= 11 && !loading
                    ? "bg-gradient-to-r from-brand-500 to-brand-400 text-pitch-950 hover:brightness-110 shadow-brand-500/20"
                    : "bg-pitch-800 text-pitch-500 cursor-not-allowed border border-pitch-700"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                {loading ? "Saving Team & Roster..." : `Finalize & Create Team (${roster.length} Players)`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Picker Modal */}
      {showImagePicker && (
        <PlayerImagePickerModal
          onSelectPlayerImage={handlePickImage}
          onClose={() => setShowImagePicker(false)}
        />
      )}
    </div>
  );
}
