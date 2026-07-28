import mongoose from "mongoose";

const PlayerAttributesSchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true, unique: true },
    pace: { type: Number, default: 65 },
    shooting: { type: Number, default: 65 },
    passing: { type: Number, default: 65 },
    dribbling: { type: Number, default: 65 },
    defending: { type: Number, default: 65 },
    physical: { type: Number, default: 65 }
  },
  { timestamps: true }
);

export default mongoose.model("PlayerAttributes", PlayerAttributesSchema);
