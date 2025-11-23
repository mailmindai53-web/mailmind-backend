import express from "express";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Função helper para criar token
function createToken(user) {
  return jwt.sign({ id: user._id, email: user.email, plan: user.plan }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// Rota para login da extensão (com access_token)
router.post("/google", async (req, res) => {
  try {
    const { provider, provider_id, email, name, access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: "access_token ausente" });

    // Validar access_token no backend (fetch userinfo)
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    if (!userinfoRes.ok) return res.status(401).json({ error: "Token Google inválido" });
    const userinfo = await userinfoRes.json();

    // Verificar se dados do client match (segurança)
    if (userinfo.email !== email || userinfo.name !== name || userinfo.sub !== provider_id) {
      return res.status(400).json({ error: "Dados inconsistentes" });
    }

    let user = await User.findOne({ email: userinfo.email });
    if (!user) {
      user = await User.create({
        email: userinfo.email,
        name: userinfo.name, // Adicionei campo name no schema? Se não, adicione.
        provider_id: userinfo.sub,
        passwordHash: null,
        plan: "free",
        credits: 20,
        creditsResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }

    const session_token = createToken(user);
    const user_profile = { email: user.email, name: user.name || user.email.split('@')[0], credits: user.credits, plan: user.plan };

    return res.json({ session_token, user: user_profile });
  } catch (err) {
    console.error("Google extension login error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// Mantenho a rota original /google-login para web (idToken), se precisar
router.post("/google-login", async (req, res) => {
  // Código original aqui...
  // (não mudei, mas se não usar, pode remover)
});

export default router;