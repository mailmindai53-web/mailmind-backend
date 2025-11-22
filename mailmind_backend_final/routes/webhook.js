import express from "express";
import Stripe from "stripe";
import User from "../models/User.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const sku = session.metadata?.sku;
      console.log("checkout.session.completed for user:", userId, "sku:", sku);
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          if (sku === "credits_50") {
            user.credits = (user.credits || 0) + 50;
          } else if (sku === "pro_monthly") {
            user.plan = "pro";
          }
          await user.save();
          console.log("User updated after payment:", user.email);
        } else {
          console.warn("User not found for id:", userId);
        }
      } else {
        console.warn("No client_reference_id in session");
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Error handling webhook event:", err);
    res.status(500).send();
  }
});

export default router;
