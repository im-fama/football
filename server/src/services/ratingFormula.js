/**
 * Deterministic "card rating" shown on the FIFA-style player card.
 * This is a transparent weighted formula (not the ML model) so the UI
 * can contrast it against the ML-predicted rating in the modal.
 */
const POSITION_WEIGHTS = {
  GK: { saves: 3.0, passAccuracy: 0.25, duels: 0.15 },
  DEF: { tackles: 1.6, interceptions: 1.5, duels: 0.3, passAccuracy: 0.25, physical: 0.15 },
  MID: { passAccuracy: 0.35, goals: 2.2, assists: 2.0, dribbling: 0.15, tackles: 0.8 },
  FWD: { goals: 3.0, assists: 2.0, shotsOnTargetPct: 0.25, pace: 0.15, dribbling: 0.15 },
};

function normalizePosition(pos = "") {
  const p = pos.toUpperCase();
  if (p.includes("GK") || p.includes("KEEPER")) return "GK";
  if (p.includes("DEF") || p.includes("BACK") || p === "CB" || p === "LB" || p === "RB") return "DEF";
  if (p.includes("MID") || p === "CM" || p === "CDM" || p === "CAM") return "MID";
  return "FWD";
}

export function computeRating(stats = {}, position = "MID") {
  const key = normalizePosition(position);
  const w = POSITION_WEIGHTS[key];
  let base = 58;

  if (key === "GK") {
    base += (stats.savesP90 || 0) * w.saves;
    base += ((stats.passAccuracy || 70) - 70) * w.passAccuracy;
    base += ((stats.duelsWonPct || 50) - 50) * w.duels;
  } else if (key === "DEF") {
    base += (stats.tacklesP90 || 0) * w.tackles;
    base += (stats.interceptionsP90 || 0) * w.interceptions;
    base += ((stats.duelsWonPct || 50) - 50) * w.duels;
    base += ((stats.passAccuracy || 70) - 70) * w.passAccuracy;
    base += ((stats.physical || 65) - 65) * w.physical;
  } else if (key === "MID") {
    base += ((stats.passAccuracy || 70) - 70) * w.passAccuracy;
    base += (stats.goals || 0) * w.goals;
    base += (stats.assists || 0) * w.assists;
    base += ((stats.dribbling || 65) - 65) * w.dribbling;
    base += (stats.tacklesP90 || 0) * w.tackles;
  } else {
    base += (stats.goals || 0) * w.goals;
    base += (stats.assists || 0) * w.assists;
    base += ((stats.shotsOnTargetPct || 0) - 30) * w.shotsOnTargetPct;
    base += ((stats.pace || 65) - 65) * w.pace;
    base += ((stats.dribbling || 65) - 65) * w.dribbling;
  }

  return Math.round(Math.min(Math.max(base, 45), 99));
}

export { normalizePosition };
