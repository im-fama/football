import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSquad } from "../context/SquadContext";
import { getBoards, deleteBoard, getPlayer } from "../services/api";
import { User, Settings, Layout, LogOut, Trash2, Play, Lock, Mail, Shield, ChevronRight, Calendar, Users, Sparkles, CheckCircle2 } from "lucide-react";

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
  const [prefsSaved, setPrefsSaved] = useState(false);

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
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save preferences", err);
    } finally {
      setSavingPrefs(false);
    }
  };

  const getRoleIcon = (r) => {
    switch (r) {
      case "admin": return <Shield className="h-3 w-3" />;
      case "scout": return <Users className="h-3 w-3" />;
      default: return <Sparkles className="h-3 w-3" />;
    }
  };

  if (!user) {
    // ── Login / Register ──
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-full max-w-md">
          {/* Header accent */}
          <div className="text-center mb-8">
            <div className="relative inline-flex">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-pitch-950 shadow-lg shadow-brand-500/30 mb-4">
                <User className="h-8 w-8" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-400 border-2 border-pitch-950 flex items-center justify-center">
                <Lock className="h-2.5 w-2.5 text-pitch-950" />
              </div>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              {isRegistering ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-sm text-pitch-400 mt-1">
              {isRegistering
                ? "Join taqtiq to save tactics & track players"
                : "Sign in to access your tactical boards"}
            </p>
          </div>

          {authError && (
            <div className="mb-5 bg-pulse-red/10 border border-pulse-red/30 p-3 rounded-xl text-xs text-pulse-red text-center font-medium backdrop-blur-sm">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-semibold text-pitch-400 uppercase tracking-wider block mb-2">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pitch-500 group-focus-within:text-brand-400 transition-colors" />
                <input
                  type="email"
                  required
                  placeholder="coach@taqtiq.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-pitch-900/80 border border-pitch-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-pitch-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-pitch-400 uppercase tracking-wider block mb-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pitch-500 group-focus-within:text-brand-400 transition-colors" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-pitch-900/80 border border-pitch-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-pitch-600"
                />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="text-xs font-semibold text-pitch-400 uppercase tracking-wider block mb-2">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 bg-pitch-900/80 border border-pitch-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
                >
                  <option value="coach">Coach — Full tactical access</option>
                  <option value="scout">Scout — Recruitment focus</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={submittingAuth}
              className="mt-1 w-full bg-gradient-to-r from-brand-500 to-brand-600 text-pitch-950 font-bold py-3 rounded-xl hover:from-brand-400 hover:to-brand-500 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 text-sm"
            >
              {submittingAuth ? "Processing..." : isRegistering ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-pitch-400 border-t border-pitch-800/60 pt-5">
            {isRegistering ? (
              <p>
                Already have an account?{" "}
                <button onClick={() => setIsRegistering(false)} className="text-brand-400 font-semibold hover:text-brand-300 transition-colors">
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{" "}
                <button onClick={() => setIsRegistering(true)} className="text-brand-400 font-semibold hover:text-brand-300 transition-colors">
                  Register
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Logged-in dashboard ──
  return (
    <div className="flex flex-col gap-5 py-2">
      {/* ── Profile Header Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-pitch-700/50 bg-gradient-to-r from-brand-900/40 via-brand-800/25 to-pitch-900/90">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent" />

        <div className="relative p-6 flex items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/30 to-brand-700/30 border border-brand-500/50 flex items-center justify-center text-brand-400 text-2xl font-bold font-display uppercase shadow-lg shadow-brand-500/10">
              {user.email?.[0] || "U"}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-500 border-2 border-pitch-950 flex items-center justify-center">
              {getRoleIcon(user.role)}
            </div>
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg font-bold text-white truncate">{user.email}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-brand-500/15 text-brand-400 border border-brand-500/25">
                {getRoleIcon(user.role)}
                {user.role || "coach"}
              </span>
              <span className="text-[10px] text-pitch-500">•</span>
              <span className="text-[10px] text-pitch-500">{savedBoards.length} saved board{savedBoards.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex-shrink-0 flex items-center gap-2 bg-pitch-800/60 hover:bg-pulse-red/15 text-pitch-400 hover:text-pulse-red font-semibold py-2 px-4 rounded-xl transition-all text-xs border border-pitch-700/50 hover:border-pulse-red/30"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out
          </button>
        </div>
      </div>

      {/* ── Preferences Card ── */}
      <div className="rounded-2xl border border-pitch-700/50 bg-pitch-900/60 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-pitch-800/60 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <Settings className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">App Preferences</span>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <label className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-pitch-950/50 border border-pitch-800/40 cursor-pointer hover:border-pitch-700 transition-colors group">
            <div className="flex items-center gap-3">
              <Layout className="h-4 w-4 text-pitch-500 group-hover:text-pitch-300 transition-colors" />
              <span className="text-sm text-pitch-300 font-medium">Sidebar default collapsed</span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={prefSidebarCollapsed}
                onChange={(e) => setPrefSidebarCollapsed(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-pitch-700 rounded-full peer-checked:bg-brand-500 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
            </div>
          </label>

          <button
            onClick={handleSavePrefs}
            disabled={savingPrefs}
            className="self-end flex items-center gap-2 bg-pitch-800/80 hover:bg-pitch-700 text-white font-semibold py-2 px-5 rounded-xl text-xs transition-all border border-pitch-700/50 hover:border-pitch-600 disabled:opacity-50"
          >
            {prefsSaved ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-400" />
                Saved!
              </>
            ) : savingPrefs ? (
              "Saving..."
            ) : (
              "Save Preferences"
            )}
          </button>
        </div>
      </div>

      {/* ── Saved Tactical Boards ── */}
      <div className="rounded-2xl border border-pitch-700/50 bg-pitch-900/60 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-pitch-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Layout className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Saved Tactical Boards</span>
          </div>
          <span className="text-[10px] font-bold text-pitch-500 bg-pitch-800/60 px-2.5 py-1 rounded-lg">
            {savedBoards.length} board{savedBoards.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="p-5">
          {loadingBoards ? (
            <div className="flex items-center justify-center py-8 gap-2 text-pitch-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500" />
              <span className="text-xs font-medium">Loading boards...</span>
            </div>
          ) : savedBoards.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {savedBoards.map((board) => (
                <div
                  key={board._id}
                  className="group flex items-center gap-4 p-3.5 rounded-xl bg-pitch-950/60 border border-pitch-800/50 hover:border-pitch-700 transition-all"
                >
                  {/* Board icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-pitch-800/80 border border-pitch-700/50 flex items-center justify-center text-pitch-400 group-hover:text-brand-400 group-hover:border-brand-500/30 transition-colors">
                    <Layout className="h-4 w-4" />
                  </div>

                  {/* Board info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-white truncate group-hover:text-brand-300 transition-colors">
                      {board.title || "Untitled Tactical Board"}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-pitch-400 font-medium">
                        {board.formationName || "4-3-3"}
                      </span>
                      <span className="text-pitch-700">·</span>
                      <span className="text-[10px] text-pitch-500">
                        {board.lineup?.length || 0} players
                      </span>
                      <span className="text-pitch-700">·</span>
                      <span className="text-[10px] text-pitch-500 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(board.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => handleLoadBoard(board)}
                      className="flex items-center gap-1.5 bg-brand-500 text-pitch-950 hover:bg-brand-400 font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors shadow-sm"
                    >
                      <Play className="h-3 w-3" /> Load
                    </button>
                    <button
                      onClick={() => handleDeleteBoard(board._id)}
                      className="p-2 text-pitch-600 hover:text-pulse-red hover:bg-pulse-red/10 rounded-lg transition-all"
                      title="Delete Board"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-pitch-800/60 border border-pitch-700/40 flex items-center justify-center text-pitch-600">
                <Layout className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-xs text-pitch-400 font-medium">No saved tactical boards yet</p>
                <p className="text-[10px] text-pitch-600 mt-1">Save a board from the Pitch View to see it here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
