import { motion } from "framer-motion";
import { tierFromRating } from "../utils/cardTier";

export default function PlayerCard({ player, index = 0, onClick }) {
  const rating = player.computedRating ?? 65;
  const tier = tierFromRating(rating);
  const initials = (player.name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.button
      onClick={() => onClick(player)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
      whileHover={{ y: -6, rotate: -0.5 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative w-full overflow-hidden rounded-2xl border border-white/10 p-4 text-left ${tier.bg} ${tier.ring} transition-shadow`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start justify-between">
        <div>
          <p className={`font-display text-3xl font-bold leading-none ${tier.text}`}>{rating}</p>
          <p className={`mt-1 text-xs font-semibold uppercase tracking-wide ${tier.text} opacity-80`}>
            {player.position}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-[10px] font-semibold uppercase tracking-widest ${tier.text} opacity-70`}>
            {tier.name}
          </p>
          <p className={`text-[10px] ${tier.text} opacity-60`}>{player.nationality || "—"}</p>
        </div>
      </div>

      <div className="my-3 flex justify-center">
        {player.thumbnail ? (
          <img
            src={player.thumbnail}
            alt={player.name}
            className="h-24 w-24 rounded-full border-2 border-white/40 object-cover shadow-lg"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            className={`flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/40 bg-pitch-950/20 font-display text-2xl font-bold ${tier.text}`}
          >
            {initials}
          </div>
        )}
      </div>

      <p className={`truncate text-center font-display text-base font-semibold ${tier.text}`}>
        {player.name}
      </p>
      <p className={`truncate text-center text-xs ${tier.text} opacity-70`}>{player.team}</p>

      <div className={`mt-3 grid grid-cols-4 gap-1 border-t border-white/20 pt-2 text-center text-[11px] font-mono font-semibold ${tier.text}`}>
        <StatMini label="PAC" value={player.stats?.pace} />
        <StatMini label="DRI" value={player.stats?.dribbling} />
        <StatMini label="PHY" value={player.stats?.physical} />
        <StatMini label="PAS" value={player.stats?.passAccuracy} />
      </div>
    </motion.button>
  );
}

function StatMini({ label, value }) {
  return (
    <div>
      <p className="opacity-90">{Math.round(value ?? 0)}</p>
      <p className="text-[9px] opacity-60">{label}</p>
    </div>
  );
}
