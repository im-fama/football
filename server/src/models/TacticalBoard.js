import mongoose from "mongoose";

const LineupItemSchema = new mongoose.Schema(
  {
    slotIndex: { type: Number, required: true },
    slotLabel: { type: String, required: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null }
  },
  { _id: false }
);

const TacticalBoardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    formationName: { type: String, required: true }, // e.g. "4-3-3"
    lineup: [LineupItemSchema],
    drawings: { type: mongoose.Schema.Types.Mixed, default: [] }, // array of stroke objects
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("TacticalBoard", TacticalBoardSchema);
