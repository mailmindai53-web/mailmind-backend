// routes/googleAuth.js
import express from "express";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Cria token JWT
function createToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, plan: user.plan },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Rota usada pela extensão Chrome
router.post("/google", async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: "access_token ausente" });

    // Valida o access_token diretamente com a API do Google
    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!userInfoRes.ok) {
      return res.status(401).json({ error: "Token Google inválido ou expirado" });
    }

    const googleUser = await userInfoRes.json();

    // Busca ou cria usuário
    let user = await User.findOne({ email: googleUser.email });
    if (!user) {
      user = await User.create({
        email: googleUser.email,
        name: googleUser.name || googleUser.email.split("@")[0],
        provider_id: googleUser.sub,
        passwordHash: null,
        plan: "free",
        credits: 20,
        creditsResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    const session_token = createToken(user);
    const user_profile = {
      email: user.email,
      name: user.name || user.email.split("@")[0],
      credits: user.credits,
      plan: user.plan,
    };

    return res.json({ session_token, user: user_profile });
  } catch (err) {
    console.error("Erro no login Google (extensão):", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
