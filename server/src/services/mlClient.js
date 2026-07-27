import axios from "axios";

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";
const ml = axios.create({ baseURL: ML_URL, timeout: 6000 });

function toMlPayload(player) {
  const s = player.stats || {};
  return {
    age: player.age || 25,
    matches: s.matches || 0,
    minutes: s.minutes || 0,
    goals: s.goals || 0,
    assists: s.assists || 0,
    pass_accuracy: s.passAccuracy || 70,
    tackles_p90: s.tacklesP90 || 0,
    interceptions_p90: s.interceptionsP90 || 0,
    shots_on_target_pct: s.shotsOnTargetPct || 0,
    duels_won_pct: s.duelsWonPct || 50,
    saves_p90: s.savesP90 || 0,
    pace: s.pace || 65,
    dribbling: s.dribbling || 65,
    physical: s.physical || 65,
    recent_rating_delta: s.recentRatingDelta || 0,
  };
}

export async function getPlayerInsights(player) {
  try {
    const { data } = await ml.post("/predict/player", toMlPayload(player));
    return { available: true, ...data };
  } catch (err) {
    return {
      available: false,
      error: "ML service unreachable - showing formula-based estimate only.",
    };
  }
}

export async function getSimilarPlayers(target, candidates, k = 5) {
  try {
    const payload = {
      target: toMlPayload(target),
      candidates: candidates.map((c) => ({ id: c._id || c.sourceId, ...toMlPayload(c) })),
      k,
    };
    const { data } = await ml.post("/similarity", payload);
    return { available: true, ...data };
  } catch (err) {
    return { available: false, results: [], error: "ML service unreachable." };
  }
}

export async function mlHealth() {
  try {
    const { data } = await ml.get("/health");
    return data;
  } catch {
    return { status: "down", models_ready: false };
  }
}
