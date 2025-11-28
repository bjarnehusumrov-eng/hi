import { NextApiRequest, NextApiResponse } from "next";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const session = await getServerSession(req, res, authOptions as any);
  if (!session || !session.user?.email) return res.status(401).json({ error: "Not authenticated" });

  const { tier } = req.body; // "monthly" | "yearly"
  if (!["monthly", "yearly"].includes(tier)) return res.status(400).json({ error: "Invalid tier" });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: "User not found" });

  // Ensure Stripe customer exists
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const priceId = tier === "monthly" ? process.env.STRIPE_PRICE_MONTHLY_ID : process.env.STRIPE_PRICE_YEARLY_ID;
  if (!priceId) return res.status(500).json({ error: "Price IDs not configured" });

  // Set trial days per spec
  const trialDays = tier === "monthly" ? 7 : 14;

  const origin = process.env.NEXTAUTH_URL || `${req.headers.origin || "http://localhost:3000"}`;
  const successUrl = `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/subscription/cancel`;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: trialDays
    },
    success_url: successUrl,
    cancel_url: cancelUrl
  });

  return res.status(200).json({ url: checkoutSession.url });
}
