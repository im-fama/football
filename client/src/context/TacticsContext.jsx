import { createContext, useContext, useReducer, useCallback } from "react";
import {
  ALL_PLAYERS,
  FORMATIONS,
  DEFAULT_LINEUP,
  INITIAL_TACTICS,
  UPCOMING_MATCHES,
} from "../data/mockData";

// ── Build initial pitch / bench split from DEFAULT_LINEUP ──────────────────
function buildInitialState() {
  const formation = DEFAULT_LINEUP.formation;
  const slots = FORMATIONS[formation].positions;
  const onPitchIds = new Set(Object.values(DEFAULT_LINEUP.slots));

  // Pitch players: assign x/y from formation slot
  const pitchPlayers = Object.entries(DEFAULT_LINEUP.slots).map(([slotIdx, playerId]) => {
    const player = ALL_PLAYERS.find((p) => p.id === playerId);
    const slot = slots[Number(slotIdx)];
    return {
      ...player,
      pitchX: slot.x,
      pitchY: slot.y,
      slotLabel: slot.slot,
    };
  });

  // Bench: everyone not on pitch
  const benchPlayers = ALL_PLAYERS.filter((p) => !onPitchIds.has(p.id));

  return {
    formation,
    pitchPlayers,
    benchPlayers,
    flipped: false,
    drawingMode: null, // "arrow" | "line" | "zone" | null
    drawings: [],
    currentDrawing: null,
    savedTactics: INITIAL_TACTICS,
    upcomingMatches: UPCOMING_MATCHES,
    allPlayers: [...ALL_PLAYERS],
    theme: "dark",
    formations: { ...FORMATIONS },
    ballPosition: { x: 50, y: 50 },
  };
}

