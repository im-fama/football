import mongoose from "mongoose";

const StatsSchema = new mongoose.Schema(
  {
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
    pace: { type: Number, default: 65 },
    dribbling: { type: Number, default: 65 },
    physical: { type: Number, default: 65 },
    recentRatingDelta: { type: Number, default: 0 },
  },
  { _id: false }
);

const PlayerSchema = new mongoose.Schema(
  {
    sourceId: { type: String, index: true, unique: true, sparse: true },
    name: { type: String, required: true, index: true },
    team: { type: String, default: "Free Agent" },
    league: { type: String, default: "" },
    position: { type: String, default: "MID" },
    nationality: { type: String, default: "" },
    age: { type: Number, default: null },
    thumbnail: { type: String, default: "" },
    hasRealPhoto: { type: Boolean, default: false },
    stats: { type: StatsSchema, default: () => ({}) },
    computedRating: { type: Number, default: 65 },
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PlayerSchema.index({ name: "text", team: "text", nationality: "text" });

export default mongoose.model("Player", PlayerSchema);
