import mongoose from "mongoose";

const PlayerSeasonStatsSchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    seasonId: { type: mongoose.Schema.Types.ObjectId, ref: "Season", default: null },
    matches: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 },
    goals: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    passAccuracy: { type: Number, default: 70 },
    tacklesP90: { type: Number, default: 0 },
    interceptionsP90: { type: Number, default: 0 },
    shotsOnTargetPct: { type: Number, default: 0 },
    duelsWonPct: { type: Number, default: 50 },
    savesP90: { type: Number, default: 0 },
    recentRatingDelta: { type: Number, default: 0 }
  },
  { timestamps: true }
);

PlayerSeasonStatsSchema.index({ playerId: 1, seasonId: 1 }, { unique: true });

export default mongoose.model("PlayerSeasonStats", PlayerSeasonStatsSchema);
