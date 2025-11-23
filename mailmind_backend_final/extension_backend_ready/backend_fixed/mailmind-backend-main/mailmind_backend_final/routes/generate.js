import express from "express";
import fetch from "node-fetch";
import auth from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

router.post("/generate", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { text, tone } = req.body;
    if (!text) return res.status(400).json({ error: "Campo 'text' obrigatório" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    // reset credits if needed
    const now = new Date();
    if (!user.creditsResetAt || now > user.creditsResetAt) {
      user.credits = 20;
      user.creditsResetAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await user.save();
    }

    // if free user, require credits
    if (user.plan !== "pro") {
      if (user.credits <= 0) {
        return res.status(402).json({ error: "Sem créditos. Faça upgrade." });
      }
      // decrement atomically
      const updated = await User.findOneAndUpdate(
        { _id: userId, credits: { $gte: 1 } },
        { $inc: { credits: -1 } },
        { new: true }
      );
      if (!updated) return res.status(402).json({ error: "Sem créditos" });
      user.credits = updated.credits;
    }

    const toneText = tone || "profissional";
    const system = "Você é um assistente que gera respostas claras e profissionais a e-mails. Use o tom: " + toneText + ". Seja conciso e útil.";
    const body = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: text }
      ],
      max_tokens: 700,
      temperature: 0.15
    };

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return res.status(500).json({ error: "OPENAI_API_KEY não configurada" });

    const apiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + OPENAI_KEY },
      body: JSON.stringify(body)
    });

    if (!apiResp.ok) {
      const txt = await apiResp.text();
      console.error("OpenAI error:", txt);
      return res.status(500).json({ error: "Erro OpenAI: " + txt });
    }
    const data = await apiResp.json();
    const reply = data.choices?.[0]?.message?.content || "";

    return res.json({ reply, creditsLeft: user.credits });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;