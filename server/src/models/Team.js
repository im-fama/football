import mongoose from "mongoose";

const TeamSchema = new mongoose.Schema(
  {
    sourceId: { type: String, index: true, unique: true, sparse: true },
    leagueId: { type: mongoose.Schema.Types.ObjectId, ref: "League", default: null },
    name: { type: String, required: true },
    badgeUrl: { type: String, default: "" },
    stadium: { type: String, default: "" },
    isCustom: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export default mongoose.model("Team", TeamSchema);
