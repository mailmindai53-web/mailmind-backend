import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    unique: true, 
    required: true 
  },
  name: { 
    type: String 
  },
  provider_id: { 
    type: String 
  },
  // ← AQUI ERA O PROBLEMA! Agora aceita null/undefined
  passwordHash: { 
    type: String, 
    required: false,    // ← adicionado
    default: null       // ← adicionado
  },
  plan: { 
    type: String, 
    default: "free" 
  },
  credits: { 
    type: Number, 
    default: 20 
  },
  creditsResetAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
  }
});

export default mongoose.model("User", UserSchema);
