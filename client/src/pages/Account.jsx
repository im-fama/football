import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSquad } from "../context/SquadContext";
import { getBoards, deleteBoard, getPlayer } from "../services/api";
import { User, Settings, Layout, LogOut, Trash2, Play, Lock, Mail } from "lucide-react";

export default function Account({ onClose }) {
  const { user, login, register, logout, updatePreferences } = useAuth();
  const { setDrawings, setFormation, setStarters } = useSquad();

  // Auth form state
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("coach");
  const [authError, setAuthError] = useState("");
  const [submittingAuth, setSubmittingAuth] = useState(false);

  // Saved boards state
  const [savedBoards, setSavedBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);

  // Preference state
  const [prefSidebarCollapsed, setPrefSidebarCollapsed] = useState(user?.preferences?.sidebarCollapsed || false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBoards();
    }
  }, [user]);

  const fetchBoards = async () => {
    setLoadingBoards(true);
    try {
      const res = await getBoards();
      setSavedBoards(res.boards || []);
    } catch (err) {
      console.error("Failed to load saved tactical boards", err);
    } finally {
      setLoadingBoards(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setSubmittingAuth(true);
    try {
      if (isRegistering) {
        await register(email, password, role);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setAuthError(
        err.response?.data?.error || err.response?.data?.message || err.message || "Authentication failed."
      );
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleDeleteBoard = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tactical board?")) return;
    try {
      await deleteBoard(id);
      setSavedBoards((prev) => prev.filter((b) => b._id !== id));
    } catch (err) {
      console.error("Failed to delete board", err);
    }
  };

  // Boards store `formationName` + a lineup of slot->playerId pairs. Restoring
  // the formation reloads the squad, so the lineup is applied afterwards.
  const handleLoadBoard = async (board) => {
    if (board.formationName) {
      setFormation(board.formationName);
    }
    setDrawings(Array.isArray(board.drawings) ? board.drawings : []);

    if (board.lineup?.length) {
      try {
        const players = await Promise.all(
          board.lineup
            .filter((item) => item.playerId)
            .map((item) =>
              getPlayer(item.playerId)
                .then((res) => ({ slot: item.slotLabel, player: res.player }))
                .catch(() => null)
            )
        );
        const restored = {};
        players.filter(Boolean).forEach(({ slot, player }) => {
          if (slot && player) restored[slot] = player;
        });
        if (Object.keys(restored).length) setStarters(restored);
      } catch (err) {
        console.error("Failed to restore the saved lineup", err);
      }
    }

    if (onClose) onClose();
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      await updatePreferences({
        sidebarCollapsed: prefSidebarCollapsed
      });
      alert("Preferences updated!");
    } catch (err) {
      console.error("Failed to save preferences", err);
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full flex flex-col gap-6">
      {/* Top Banner */}
      <div className="border-b border-pitch-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">User Account & Settings</h1>
          <p className="text-xs text-pitch-500 font-semibold tracking-wide uppercase mt-1">
            Tactical board snapshot repository & role permissions
          </p>
        </div>
      </div>

      {!user ? (
        /* Login / Register Panel */
        <div className="max-w-md mx-auto w-full bg-pitch-900/80 border border-pitch-700 p-8 rounded-2xl shadow-xl mt-6">
          <div className="text-center mb-6">
            <User className="h-12 w-12 mx-auto text-brand-400 mb-2" />
            <h2 className="font-display text-2xl font-bold">{isRegistering ? "Create taqtiq Account" : "Sign In to taqtiq"}</h2>
            <p className="text-xs text-pitch-400 mt-1">Save tactical boards, watchlist players, and configure preferences</p>
          </div>

          {authError && (
            <div className="mb-4 bg-pulse-red/10 border border-pulse-red/30 p-3 rounded-lg text-xs text-pulse-red text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-pitch-400 uppercase tracking-wider block mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pitch-500" />
                <input
                  type="email"
                  required
                  placeholder="coach@taqtiq.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-pitch-950 border border-pitch-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-pitch-400 uppercase tracking-wider block mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pitch-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-pitch-950 border border-pitch-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="text-xs font-semibold text-pitch-400 uppercase tracking-wider block mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-pitch-950 border border-pitch-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="coach">Coach (Full tactical access)</option>
                  <option value="scout">Scout (Recruitment focus)</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={submittingAuth}
              className="mt-2 w-full bg-brand-500 text-pitch-950 font-bold py-2.5 rounded-lg hover:bg-brand-400 transition-colors"
            >
              {submittingAuth ? "Processing..." : isRegistering ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-pitch-400 border-t border-pitch-800 pt-4">
            {isRegistering ? (
              <p>
                Already have an account?{" "}
                <button onClick={() => setIsRegistering(false)} className="text-brand-400 font-semibold hover:underline">
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{" "}
                <button onClick={() => setIsRegistering(true)} className="text-brand-400 font-semibold hover:underline">
                  Register
                </button>
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Logged In Dashboard & Settings */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Profile Info */}
          <div className="bg-pitch-900/60 border border-pitch-700/60 p-6 rounded-xl flex flex-col items-center text-center gap-3">
            <div className="w-20 h-20 rounded-full bg-brand-500/20 border-2 border-brand-500 flex items-center justify-center text-brand-400 text-2xl font-bold font-display uppercase">
              {user.email?.[0] || "U"}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white">{user.email}</h2>
              <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-pitch-800 text-brand-400 border border-brand-500/30">
                {user.role || "coach"}
              </span>
            </div>

            <div className="w-full border-t border-pitch-800 pt-4 mt-2 flex flex-col gap-2">
              <button
                onClick={logout}
                className="w-full bg-pitch-800 hover:bg-pulse-red/20 text-pitch-300 hover:text-pulse-red font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs"
              >
                <LogOut className="h-4 w-4" /> Log Out
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-pitch-900/60 border border-pitch-700/60 p-6 rounded-xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-brand-400 font-display text-sm uppercase tracking-wider font-semibold">
              <Settings className="h-4 w-4" /> App Preferences
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-pitch-800">
              <span className="text-pitch-300 font-medium">Sidebar default collapsed</span>
              <input
                type="checkbox"
                checked={prefSidebarCollapsed}
                onChange={(e) => setPrefSidebarCollapsed(e.target.checked)}
                className="rounded bg-pitch-950 border-pitch-700 text-brand-500 focus:ring-0"
              />
            </div>

            <button
              onClick={handleSavePrefs}
              disabled={savingPrefs}
              className="mt-auto bg-pitch-800 hover:bg-pitch-700 text-white font-semibold py-2 rounded-lg text-xs transition-colors"
            >
              {savingPrefs ? "Saving..." : "Save Preferences"}
            </button>
          </div>

          {/* Saved Tactical Boards */}
          <div className="md:col-span-3 bg-pitch-900/60 border border-pitch-700/60 p-6 rounded-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-400 font-display text-sm uppercase tracking-wider font-semibold">
                <Layout className="h-4 w-4" /> Saved Tactical Boards ({savedBoards.length})
              </div>
            </div>

            {loadingBoards ? (
              <p className="text-xs text-pitch-400">Loading boards...</p>
            ) : savedBoards.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {savedBoards.map((board) => (
                  <div key={board._id} className="bg-pitch-950/80 border border-pitch-800 p-4 rounded-lg flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-white truncate">{board.title || "Untitled Tactical Board"}</h4>
                      <p className="text-xs text-pitch-400 mt-0.5">
                        Formation: {board.formationName || "4-3-3"} · {board.lineup?.length || 0} players
                      </p>
                      <p className="text-[10px] text-pitch-500 mt-1">
                        Saved: {new Date(board.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-pitch-800 pt-3">
                      <button
                        onClick={() => handleLoadBoard(board)}
                        className="bg-brand-500 text-pitch-950 hover:bg-brand-400 font-semibold px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                      >
                        <Play className="h-3 w-3" /> Load
                      </button>

                      <button
                        onClick={() => handleDeleteBoard(board._id)}
                        className="text-pitch-500 hover:text-pulse-red p-1 transition-colors"
                        title="Delete Board"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-pitch-500 py-6 text-center bg-pitch-950/40 rounded-lg border border-pitch-800/40">
                No saved tactical boards yet. Click "Save Board" in the Pitch View while preparing match tactics!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
