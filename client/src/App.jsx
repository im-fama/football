import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink, Link, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SquadProvider } from "./context/SquadContext";
import PitchView from "./pages/PitchView";
import TeamStats from "./pages/TeamStats";
import Scouting from "./pages/Scouting";
import CreatorStudio from "./pages/CreatorStudio";
import Account from "./pages/Account";
import DatasetGate from "./components/DatasetGate";
import { Shield, Layout, BarChart2, Search, User, X, PlusCircle } from "lucide-react";

function Header({ onOpenAccount }) {
  const { user } = useAuth();
  const location = useLocation();
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    setTabLoading(true);
    const timer = setTimeout(() => setTabLoading(false), 350);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <header className="bg-pitch-950/90 backdrop-blur-md border-b border-pitch-800/80 px-6 py-3 sticky top-0 z-40 relative">
      {tabLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-500 via-brand-300 to-brand-500 animate-pulse" />
      )}
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-pitch-950 shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Shield className="h-5 w-5 fill-current" />
          </div>
          <div>
            <span className="font-display text-xl font-bold tracking-wider text-white">taqtiq</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-brand-400 block -mt-1">
              Decision Platform
            </span>
          </div>
        </Link>

        {/* Center Tabs */}
        <nav className="flex items-center gap-1 bg-pitch-900/80 p-1 rounded-xl border border-pitch-800">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? "bg-brand-500 text-pitch-950 shadow-md shadow-brand-500/20"
                  : "text-pitch-400 hover:text-white"
              }`
            }
          >
            <Layout className="h-3.5 w-3.5" /> Pitch View
          </NavLink>

          <NavLink
            to="/stats"
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? "bg-brand-500 text-pitch-950 shadow-md shadow-brand-500/20"
                  : "text-pitch-400 hover:text-white"
              }`
            }
          >
            <BarChart2 className="h-3.5 w-3.5" /> Team Stats
          </NavLink>

          <NavLink
            to="/scouting"
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? "bg-brand-500 text-pitch-950 shadow-md shadow-brand-500/20"
                  : "text-pitch-400 hover:text-white"
              }`
            }
          >
            <Search className="h-3.5 w-3.5" /> Scouting
          </NavLink>

          <NavLink
            to="/creator"
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? "bg-brand-500 text-pitch-950 shadow-md shadow-brand-500/20"
                  : "text-pitch-400 hover:text-white"
              }`
            }
          >
            <PlusCircle className="h-3.5 w-3.5" /> Creator Studio
          </NavLink>
        </nav>

        {/* User Avatar Circle */}
        <button
          onClick={onOpenAccount}
          className="flex items-center gap-2 bg-pitch-900 hover:bg-pitch-800 border border-pitch-700/80 p-1.5 pr-3 rounded-full transition-all group"
          title="User Account & Saved Plans"
        >
          <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-400/50 flex items-center justify-center text-brand-400 font-bold text-xs uppercase">
            {user?.email ? user.email[0] : <User className="h-3.5 w-3.5" />}
          </div>
          <span className="text-xs font-semibold text-pitch-300 group-hover:text-white max-w-[100px] truncate">
            {user ? user.email.split("@")[0] : "Account"}
          </span>
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const [showAccountModal, setShowAccountModal] = useState(false);

  return (
    <AuthProvider>
      <SquadProvider>
        <div className="min-h-screen bg-pitch-950 text-white flex flex-col font-sans">
          <Header onOpenAccount={() => setShowAccountModal(true)} />

          <main className="flex-1 flex flex-col min-h-0 relative">
            <DatasetGate>
              <Routes>
                <Route path="/" element={<PitchView />} />
                <Route path="/stats" element={<TeamStats />} />
                <Route path="/scouting" element={<Scouting />} />
                <Route path="/creator" element={<CreatorStudio />} />
                <Route path="/account" element={<Account />} />
              </Routes>
            </DatasetGate>
          </main>


          {/* Account Modal Overlay */}
          {showAccountModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4" onClick={() => setShowAccountModal(false)}>
              <div
                className="relative w-full max-w-2xl max-h-[85vh] bg-pitch-950 border border-pitch-700/60 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Top gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/70 to-transparent" />
                <button
                  onClick={() => setShowAccountModal(false)}
                  className="absolute top-3 right-3 z-10 bg-pitch-800/80 hover:bg-pitch-700 p-2 rounded-xl text-pitch-400 hover:text-white transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
                  <Account onClose={() => setShowAccountModal(false)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </SquadProvider>
    </AuthProvider>
  );
}
