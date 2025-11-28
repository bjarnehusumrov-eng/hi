import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { stripe } from "@/lib/stripe";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { email, password, language } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "User exists" });

  const hashed = await bcrypt.hash(password, 10);

  // create Stripe customer
  const customer = await stripe.customers.create({ email });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashed,
      authProvider: "email",
      language: language || "en",
      stripeCustomerId: customer.id
    }
  });

  return res.status(201).json({ id: user.id, email: user.email });
}