// ── Reducer ────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {

    // Move an on-pitch player to a new x/y position
    case "MOVE_PITCH_PLAYER": {
      const { id, x, y } = action.payload;
      return {
        ...state,
        pitchPlayers: state.pitchPlayers.map((p) =>
          p.id === id ? { ...p, pitchX: x, pitchY: y } : p
        ),
      };
    }

    case "MOVE_BALL": {
      return {
        ...state,
        ballPosition: { x: action.payload.x, y: action.payload.y }
      };
    }

    // Swap two on-pitch players
    case "SWAP_PITCH_PLAYERS": {
      const { idA, idB } = action.payload;
      const pA = state.pitchPlayers.find((p) => p.id === idA);
      const pB = state.pitchPlayers.find((p) => p.id === idB);
      return {
        ...state,
        pitchPlayers: state.pitchPlayers.map((p) => {
          if (p.id === idA) return { ...p, pitchX: pB.pitchX, pitchY: pB.pitchY, slotLabel: pB.slotLabel };
          if (p.id === idB) return { ...p, pitchX: pA.pitchX, pitchY: pA.pitchY, slotLabel: pA.slotLabel };
          return p;
        }),
      };
    }

    // Move a bench player onto the pitch
    case "BENCH_TO_PITCH": {
      const { playerId, x, y } = action.payload;
      const player = state.benchPlayers.find((p) => p.id === playerId);
      if (!player) return state;
      return {
        ...state,
        pitchPlayers: [...state.pitchPlayers, { ...player, pitchX: x, pitchY: y, slotLabel: player.position }],
        benchPlayers: state.benchPlayers.filter((p) => p.id !== playerId),
      };
    }

    // Swap bench player with pitch player
    case "SWAP_BENCH_PITCH": {
      const { benchPlayerId, pitchPlayerId } = action.payload;
      const benchPlayer = state.benchPlayers.find((p) => p.id === benchPlayerId);
      const pitchPlayer = state.pitchPlayers.find((p) => p.id === pitchPlayerId);
      if (!benchPlayer || !pitchPlayer) return state;

      const newPitchPlayers = state.pitchPlayers.map((p) => {
        if (p.id === pitchPlayerId) {
          return {
            ...benchPlayer,
            pitchX: pitchPlayer.pitchX,
            pitchY: pitchPlayer.pitchY,
            slotLabel: pitchPlayer.slotLabel,
          };
        }
        return p;
      });

      const newBenchPlayers = state.benchPlayers.filter((p) => p.id !== benchPlayerId);
      // eslint-disable-next-line no-unused-vars
      const { pitchX, pitchY, slotLabel, ...pitchPlayerRest } = pitchPlayer;
      newBenchPlayers.push(pitchPlayerRest);

      return {
        ...state,
        pitchPlayers: newPitchPlayers,
        benchPlayers: newBenchPlayers,
      };
    }

    // Move an on-pitch player to bench (substitute off)
    case "PITCH_TO_BENCH": {
      const { playerId } = action.payload;
      const player = state.pitchPlayers.find((p) => p.id === playerId);
      if (!player) return state;
      // eslint-disable-next-line no-unused-vars
      const { pitchX, pitchY, slotLabel, ...rest } = player;
      return {
        ...state,
        pitchPlayers: state.pitchPlayers.filter((p) => p.id !== playerId),
        benchPlayers: [...state.benchPlayers, rest],
      };
    }

    // Apply a formation preset
    case "APPLY_FORMATION": {
      const { formation } = action.payload;
      const slots = state.formations[formation]?.positions;
      if (!slots) return state;

      // Try to preserve current pitch players mapped to new slots by position priority
      const allOnField = [...state.pitchPlayers];
      const newPitchPlayers = slots.map((slot, i) => {
        const existing = allOnField[i];
        if (existing) return { ...existing, pitchX: slot.x, pitchY: slot.y, slotLabel: slot.slot };
        return null;
      }).filter(Boolean);

      // Players that got bumped go to bench
      const keptIds = new Set(newPitchPlayers.map((p) => p.id));
      const bumped = state.pitchPlayers.filter((p) => !keptIds.has(p.id)).map(
        // eslint-disable-next-line no-unused-vars
        ({ pitchX, pitchY, slotLabel, ...rest }) => rest
      );

      return {
        ...state,
        formation,
        pitchPlayers: newPitchPlayers,
        benchPlayers: [...state.benchPlayers, ...bumped],
      };
    }

    case "RESET_BOARD": {
      return buildInitialState();
    }

    case "FLIP_PITCH": {
      return {
        ...state,
        flipped: !state.flipped,
        pitchPlayers: state.pitchPlayers.map((p) => ({
          ...p,
          pitchY: 100 - p.pitchY,
        })),
      };
    }

    case "SET_DRAWING_MODE": {
      return { ...state, drawingMode: action.payload };
    }

    case "ADD_DRAWING": {
      return { ...state, drawings: [...state.drawings, action.payload] };
    }

    case "UNDO_DRAWING": {
      return { ...state, drawings: state.drawings.slice(0, -1) };
    }

    case "CLEAR_DRAWINGS": {
      return { ...state, drawings: [] };
    }

    case "SET_CURRENT_DRAWING": {
      return { ...state, currentDrawing: action.payload };
    }

    case "SAVE_TACTIC": {
      const tactic = action.payload;
      const exists = state.savedTactics.find((t) => t.id === tactic.id);
      return {
        ...state,
        savedTactics: exists
          ? state.savedTactics.map((t) => (t.id === tactic.id ? tactic : t))
          : [...state.savedTactics, tactic],
      };
    }

    case "DELETE_TACTIC": {
      return {
        ...state,
        savedTactics: state.savedTactics.filter((t) => t.id !== action.payload),
      };
    }

    case "LOAD_TACTIC": {
      const tactic = state.savedTactics.find((t) => t.id === action.payload);
      if (!tactic) return state;
      // Re-use APPLY_FORMATION logic
      return reducer(state, { type: "APPLY_FORMATION", payload: { formation: tactic.formation } });
    }

    case "SAVE_MATCH_LINEUP": {
      const { matchId, lineup } = action.payload;
      return {
        ...state,
        upcomingMatches: state.upcomingMatches.map((m) =>
          m.id === matchId ? { ...m, savedLineup: lineup } : m
        ),
      };
    }

    case "LOAD_MATCH_LINEUP": {
      const match = state.upcomingMatches.find((m) => m.id === action.payload);
      if (!match?.savedLineup) return state;
      return { ...state, ...match.savedLineup };
    }

    case "ADD_PLAYER": {
      const player = action.payload;
      return {
        ...state,
        allPlayers: [...state.allPlayers, player],
        benchPlayers: [...state.benchPlayers, player],
      };
    }

    case "UPDATE_PLAYER": {
      const updated = action.payload;
      return {
        ...state,
        allPlayers: state.allPlayers.map((p) => (p.id === updated.id ? updated : p)),
        pitchPlayers: state.pitchPlayers.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
        benchPlayers: state.benchPlayers.map((p) => (p.id === updated.id ? updated : p)),
      };
    }

    case "DELETE_PLAYER": {
      const id = action.payload;
      return {
        ...state,
        allPlayers: state.allPlayers.filter((p) => p.id !== id),
        pitchPlayers: state.pitchPlayers.filter((p) => p.id !== id),
        benchPlayers: state.benchPlayers.filter((p) => p.id !== id),
      };
    }

    case "UPDATE_PLAYER_NOTES": {
      const { playerId, notes } = action.payload;
      return reducer(state, { type: "UPDATE_PLAYER", payload: { ...state.allPlayers.find(p => p.id === playerId), notes } });
    }

    case "UPDATE_PLAYER_INSTRUCTIONS": {
      const { playerId, instructions } = action.payload;
      const player = state.allPlayers.find((p) => p.id === playerId);
      if (!player) return state;
      return reducer(state, { type: "UPDATE_PLAYER", payload: { ...player, instructions } });
    }

    case "ADD_CUSTOM_FORMATION": {
      const { name, positions } = action.payload;
      return {
        ...state,
        formation: name,
        formations: {
          ...state.formations,
          [name]: { label: name, positions },
        },
      };
    }

    case "TOGGLE_THEME": {
      return { ...state, theme: state.theme === "dark" ? "light" : "dark" };
    }

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────
const TacticsContext = createContext(null);

