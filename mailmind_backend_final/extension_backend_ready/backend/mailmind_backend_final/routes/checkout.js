import express from "express";
import Stripe from "stripe";
import auth from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRODUCTS = {
  credits_50: { amount_cents: 500, currency: "usd", credits: 50, name: "50 Credits" },
  pro_monthly: { amount_cents: 999, currency: "usd", credits: 0, name: "Pro Monthly" }
};

router.post("/create-checkout-session", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sku } = req.body;
    const product = PRODUCTS[sku];
    if (!product) return res.status(400).json({ error: "Produto inválido" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: product.currency,
          product_data: { name: product.name },
          unit_amount: product.amount_cents
        },
        quantity: 1
      }],
      client_reference_id: userId,
      success_url: (process.env.DOMAIN || "https://mailmind-backend-09hd.onrender.com") + "/success.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: (process.env.DOMAIN || "https://mailmind-backend-09hd.onrender.com") + "/cancel.html",
      metadata: { sku }
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return res.status(500).json({ error: "Erro ao criar sessão Stripe" });
  }
});

export default router;
