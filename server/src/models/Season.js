import mongoose from "mongoose";

const SeasonSchema = new mongoose.Schema(
  {
    leagueId: { type: mongoose.Schema.Types.ObjectId, ref: "League", required: true },
    label: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Season", SeasonSchema);
