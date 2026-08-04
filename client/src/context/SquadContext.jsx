import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getLeagues, getTeams, getFormations, getSquad, getDatasetStatus } from "../services/api";

const SquadContext = createContext(null);

export function SquadProvider({ children }) {
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [selectedTeamBadge, setSelectedTeamBadge] = useState("");

  const [formation, setFormation] = useState("4-3-3");
  const [availableFormations, setAvailableFormations] = useState(["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "5-3-2", "Custom"]);
  const [slots, setSlots] = useState([]);
  const [starters, setStarters] = useState({}); // slotCode -> player
  const [bench, setBench] = useState([]);

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [drawings, setDrawings] = useState([]);
  const [drawingMode, setDrawingMode] = useState(null); // 'pen' | 'laser' | 'eraser' | null
  const [strokeColor, setStrokeColor] = useState("#4ade80");

  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // The API loads ~20k players from the CSV dumps on first boot. Until that
  // finishes every squad request would 404, so we gate the whole app on it.
  const [dataset, setDataset] = useState({ state: "checking", ready: false, phase: null, detail: null });
  const pollTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const status = await getDatasetStatus();
        if (cancelled) return;
        setDataset(status);
        if (!status.ready) {
          pollTimer.current = setTimeout(poll, 2000);
        }
      } catch (err) {
        if (cancelled) return;
        setDataset({
          state: "unreachable",
          ready: false,
          error: "Cannot reach the taqtiq API on :5000. Is the server running?"
        });
        pollTimer.current = setTimeout(poll, 4000);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  // Fetch leagues and formations once the dataset is available
  useEffect(() => {
    if (!dataset.ready) return;

    getLeagues()
      .then((data) => {
        const lList = data.leagues || [];
        setLeagues(lList);
        if (!lList.length) return;
        // Alphabetically first is a tiny Danish division; open on a headline
        // competition, falling back to whichever has the most clubs.
        const preferred =
          lList.find((l) => l.name === "Premier League") ||
          [...lList].sort((a, b) => (b.teamCount || 0) - (a.teamCount || 0))[0];
        setSelectedLeague((prev) => prev || preferred.name || preferred.strLeague || "");
      })
      .catch((err) => console.error("Failed to load leagues:", err.message));

    getFormations()
      .then((data) => {
        if (data.formations && data.formations.length > 0) {
          const names = data.formations.map((f) => f.name);
          if (!names.includes("Custom")) names.push("Custom");
          setAvailableFormations(names);
        }
      })
      .catch((err) => console.error("Failed to load formations:", err.message));
  }, [dataset.ready]);

  // Fetch teams when league changes
  useEffect(() => {
    if (!selectedLeague) return;
    getTeams(selectedLeague)
      .then((data) => {
        const tList = data.teams || [];
        setTeams(tList);
        if (tList.length) {
          const first = tList[0];
          setSelectedTeamId(first.idTeam || first.sourceId || first._id);
          setSelectedTeamName(first.strTeam || first.name || "");
          setSelectedTeamBadge(first.strTeamBadge || first.badgeUrl || "");
        } else {
          setSelectedTeamId("");
        }
      })
      .catch(() => setTeams([]));
  }, [selectedLeague]);

  // Load squad
  const loadSquad = useCallback(async (teamId, formationName = "4-3-3") => {
    setLoading(true);
    setError("");
    try {
      const data = await getSquad(teamId, formationName);
      setFormation(data.formation);
      setSlots(data.slots || []);
      setStarters(data.starters || {});
      setBench(data.bench || []);
      setDrawings([]);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load squad from the database.");
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
    const benchPlayer = bench.find((p) => p._id === benchPlayerId);
    const existingStarter = starters[slotCode];

    if (!benchPlayer) return;

    // Prevent non-managers from going into the MGR slot and vice versa
    const isBenchManager = benchPlayer.position === "MGR" || benchPlayer.position === "COACH";
    if (slotCode === "MGR" && !isBenchManager) return;
    if (slotCode !== "MGR" && isBenchManager) return;

    setStarters((prev) => ({ ...prev, [slotCode]: benchPlayer }));

    setBench((prev) => {
      const filtered = prev.filter((p) => p._id !== benchPlayerId);
      return existingStarter ? [...filtered, existingStarter] : filtered;
    });
  };

  const swapStarters = (slotCodeA, slotCodeB) => {
    if (slotCodeA === "MGR" || slotCodeB === "MGR") return;

    const playerA = starters[slotCodeA];
    const playerB = starters[slotCodeB];

    setStarters((prev) => {
      const next = { ...prev };
      if (playerB) next[slotCodeA] = playerB;
      else delete next[slotCodeA];
      if (playerA) next[slotCodeB] = playerA;
      else delete next[slotCodeB];
      return next;
    });
  };

  const removeStarter = (slotCode) => {
    const player = starters[slotCode];
    if (!player) return;

    setStarters((prev) => {
      const updated = { ...prev };
      delete updated[slotCode];
      return updated;
    });

    setBench((prev) => [...prev, player]);
  };

  /** Drop a specific player into a slot (used by the slot search modal). */
  const updateStarter = (slotCode, player) => {
    if (!slotCode || !player) return;
    const displaced = starters[slotCode];
    setStarters((prev) => ({ ...prev, [slotCode]: player }));
    setBench((prev) => {
      const withoutIncoming = prev.filter((p) => p._id !== player._id);
      return displaced ? [...withoutIncoming, displaced] : withoutIncoming;
    });
  };

  const updateSlotPosition = (slotCode, x, y) => {
    setSlots((prev) => prev.map((slot) => (slot.code === slotCode ? { ...slot, x, y } : slot)));
  };

  return (
    <SquadContext.Provider
      value={{
        dataset,
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
        availableFormations,
        slots,
        setSlots,
        starters,
        bench,
        setBench,
        setStarters,
        searchResults,
        setSearchResults,
        isSearching,
        setIsSearching,
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
        updateStarter,
        loadSquad,
        updateSlotPosition
      }}
    >
      {children}
    </SquadContext.Provider>
  );
}

export function useSquad() {
  const ctx = useContext(SquadContext);
  if (!ctx) throw new Error("useSquad must be used inside SquadProvider");
  return ctx;
}
