import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

function createToken(user){
  return jwt.sign({ id: user._id, email: user.email, plan: user.plan }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// helper: reset credits if needed
async function ensureCredits(user){
  if(!user) return;
  const now = new Date();
  if(!user.creditsResetAt || now > user.creditsResetAt){
    user.credits = 20;
    user.creditsResetAt = new Date(now.getTime() + 30*24*60*60*1000);
    await user.save();
  }
}

router.post("/register", async (req,res) => {
  try{
    const { email, password } = req.body;
    if(!email || !password) return res.status(400).json({ error: "Email e senha obrigatórios" });
    const exists = await User.findOne({ email });
    if(exists) return res.status(400).json({ error: "Email já registrado" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });
    await ensureCredits(user);
    return res.json({ token: createToken(user), plan: user.plan, credits: user.credits });
  }catch(err){
    console.error(err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/login", async (req,res) => {
  try{
    const { email, password } = req.body;
    if(!email || !password) return res.status(400).json({ error: "Email e senha obrigatórios" });
    const user = await User.findOne({ email });
    if(!user) return res.status(400).json({ error: "Usuário não encontrado" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if(!ok) return res.status(400).json({ error: "Senha incorreta" });
    await ensureCredits(user);
    return res.json({ token: createToken(user), plan: user.plan, credits: user.credits });
  }catch(err){
    console.error(err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// check-plan
router.get("/check-plan", async (req,res) => {
  try{
    const auth = req.headers.authorization?.split(" ")[1];
    if(!auth) return res.status(401).json({ error: "Sem token" });
    const data = jwt.verify(auth, process.env.JWT_SECRET);
    const user = await User.findById(data.id);
    if(!user) return res.status(404).json({ error: "Usuário não encontrado" });
    await ensureCredits(user);
    return res.json({ plan: user.plan, credits: user.credits, creditsResetAt: user.creditsResetAt });
  }catch(e){
    return res.status(401).json({ error: "Token inválido" });
  }
});

export default router;
