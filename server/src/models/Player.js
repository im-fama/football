import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema(
  {
    sourceId: { type: String, index: true, unique: true, sparse: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
    name: { type: String, required: true, index: true },
    position: { type: String, default: "MID" },
    nationality: { type: String, default: "" },
    age: { type: Number, default: null },
    photoUrl: { type: String, default: "" },
    overallRating: { type: Number, default: 65 },
    isCustom: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    instructions: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

PlayerSchema.index({ name: "text" });

export default mongoose.model("Player", PlayerSchema);
