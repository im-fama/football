import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

const SquadContext = createContext(null);

export function SquadProvider({ children }) {
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [selectedTeamBadge, setSelectedTeamBadge] = useState("");

  const [formation, setFormation] = useState("4-3-3");
  const [slots, setSlots] = useState([]);
  const [starters, setStarters] = useState({}); // slotCode -> player
  const [bench, setBench] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [drawingMode, setDrawingMode] = useState(null); // 'pen' | 'laser' | 'eraser' | null
  const [strokeColor, setStrokeColor] = useState("#4ade80");

  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch initial leagues
  useEffect(() => {
    api.getLeagues()
      .then((data) => {
        setLeagues(data.leagues || []);
        if (data.leagues?.length) {
          setSelectedLeague(data.leagues[0].strLeague);
        }
      })
      .catch((err) => {
        console.error("Failed to load leagues:", err.message);
      });
  }, []);

  // Fetch teams when league changes
  useEffect(() => {
    if (!selectedLeague) return;
    api.getTeams(selectedLeague)
      .then((data) => {
        setTeams(data.teams || []);
        if (data.teams?.length) {
          setSelectedTeamId(data.teams[0].idTeam);
          setSelectedTeamName(data.teams[0].strTeam);
          setSelectedTeamBadge(data.teams[0].strTeamBadge);
        }
      })
      .catch(() => {
        setTeams([]);
      });
  }, [selectedLeague]);

  // Load squad
  const loadSquad = useCallback(async (teamId, formationName = "4-3-3") => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/teams/${teamId}/squad?formation=${formationName}`).then(r => r.data);
      setFormation(data.formation);
      setSlots(data.slots || []);
      setStarters(data.starters || {});
      setBench(data.bench || []);
      setDrawings([]);
    } catch (err) {
      setError("Failed to load squad from database. Make sure it is seeded.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadSquad(selectedTeamId, formation);
    }
  }, [selectedTeamId, formation, loadSquad]);

  // Actions
  const substitute = (benchPlayerId, slotCode) => {
    const benchPlayer = bench.find(p => p._id === benchPlayerId);
    const existingStarter = starters[slotCode];

    if (!benchPlayer) return;

    setStarters(prev => ({
      ...prev,
      [slotCode]: benchPlayer
    }));

    setBench(prev => {
      const filtered = prev.filter(p => p._id !== benchPlayerId);
      if (existingStarter) {
        return [...filtered, existingStarter];
      }
      return filtered;
    });
  };

  const swapStarters = (slotCodeA, slotCodeB) => {
    const playerA = starters[slotCodeA];
    const playerB = starters[slotCodeB];

    setStarters(prev => ({
      ...prev,
      [slotCodeA]: playerB,
      [slotCodeB]: playerA
    }));
  };

  const removeStarter = (slotCode) => {
    const player = starters[slotCode];
    if (!player) return;

    setStarters(prev => {
      const updated = { ...prev };
      delete updated[slotCode];
      return updated;
    });

    setBench(prev => [...prev, player]);
  };

  return (
    <SquadContext.Provider value={{
      leagues,
      teams,
      selectedLeague,
      setSelectedLeague,
      selectedTeamId,
      setSelectedTeamId,
      selectedTeamName,
      setSelectedTeamName,
      selectedTeamBadge,
      setSelectedTeamBadge,
      formation,
      setFormation,
      slots,
      starters,
      bench,
      setBench,
      setStarters,
      drawings,
      setDrawings,
      drawingMode,
      setDrawingMode,
      strokeColor,
      setStrokeColor,
      loading,
      error,
      substitute,
      swapStarters,
      removeStarter,
      loadSquad
    }}>
      {children}
    </SquadContext.Provider>
  );
}

export function useSquad() {
  const ctx = useContext(SquadContext);
  if (!ctx) throw new Error("useSquad must be used inside SquadProvider");
  return ctx;
}
