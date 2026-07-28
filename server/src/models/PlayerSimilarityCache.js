import mongoose from "mongoose";

const PlayerSimilarityCacheSchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true, unique: true },
    results: { type: mongoose.Schema.Types.Mixed, default: {} },
    computedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("PlayerSimilarityCache", PlayerSimilarityCacheSchema);
