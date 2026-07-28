import mongoose from "mongoose";

const MatchEventSchema = new mongoose.Schema(
  {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    minute: { type: Number, required: true },
    type: { type: String, required: true }, // 'pass', 'shot', 'tackle', etc.
    x: { type: Number, required: true },    // 0-100 pitch coordinates
    y: { type: Number, required: true },    // 0-100 pitch coordinates
    details: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export default mongoose.model("MatchEvent", MatchEventSchema);
