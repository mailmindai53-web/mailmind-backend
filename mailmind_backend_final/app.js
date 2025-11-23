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

// Middlewares
app.use(express.json());
app.use(cors({ origin: true })); // Em produção restrinja se quiser

// Webhook precisa de raw body
app.use("/api/webhook", express.raw({ type: "application/json" }), webhookRoutes);

// Conexão com MongoDB
const mongoUrl = process.env.MONGO_URL;
if (!mongoUrl) {
  console.error("MONGO_URL not set. See .env");
  process.exit(1);
}

mongoose
  .connect(mongoUrl)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB error:", err);
    process.exit(1);
  });

// Rotas
app.use("/api", authRoutes);
app.use("/api", generateRoutes);
app.use("/api", checkoutRoutes);
app.use("/auth", googleAuthRoutes); // ← Rota crítica para a extensão (/auth/google)

// Rota raiz
app.get("/", (req, res) => res.send("MailMind Backend is running"));

// Debug (pode deixar, ajuda muito)
console.log("Rotas carregadas:");
console.log("- /api (auth, generate, checkout)");
console.log("- /auth (googleAuth) → login da extensão");
console.log("- /api/webhook (raw body)");

// Handler global 404
app.use((req, res, next) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

// Handler global de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erro interno do servidor" });
});

// Inicia o servidor (SÓ UMA VEZ, NO FINAL!)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
