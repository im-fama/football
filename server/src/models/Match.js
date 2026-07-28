import mongoose from "mongoose";

const MatchSchema = new mongoose.Schema(
  {
    seasonId: { type: mongoose.Schema.Types.ObjectId, ref: "Season", required: true },
    homeTeamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    awayTeamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    date: { type: Date, default: Date.now },
    homeScore: { type: Number, default: 0 },
    awayScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("Match", MatchSchema);
