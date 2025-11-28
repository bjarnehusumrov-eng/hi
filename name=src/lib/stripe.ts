import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-01"
});

export function priceIdForTier(tier: "monthly" | "yearly") {
  if (process.env.NODE_ENV === "development") {
    return tier === "monthly" ? process.env.STRIPE_PRICE_MONTHLY_ID : process.env.STRIPE_PRICE_YEARLY_ID;
  }
  return tier === "monthly" ? process.env.STRIPE_PRICE_MONTHLY_ID : process.env.STRIPE_PRICE_YEARLY_ID;
}
