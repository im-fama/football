import mongoose from "mongoose";

const LeagueSchema = new mongoose.Schema(
  {
    sourceId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    country: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("League", LeagueSchema);
