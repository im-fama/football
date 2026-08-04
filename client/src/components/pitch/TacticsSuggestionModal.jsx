import React, { useState, useEffect } from "react";
import { useSquad } from "../../context/SquadContext";
import { suggestTactics } from "../../services/api";
import { X, Sparkles, AlertCircle, Shield, Zap, Target } from "lucide-react";

export default function TacticsSuggestionModal({ onClose }) {
  const { formation, starters } = useSquad();
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTactics() {
      try {
        setLoading(true);
        const players = Object.values(starters).filter(Boolean);
        // Goes through the shared axios client so it works behind the Vite
        // proxy and on Vercel, not just against a hardcoded localhost:5000.
        const data = await suggestTactics(formation, players);
        setSuggestions(data.suggestions || []);
      } catch (err) {
        console.error(err);
        setError(
          "Could not analyze tactics — the Flask ML service on :5001 is not reachable."
        );
      } finally {
        setLoading(false);
      }
    }
    fetchTactics();
  }, [formation, starters]);

  const getIcon = (name) => {
    if (name.includes("Defensive") || name.includes("Bus")) return <Shield className="h-5 w-5 text-blue-400" />;
    if (name.includes("Attack") || name.includes("Wing")) return <Zap className="h-5 w-5 text-yellow-400" />;
    if (name.includes("Taka") || name.includes("press")) return <Target className="h-5 w-5 text-red-400" />;
    return <Sparkles className="h-5 w-5 text-brand-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-pitch-900 border border-brand-500/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-brand-600" />
        
        <div className="flex justify-between items-center p-5 border-b border-pitch-800">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-brand-400" />
            <h2 className="font-display font-bold text-lg uppercase tracking-wide">AI Tactic Analysis</h2>
          </div>
          <button onClick={onClose} className="text-pitch-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-pitch-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              <span className="text-sm">Analyzing {formation} formation & squad stats...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-red-400">
              <AlertCircle className="h-10 w-10 opacity-80" />
              <span className="text-sm text-center">{error}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-sm text-pitch-300 mb-2">
                Based on your <strong className="text-white">{formation}</strong> setup and current starters, here are the most effective tactical approaches:
              </div>
              
              {suggestions.map((tactic, idx) => (
                <div key={idx} className="bg-pitch-950 border border-pitch-800 rounded-xl p-4 flex gap-4 hover:border-brand-500/50 transition-colors">
                  <div className="mt-1 flex-shrink-0 bg-pitch-900 p-2 rounded-lg border border-pitch-700">
                    {getIcon(tactic.name)}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-white text-md">{tactic.name}</h3>
                      <div className="text-xs font-semibold bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full">
                        {tactic.match_score}% Match
                      </div>
                    </div>
                    <p className="text-xs text-pitch-400 leading-relaxed">
                      {tactic.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