export function TacticsProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, buildInitialState);

  // Convenience action creators
  const actions = {
    moveBall: useCallback((x, y) => dispatch({ type: "MOVE_BALL", payload: { x, y } }), []),
    movePitchPlayer: useCallback((id, x, y) => dispatch({ type: "MOVE_PITCH_PLAYER", payload: { id, x, y } }), []),
    swapPitchPlayers: useCallback((idA, idB) => dispatch({ type: "SWAP_PITCH_PLAYERS", payload: { idA, idB } }), []),
    swapBenchPitch: useCallback((benchPlayerId, pitchPlayerId) => dispatch({ type: "SWAP_BENCH_PITCH", payload: { benchPlayerId, pitchPlayerId } }), []),
    benchToPitch: useCallback((playerId, x, y) => dispatch({ type: "BENCH_TO_PITCH", payload: { playerId, x, y } }), []),
    pitchToBench: useCallback((playerId) => dispatch({ type: "PITCH_TO_BENCH", payload: { playerId } }), []),
    applyFormation: useCallback((formation) => dispatch({ type: "APPLY_FORMATION", payload: { formation } }), []),
    resetBoard: useCallback(() => dispatch({ type: "RESET_BOARD" }), []),
    flipPitch: useCallback(() => dispatch({ type: "FLIP_PITCH" }), []),
    setDrawingMode: useCallback((mode) => dispatch({ type: "SET_DRAWING_MODE", payload: mode }), []),
    addDrawing: useCallback((drawing) => dispatch({ type: "ADD_DRAWING", payload: drawing }), []),
    undoDrawing: useCallback(() => dispatch({ type: "UNDO_DRAWING" }), []),
    clearDrawings: useCallback(() => dispatch({ type: "CLEAR_DRAWINGS" }), []),
    setCurrentDrawing: useCallback((d) => dispatch({ type: "SET_CURRENT_DRAWING", payload: d }), []),
    saveTactic: useCallback((tactic) => dispatch({ type: "SAVE_TACTIC", payload: tactic }), []),
    deleteTactic: useCallback((id) => dispatch({ type: "DELETE_TACTIC", payload: id }), []),
    loadTactic: useCallback((id) => dispatch({ type: "LOAD_TACTIC", payload: id }), []),
    saveMatchLineup: useCallback((matchId, lineup) => dispatch({ type: "SAVE_MATCH_LINEUP", payload: { matchId, lineup } }), []),
    loadMatchLineup: useCallback((matchId) => dispatch({ type: "LOAD_MATCH_LINEUP", payload: matchId }), []),
    addPlayer: useCallback((player) => dispatch({ type: "ADD_PLAYER", payload: player }), []),
    updatePlayer: useCallback((player) => dispatch({ type: "UPDATE_PLAYER", payload: player }), []),
    deletePlayer: useCallback((id) => dispatch({ type: "DELETE_PLAYER", payload: id }), []),
    updatePlayerNotes: useCallback((playerId, notes) => dispatch({ type: "UPDATE_PLAYER_NOTES", payload: { playerId, notes } }), []),
    updatePlayerInstructions: useCallback((playerId, instructions) => dispatch({ type: "UPDATE_PLAYER_INSTRUCTIONS", payload: { playerId, instructions } }), []),
    addCustomFormation: useCallback((name, positions) => dispatch({ type: "ADD_CUSTOM_FORMATION", payload: { name, positions } }), []),
    toggleTheme: useCallback(() => dispatch({ type: "TOGGLE_THEME" }), []),
  };

  return (
    <TacticsContext.Provider value={{ state, actions }}>
      {children}
    </TacticsContext.Provider>
  );
}

export function useTactics() {
  const ctx = useContext(TacticsContext);
  if (!ctx) throw new Error("useTactics must be used inside TacticsProvider");
  return ctx;
}
