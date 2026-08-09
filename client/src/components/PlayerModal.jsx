import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, TrendingUp, TrendingDown, Minus, Brain, Users } from "lucide-react";
import StatRadar from "./StatRadar";
import StatBar from "./StatBar";
import { getPlayerInsights, getSimilarPlayers } from "../services/api";
import { tierFromRating, formColor } from "../utils/cardTier";

const FormIcon = { "In Form": TrendingUp, Declining: TrendingDown, Average: Minus };

export default function PlayerModal({ player, poolTeamId, onClose }) {
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [similar, setSimilar] = useState(null);
  const [similarLoading, setSimilarLoading] = useState(true);

  useEffect(() => {
    if (!player) return;
    setInsightsLoading(true);
    setSimilarLoading(true);
    setInsights(null);
    setSimilar(null);

    getPlayerInsights(player._id || player.sourceId)
      .then(setInsights)
      .catch(() => setInsights({ ml: { available: false } }))
      .finally(() => setInsightsLoading(false));

    getSimilarPlayers(player._id || player.sourceId, poolTeamId, 5)
      .then(setSimilar)
      .catch(() => setSimilar({ available: false, results: [] }))
      .finally(() => setSimilarLoading(false));
  }, [player, poolTeamId]);

  if (!player) return null;
  const tier = tierFromRating(player.computedRating);
  const ml = insights?.ml;
  const Icon = ml?.form_label ? FormIcon[ml.form_label] : Minus;
  const fc = formColor(ml?.form_label);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/75 p-3 sm:p-6 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-pitch-700 bg-pitch-900 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-20 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/80 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Scrollable Modal Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {/* Header */}
            <div className={`flex flex-col gap-3 p-4 sm:p-5 sm:flex-row sm:items-center ${tier.bg}`}>
              <div className="flex items-center gap-3">
                {player.thumbnail ? (
                  <img
                    src={player.thumbnail}
                    alt={player.name}
                    className="h-16 w-16 rounded-full border-2 border-white/50 object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : (
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/50 bg-pitch-950/20 font-display text-xl font-bold ${tier.text}`}>
                    {player.name?.[0]}
                  </div>
                )}
                <div>
                  <p className={`font-display text-xl font-bold ${tier.text}`}>{player.name}</p>
                  <p className={`text-xs ${tier.text} opacity-80`}>
                    {player.team} &middot; {player.position} &middot; {player.nationality}
                    {player.age ? ` \u00b7 ${player.age} yrs` : ""}
                  </p>
                </div>
              </div>
              <div className="sm:ml-auto flex gap-3">
                <RatingPill label="Card Rating" value={player.computedRating} tone={tier.text} />
                {!insightsLoading && ml?.available && (
                  <RatingPill label="ML Predicted" value={ml.predicted_rating} tone={tier.text} highlight />
                )}
              </div>
            </div>

            {/* Body */}
            <div className="grid gap-4 p-4 sm:p-5 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 font-display text-xs uppercase tracking-widest text-pitch-500 font-bold">
                  Attribute Profile
                </h3>
                <div className="rounded-xl border border-pitch-700 bg-pitch-800/50 p-2 flex justify-center items-center">
                  <StatRadar stats={player.stats} />
                </div>
              </div>
              <div>
                <h3 className="mb-2 font-display text-xs uppercase tracking-widest text-pitch-500 font-bold">
                  Season Stats
                </h3>
                <div className="rounded-xl border border-pitch-700 bg-pitch-800/50 p-3">
                  <StatBar stats={player.stats} />
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-pitch-700 pt-2 text-center text-xs">
                    <MiniStat label="Matches" value={player.stats?.matches} />
                    <MiniStat label="Minutes" value={player.stats?.minutes} />
                    <MiniStat label="Saves/90" value={player.stats?.savesP90} />
                  </div>
                </div>
              </div>
            </div>

            {/* ML Insights */}
            <div className="border-t border-pitch-700/60 p-4 sm:p-5">
              <h3 className="mb-2 flex items-center gap-2 font-display text-xs uppercase tracking-widest text-pitch-500 font-bold">
                <Brain className="h-4 w-4 text-brand-400" /> Machine Learning Insights
              </h3>
              {insightsLoading ? (
                <p className="text-xs text-pitch-500">Scoring player with the ML service...</p>
              ) : ml?.available ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${fc.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${fc.text}`} />
                    <span className={`text-xs font-semibold ${fc.text}`}>{ml.form_label}</span>
                    <span className="text-[10px] text-pitch-500">({Math.round((ml.confidence || 0) * 100)}% confidence)</span>
                  </div>
                  <p className="text-xs text-pitch-500">
                    Predicted rating driven mainly by{" "}
                    <span className="text-white font-medium">{(ml.top_drivers || []).join(", ")}</span>.
                  </p>
                </div>
              ) : (
                <p className="rounded-lg bg-pulse-red/10 px-3 py-2 text-xs text-pulse-red">
                  ML service unreachable — showing the formula-based card rating only. Start the Flask
                  service (see README) to enable predictions.
                </p>
              )}
            </div>

            {/* Similar players */}
            <div className="border-t border-pitch-700/60 p-4 sm:p-5">
              <h3 className="mb-2 flex items-center gap-2 font-display text-xs uppercase tracking-widest text-pitch-500 font-bold">
                <Users className="h-4 w-4 text-brand-400" /> Similar Players (KNN)
              </h3>
              {similarLoading ? (
                <p className="text-xs text-pitch-500">Finding similar profiles...</p>
              ) : similar?.results?.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {similar.results.map((r) => (
                    <div key={r.id} className="rounded-lg border border-pitch-700 bg-pitch-800/50 p-2.5">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-xs text-white">{r.player?.name || "Unknown player"}</p>
                        <span className="text-[10px] font-mono text-brand-400">{r.similarity_pct}% match</span>
                      </div>
                      {Object.keys(r.key_differences || {}).length > 0 && (
                        <p className="mt-0.5 text-[10px] text-pitch-500">
                          {Object.entries(r.key_differences)
                            .slice(0, 2)
                            .map(([k, v]) => `${v > 0 ? "+" : ""}${v} ${k}`)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-pitch-500">
                  No candidate pool loaded yet — browse a team roster to compare within its squad.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function RatingPill({ label, value, tone, highlight }) {
  return (
    <div className={`rounded-lg px-3 py-2 text-center ${highlight ? "bg-pitch-950/30" : "bg-white/10"}`}>
      <p className={`font-display text-xl font-bold ${tone}`}>{value ?? "—"}</p>
      <p className={`text-[10px] uppercase tracking-wide ${tone} opacity-70`}>{label}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="font-mono text-sm font-semibold text-white">{value ?? 0}</p>
      <p className="text-[10px] uppercase tracking-wide text-pitch-500">{label}</p>
    </div>
  );
}
