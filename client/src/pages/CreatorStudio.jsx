import React, { useState, useEffect } from "react";
import api, { getLeagues, getTeams } from "../services/api";
import { PlusCircle, Save, Shield, User, Search, Edit3, XCircle } from "lucide-react";
import PlayerSearchModal from "../components/modal/PlayerSearchModal";

export default function CreatorStudio() {
  const [activeTab, setActiveTab] = useState("player"); // 'player' or 'team'
  
  // Player Form State
  const [playerName, setPlayerName] = useState("");
  const [playerPosition, setPlayerPosition] = useState("ST");
  const [playerNat, setPlayerNat] = useState("");
  const [playerAge, setPlayerAge] = useState(25);
  const [playerPhoto, setPlayerPhoto] = useState("");
  const [playerTeamId, setPlayerTeamId] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [stats, setStats] = useState({
    pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75
  });

  // Team Form State
  const [teamName, setTeamName] = useState("");
  const [teamLeague, setTeamLeague] = useState("");
  const [teamBadge, setTeamBadge] = useState("");
  
  // Data State
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // The club list used to be pinned to a hardcoded league name that does not
  // exist in the EA FC dataset, so the dropdown was always empty.
  useEffect(() => {
    getLeagues()
      .then((data) => {
        const list = data.leagues || [];
        setLeagues(list);
        if (list.length) setSelectedLeague(list[0].name);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedLeague) return;
    getTeams(selectedLeague)
      .then((data) => setTeams(data.teams || []))
      .catch(() => setTeams([]));
  }, [selectedLeague]);

  const handleStatChange = (stat, value) => {
    setStats(prev => ({ ...prev, [stat]: Number(value) }));
  };

  const submitPlayer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const payload = {
        name: playerName,
        position: playerPosition,
        nationality: playerNat,
        age: playerAge,
        photoUrl: playerPhoto,
        teamId: playerTeamId,
        stats
      };
      if (editingPlayerId) {
        await api.put(`/players/${editingPlayerId}`, payload);
        setMessage(`Successfully updated player: ${playerName}!`);
      } else {
        await api.post("/players", payload);
        setMessage(`Successfully created player: ${playerName}!`);
      }
      setPlayerName("");
      setPlayerPhoto("");
      setEditingPlayerId(null);
    } catch (err) {
      console.error(err);
      setMessage(editingPlayerId ? "Failed to update player." : "Failed to create player.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlayerToEdit = (player) => {
    setEditingPlayerId(player._id || player.sourceId);
    setPlayerName(player.name || "");
    setPlayerPosition(player.position || "ST");
    setPlayerNat(player.nationality || "");
    setPlayerAge(player.age || 25);
    setPlayerPhoto(player.thumbnail || player.photoUrl || "");
    setPlayerTeamId(player.teamId || "");
    if (player.stats) {
      setStats({
        pace: player.stats.pace || 75,
        shooting: player.stats.shooting || 75,
        passing: player.stats.passing || 75,
        dribbling: player.stats.dribbling || 75,
        defending: player.stats.defending || 75,
        physical: player.stats.physical || 75,
      });
    }
  };

  const cancelEdit = () => {
    setEditingPlayerId(null);
    setPlayerName("");
    setPlayerPosition("ST");
    setPlayerNat("");
    setPlayerAge(25);
    setPlayerPhoto("");
    setPlayerTeamId("");
    setStats({
      pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75
    });
  };

  const submitTeam = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const payload = {
        name: teamName,
        league: teamLeague,
        badgeUrl: teamBadge
      };
      await api.post("/teams", payload);
      setMessage(`Successfully created team: ${teamName}!`);
      setTeamName("");
      setTeamLeague("");
      setTeamBadge("");
    } catch (err) {
      console.error(err);
      setMessage("Failed to create team.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-pitch-950 overflow-y-auto">
      <div className="w-full max-w-4xl bg-pitch-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <PlusCircle className="w-8 h-8 text-brand-400" />
          <h1 className="text-3xl font-display font-bold uppercase tracking-widest text-white shadow-text">
            Creator Studio
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-pitch-700 mb-8">
          <button
            onClick={() => setActiveTab("player")}
            className={`flex items-center gap-2 px-6 py-3 font-display uppercase tracking-widest text-sm transition-colors ${
              activeTab === "player"
                ? "text-brand-400 border-b-2 border-brand-400"
                : "text-pitch-400 hover:text-white"
            }`}
          >
            <User className="w-4 h-4" /> Create/Edit Player
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={`flex items-center gap-2 px-6 py-3 font-display uppercase tracking-widest text-sm transition-colors ${
              activeTab === "team"
                ? "text-brand-400 border-b-2 border-brand-400"
                : "text-pitch-400 hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4" /> Create Team
          </button>
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-brand-500/20 border border-brand-400/50 text-brand-300 font-medium">
            {message}
          </div>
        )}

        {/* Create Player Form */}
        {activeTab === "player" && (
          <form onSubmit={submitPlayer} className="space-y-6">
            <div className="flex items-center justify-between bg-pitch-950/50 p-4 rounded-xl border border-pitch-800">
              <div className="flex items-center gap-3">
                {editingPlayerId ? (
                  <div className="flex items-center gap-2 text-brand-400 font-bold uppercase tracking-wide text-sm">
                    <Edit3 className="w-5 h-5" /> Editing: {playerName}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wide text-sm">
                    <PlusCircle className="w-5 h-5 text-brand-500" /> New Player
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {editingPlayerId && (
                  <button type="button" onClick={cancelEdit} className="btn-secondary px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Cancel
                  </button>
                )}
                <button type="button" onClick={() => setShowSearchModal(true)} className="btn-secondary px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2">
                  <Search className="w-4 h-4" /> Search to Edit
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">Player Name</label>
                <input required type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} className="input-field" placeholder="e.g. Lionel Messi" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">Position</label>
                <select value={playerPosition} onChange={e => setPlayerPosition(e.target.value)} className="input-field">
                  <option value="ST">ST</option>
                  <option value="LW">LW</option>
                  <option value="RW">RW</option>
                  <option value="CAM">CAM</option>
                  <option value="CM">CM</option>
                  <option value="CDM">CDM</option>
                  <option value="LB">LB</option>
                  <option value="CB">CB</option>
                  <option value="RB">RB</option>
                  <option value="GK">GK</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">Nationality</label>
                <input type="text" value={playerNat} onChange={e => setPlayerNat(e.target.value)} className="input-field" placeholder="e.g. Argentina" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">League</label>
                <select value={selectedLeague} onChange={e => setSelectedLeague(e.target.value)} className="input-field bg-pitch-900 text-white">
                  {leagues.map(l => (
                    <option key={l._id || l.sourceId} value={l.name}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">Team (Optional)</label>
                <select value={playerTeamId} onChange={e => setPlayerTeamId(e.target.value)} className="input-field bg-pitch-900 text-white">
                  <option value="">Free Agent</option>
                  {teams.map(t => (
                    <option key={t.idTeam} value={t.idTeam}>{t.strTeam}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2 col-span-2">
                <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">Photo URL</label>
                <input type="url" value={playerPhoto} onChange={e => setPlayerPhoto(e.target.value)} className="input-field" placeholder="https://example.com/photo.png" />
              </div>
            </div>

            <div className="h-[1px] w-full bg-pitch-700 my-8" />
            <h3 className="font-display text-xl text-white mb-4">EA FC Attributes</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {Object.keys(stats).map(stat => (
                <div key={stat} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs uppercase font-bold text-pitch-300">{stat}</label>
                    <span className="font-display font-bold text-gold-400 text-lg">{stats[stat]}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" max="99" 
                    value={stats[stat]} 
                    onChange={e => handleStatChange(stat, e.target.value)}
                    className="w-full accent-brand-500"
                  />
                </div>
              ))}
            </div>

            <button type="submit" disabled={loading} className="mt-8 w-full btn-primary py-4 text-lg font-bold flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              {loading ? "Saving..." : "Create Custom Player"}
            </button>
          </form>
        )}

        {/* Create Team Form */}
        {activeTab === "team" && (
          <form onSubmit={submitTeam} className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">Club Name</label>
              <input required type="text" value={teamName} onChange={e => setTeamName(e.target.value)} className="input-field" placeholder="e.g. AFC Richmond" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">League Name</label>
              <input type="text" value={teamLeague} onChange={e => setTeamLeague(e.target.value)} className="input-field" placeholder="e.g. Premier League" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">Badge URL (Optional)</label>
              <input type="url" value={teamBadge} onChange={e => setTeamBadge(e.target.value)} className="input-field" placeholder="https://example.com/badge.png" />
            </div>
            
            <button type="submit" disabled={loading} className="mt-8 w-full btn-primary py-4 text-lg font-bold flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              {loading ? "Saving..." : "Create Custom Club"}
            </button>
          </form>
        )}
      </div>
      {showSearchModal && (
        <PlayerSearchModal 
          onClose={() => setShowSearchModal(false)}
          onSelect={handleSelectPlayerToEdit}
        />
      )}
    </div>
  );
}
