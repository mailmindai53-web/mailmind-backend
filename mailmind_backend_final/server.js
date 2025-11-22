import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import generateRoutes from "./routes/generate.js";\nimport googleAuthRoutes from "./routes/googleAuth.js";\nimport checkoutRoutes from "./routes/checkout.js";\nimport webhookRoutes from "./routes/webhook.js";

const app = express();
app.use(express.json());
// For development allow any origin. In production, restrict origins.
app.use(cors({ origin: true }));

const mongoUrl = process.env.MONGO_URL;
if (!mongoUrl) {
  console.error("MONGO_URL not set. See .env");
  process.exit(1);
}

mongoose.connect(mongoUrl).then(()=>console.log("MongoDB connected")).catch(err=>{
  console.error("MongoDB error:", err);
  process.exit(1);
});

app.use("/api", authRoutes);
app.use("/api", generateRoutes);

app.get("/", (req, res) => res.send("MailMind Backend is running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Server listening on", PORT));
