import mongoose from "mongoose";

const WatchlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    note: { type: String, default: "" },
    addedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Ensure a user can only add a specific player once
WatchlistSchema.index({ userId: 1, playerId: 1 }, { unique: true });

export default mongoose.model("Watchlist", WatchlistSchema);
