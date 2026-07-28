import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "coach", "scout"], default: "scout" },
    preferences: {
      sidebarCollapsed: { type: Boolean, default: false },
      theme: { type: String, enum: ["light", "dark"], default: "dark" },
      defaultLeague: { type: String, default: "English Premier League" },
      defaultTeam: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
