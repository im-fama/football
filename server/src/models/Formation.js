import mongoose from "mongoose";

const SlotSchema = new mongoose.Schema(
  {
    code: { type: String, required: true }, // e.g. 'GK', 'LB'
    x: { type: Number, required: true },    // 0-100 percentage
    y: { type: Number, required: true }     // 0-100 percentage
  },
  { _id: false }
);

const FormationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slots: [SlotSchema]
  },
  { timestamps: true }
);

export default mongoose.model("Formation", FormationSchema);
