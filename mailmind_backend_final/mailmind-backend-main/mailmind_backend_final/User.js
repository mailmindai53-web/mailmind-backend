import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  plan: { type: String, default: "free" }, // "free" or "pro"
  credits: { type: Number, default: 20 },
  creditsResetAt: { type: Date, default: () => new Date(Date.now() + 30*24*60*60*1000) }
});

export default mongoose.model("User", UserSchema);
