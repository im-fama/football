import React from "react";
import { tierFromRating } from "../utils/cardTier";

export default function FutCard({ player, slotLabel, isMini = false, showStats = true }) {
  if (!player) return null;

  const rating = player.computedRating || player.overallRating || 65;
  const tier = tierFromRating(rating);
  const initials = (player.name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isGK = (player.position || "").toUpperCase().includes("GK");

  // FUT attributes come straight from the six-stat block on PlayerAttributes.
  const pace = player.stats?.pace ?? 65;
  const dribbling = player.stats?.dribbling ?? 65;
  const physical = player.stats?.physical ?? 65;
  const passing = player.stats?.passing ?? player.stats?.passAccuracy ?? 65;
  const shooting = player.stats?.shooting ?? Math.min(99, (player.stats?.goals ?? 0) * 3 + 40);
  const defending =
    player.stats?.defending ??
    Math.min(99, (player.stats?.tacklesP90 ?? 0) * 15 + (player.stats?.interceptionsP90 ?? 0) * 15);

  const containerClasses = isMini
    ? "fut-card-container mini select-none cursor-grab"
    : "fut-card-container select-none cursor-grab";

  // Choose appropriate class name mapping
  let cardClass = "fut-card";
  if (player.position === "MGR" || player.position === "COACH") {
    cardClass += " fut-card-mgr";
  } else if (rating >= 75) {
    cardClass += " fut-card-gold";
  } else if (rating >= 65) {
    cardClass += " fut-card-silver";
  } else {
    cardClass += " fut-card-bronze";
  }

  return (
    <div className={containerClasses}>
      <div className={cardClass}>
        {/* Wavy texture overlay */}
        <div className="fut-card-waves opacity-[0.15]" />

        <div className="fut-card-content">
          <div className="fut-card-top">
            {/* Top-Left Column */}
            <div className="fut-card-left-col">
              <div className="fut-rating-num">{rating}</div>
              <div className="fut-pos-code">{slotLabel || player.position}</div>
              
              <div className="fut-flags">
                {/* Mock flags/logos since they aren't directly available in current data yet */}
                <div className="w-4 h-4 rounded-full bg-blue-500/80 mb-0.5"></div>
                <div className="w-4 h-4 rounded-full bg-red-500/80 mb-0.5"></div>
                <div className="w-4 h-4 rounded-full bg-gray-500/80"></div>
              </div>
            </div>

            {/* Photo Right Column */}
            <div className="fut-card-photo">
              {player.thumbnail || player.photoUrl ? (
                <img
                  src={player.thumbnail || player.photoUrl}
                  alt={player.name}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="fut-photo-initials opacity-70">{initials}</div>
              )}
            </div>
          </div>

          <div className="fut-card-bottom">
            {/* Name Banner */}
            <div className="fut-name-banner truncate px-1">
              {player.name ? player.name.split(" ").pop() : "Player"}
            </div>

            {/* Stats Grid */}
            {showStats && !isMini && (
              <div className="fut-stats-grid">
                {/* Keepers store their GK ratings in the same six slots, so the
                    values stay comparable while the labels match EA's card. */}
                {(isGK
                  ? [
                      [shooting, "DIV"],
                      [passing, "HAN"],
                      [dribbling, "KIC"],
                      [defending, "REF"],
                      [pace, "SPD"],
                      [physical, "POS"]
                    ]
                  : [
                      [pace, "PAC"],
                      [shooting, "SHO"],
                      [passing, "PAS"],
                      [dribbling, "DRI"],
                      [defending, "DEF"],
                      [physical, "PHY"]
                    ]
                ).map(([value, label]) => (
                  <div className="fut-stat-item" key={label}>
                    <span className="fut-stat-val">{Math.round(value)}</span>
                    <span className="fut-stat-label">{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
