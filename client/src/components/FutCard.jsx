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

  // FUT Attributes from stats
  const pace = player.stats?.pace ?? 65;
  const dribbling = player.stats?.dribbling ?? 65;
  const physical = player.stats?.physical ?? 65;
  const passing = player.stats?.passAccuracy ?? 70;
  
  // Calculate synthetic attributes if not direct
  const shooting = player.stats?.shooting ?? Math.min(99, (player.stats?.goals ?? 0) * 3 + 40);
  const defending = player.stats?.defending ?? Math.min(99, (player.stats?.tacklesP90 ?? 0) * 15 + (player.stats?.interceptionsP90 ?? 0) * 15);

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

        {/* Top-Left Header */}
        <div className="fut-card-header-left">
          <div className="fut-rating-num">{rating}</div>
          <div className="fut-pos-code">{slotLabel || player.position}</div>
        </div>

        {/* Cutout Photo */}
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

        {/* Name Banner */}
        <div className="fut-name-banner truncate px-1">
          {player.name ? player.name.split(" ").pop() : "Player"}
        </div>

        {/* Stats Grid */}
        {showStats && !isMini && (
          <div className="fut-stats-grid">
            <div className="fut-stats-values">
              <span>{Math.round(pace)}</span>
              <span>{Math.round(shooting)}</span>
              <span>{Math.round(passing)}</span>
              <span>{Math.round(dribbling)}</span>
              <span>{Math.round(defending)}</span>
              <span>{Math.round(physical)}</span>
            </div>
            <div className="fut-stats-labels">
              <span>PAC</span>
              <span>SHO</span>
              <span>PAS</span>
              <span>DRI</span>
              <span>DEF</span>
              <span>PHY</span>
            </div>
          </div>
        )}
      </div>

      {/* Position Pill Below Card */}
      {!isMini && slotLabel && (
        <div className="fut-pos-badge uppercase font-bold">
          {slotLabel}
        </div>
      )}
    </div>
  );
}
