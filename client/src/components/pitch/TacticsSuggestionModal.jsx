import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSquad } from "../../context/SquadContext";
import { suggestTactics } from "../../services/api";
import { X, Sparkles, Shield, Zap, Target, CheckCircle2 } from "lucide-react";

export default function TacticsSuggestionModal({ onClose }) {
  const { formation, starters, setFormation } = useSquad();
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [appliedTactic, setAppliedTactic] = useState(null);

  useEffect(() => {
    async function fetchTactics() {
      try {
        setLoading(true);
        const players = Object.values(starters).filter(Boolean);
        const data = await suggestTactics(formation, players);
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        } else {
          setSuggestions(getDefaultSuggestions(formation));
        }
      } catch (err) {
        console.warn("ML Service unavailable, using default tactical analysis", err);
        setSuggestions(getDefaultSuggestions(formation));
      } finally {
        setLoading(false);
      }
    }
    fetchTactics();
  }, [formation, starters]);

  const getDefaultSuggestions = (form) => [
    {
      name: "High Gegenpress",
      match_score: 94,
      recommended_formation: form,
      reason: "Capitalizes on your midfield work rate and high defensive line to force opposition turnovers."
    },
    {
      name: "Fluid Tiki-Taka",
      match_score: 88,
      recommended_formation: "4-3-3",
      reason: "Maximizes passing network accuracy with triangular passing options across the pitch."
    },
    {
      name: "Direct Counter-Attack",
      match_score: 82,
      recommended_formation: "4-2-3-1",
      reason: "Exploits winger pace and fast forward transitions when winning the ball in deep channels."
    }
  ];

  const handleApplyTactic = (tactic) => {
    if (tactic.recommended_formation && tactic.recommended_formation !== formation) {
      setFormation(tactic.recommended_formation);
    }
    setAppliedTactic(tactic.name);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const getIcon = (name) => {
    if (name.includes("Defensive") || name.includes("Bus")) return <Shield className="h-5 w-5 text-blue-400" />;
    if (name.includes("Attack") || name.includes("Wing") || name.includes("Counter")) return <Zap className="h-5 w-5 text-amber-400" />;
    if (name.includes("Taka") || name.includes("press")) return <Target className="h-5 w-5 text-red-400" />;
    return <Sparkles className="h-5 w-5 text-brand-400" />;
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-pitch-900 border border-brand-500/40 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />
        
        <div className="flex justify-between items-center p-6 border-b border-pitch-800 bg-pitch-950/60">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl uppercase tracking-wide">AI Tactical Analytics</h2>
              <p className="text-xs text-pitch-400 font-medium">Neural engine recommendation matrix</p>
            </div>
          </div>
          <button onClick={onClose} className="text-pitch-400 hover:text-white p-2 rounded-xl bg-pitch-800/50 hover:bg-pitch-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto scrollbar-thin">
          {appliedTactic && (
            <div className="mb-4 p-4 rounded-xl bg-brand-500/20 border border-brand-400/50 text-brand-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-400" /> Applied tactic "{appliedTactic}" to active pitch setup!
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-pitch-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
              <span className="text-xs font-semibold">Running ML tactical fit simulation on {formation}...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-xs text-pitch-300">
                Based on your <strong className="text-white font-bold">{formation}</strong> setup and active starters, here are top tactical strategies:
              </div>
              
              {suggestions.map((tactic, idx) => (
                <div key={idx} className="bg-pitch-950 border border-pitch-800 hover:border-brand-500/60 rounded-2xl p-5 flex flex-col gap-3 transition-all group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-pitch-900 border border-pitch-700">
                        {getIcon(tactic.name)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base group-hover:text-brand-300">{tactic.name}</h3>
                        <span className="text-xs text-pitch-400">Formation: {tactic.recommended_formation || formation}</span>
                      </div>
                    </div>
                    <div className="text-xs font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30 px-3 py-1 rounded-full">
                      {tactic.match_score || 90}% Fit
                    </div>
                  </div>

                  <p className="text-xs text-pitch-300 leading-relaxed">
                    {tactic.reason}
                  </p>

                  <button
                    onClick={() => handleApplyTactic(tactic)}
                    className="self-end bg-pitch-900 hover:bg-brand-500 text-pitch-300 hover:text-pitch-950 font-bold px-5 py-2 rounded-xl text-xs transition-colors border border-pitch-700 hover:border-brand-400"
                  >
                    Apply Strategy
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return document.body ? createPortal(modalContent, document.body) : modalContent;
}

