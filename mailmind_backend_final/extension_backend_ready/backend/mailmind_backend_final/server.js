import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import generateRoutes from "./routes/generate.js";
import googleAuthRoutes from "./routes/googleAuth.js";
import checkoutRoutes from "./routes/checkout.js";
import webhookRoutes from "./routes/webhook.js";
import googleExtAuth from "./routes/googleExtAuth.js"; // IMPORT CORRETO

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// Conexão Mongo
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

// ROTAS EXISTENTES COM /api
app.use("/api", authRoutes);
app.use("/api", generateRoutes);
app.use("/api", googleAuthRoutes);
app.use("/api", checkoutRoutes);
app.use("/api", webhookRoutes);

// 🔥 ROTA PARA EXTENSÃO (SEM /api)
app.use("/auth", googleExtAuth);

app.get("/", (req, res) => res.send("MailMind Backend is running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server listening on", PORT));
