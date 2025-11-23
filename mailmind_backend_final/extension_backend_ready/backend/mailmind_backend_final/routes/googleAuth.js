import express from "express";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "100486490864-suj02j5vgg15eqr2v281kq8a8fb36gcd.apps.googleusercontent.com");

router.post("/google-login", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Token Google ausente" });
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID || "100486490864-suj02j5vgg15eqr2v281kq8a8fb36gcd.apps.googleusercontent.com"
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name || payload.email.split('@')[0];

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        passwordHash: null,
        plan: "free",
        credits: 20
      });
    }
    const token = jwt.sign({ id: user._id, email: user.email, plan: user.plan }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, email: user.email, credits: user.credits, plan: user.plan });
  } catch (err) {
    console.error("Google login error:", err);
    return res.status(400).json({ error: "Falha ao autenticar com Google" });
  }
});

export default router;
