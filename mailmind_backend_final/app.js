import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import generateRoutes from "./routes/generate.js";
import googleAuthRoutes from "./routes/googleAuth.js";
import checkoutRoutes from "./routes/checkout.js";
import webhookRoutes from "./routes/webhook.js";

const app = express();
app.use(express.json());
// Para dev, allow any origin. Em prod, restrinja (ex: origem da extensão)
app.use(cors({ origin: true }));

// Webhook precisa de raw body
app.use("/api/webhook", express.raw({ type: "application/json" }), webhookRoutes);

const mongoUrl = process.env.MONGO_URL;
if (!mongoUrl) {
  console.error("MONGO_URL not set. See .env");
  process.exit(1);
}

mongoose.connect(mongoUrl).then(() => console.log("MongoDB connected")).catch(err => {
  console.error("MongoDB error:", err);
  process.exit(1);
});

app.use("/api", authRoutes);
app.use("/api", generateRoutes);
app.use("/api", checkoutRoutes);
app.use("/auth", googleAuthRoutes); // Agora /auth/google para extensão

app.get("/", (req, res) => res.send("MailMind Backend is running"));

const PORT = process.env.PORT || 3000;
// ... (imports e middlewares iguais)

// Logging para debug de rotas (remova em prod)
console.log("Rotas carregadas:");
console.log("- /api (auth, generate, checkout)");
console.log("- /auth (googleAuth)");
console.log("- /api/webhook (raw body)");

app.get("/", (req, res) => res.send("MailMind Backend is running"));

const PORT = process.env.PORT || 3000;
// No final, antes de app.listen
app.use((req, res, next) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erro interno do servidor" });
});
app.listen(PORT, () => console.log("Server listening on", PORT));
