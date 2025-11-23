// routes/googleAuth.js  → versão blindada 2025
import express from "express";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET não configurado!");
    throw new Error("Configuração do servidor incompleta");
  }
  return jwt.sign(
    { id: user._id, email: user.email, plan: user.plan },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/google", async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: "access_token ausente" });

    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Google respondeu erro:", response.status, text);
      return res.status(401).json({ error: "Token Google inválido" });
    }

    const googleUser = await response.json();

    let user = await User.findOne({ email: googleUser.email });
    if (!user) {
      user = await User.create({
        email: googleUser.email,
        name: googleUser.name || googleUser.email.split("@")[0],
        provider_id: googleUser.sub || null,
        passwordHash: null,
        plan: "free",
        credits: 20,
        creditsResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      console.log("Novo usuário criado:", user.email);
    }

    const session_token = createToken(user);
    const user_profile = {
      email: user.email,
      name: user.name || user.email.split("@")[0],
      credits: user.credits || 20,
      plan: user.plan || "free",
    };

    return res.json({ session_token, user: user_profile });
  } catch (err) {
    console.error("ERRO NO LOGIN GOOGLE:", err.message || err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
