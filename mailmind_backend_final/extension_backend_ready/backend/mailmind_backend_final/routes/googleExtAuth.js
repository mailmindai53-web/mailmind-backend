import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/google", async (req, res) => {
  try {
    const { email, name, access_token } = req.body;

    if (!email) return res.status(400).json({ error: "Email ausente" });

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        passwordHash: null,
        plan: "free",
        credits: 20
      });
    }

    const session_token = jwt.sign(
      { id: user._id, email: user.email, plan: user.plan },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      session_token,
      user: {
        email: user.email,
        name: name || user.email.split("@")[0],
        credits: user.credits,
        plan: user.plan
      }
    });

  } catch (err) {
    console.error("Erro google ext:", err);
    return res.status(500).json({ error: "Erro interno no login Google" });
  }
});

export default router;