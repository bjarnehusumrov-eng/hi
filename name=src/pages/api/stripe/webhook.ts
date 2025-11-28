import { NextApiRequest, NextApiResponse } from "next";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export const config = {
  api: {
    bodyParser: false
  }
};

import rawBody from "raw-body";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sig = req.headers["stripe-signature"] as string | undefined;
  const buf = await rawBody(req);
  let event;
  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig || "", process.env.STRIPE_WEBHOOK_SECRET || "");
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  const handle = async () => {
    const type = event.type;
    const obj = event.data.object;
    switch (type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = obj;
        const customerId = subscription.customer as string;
        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              isPremium: subscription.status === "active" || subscription.status === "trialing",
              stripeSubscriptionId: subscription.id,
              premiumTier: subscription.items?.data?.[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly",
              trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
            }
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = obj;
        const customerId = subscription.customer as string;
        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              isPremium: false,
              stripeSubscriptionId: null,
              premiumTier: null,
              trialEndsAt: null
            }
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = obj;
        const customerId = invoice.customer as string;
        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
        if (user) {
          await prisma.user.update({ where: { id: user.id }, data: { isPremium: false } });
        }
        break;
      }
      default:
        console.log("Unhandled stripe event:", type);
    }
  };

  await handle();
  res.status(200).json({ received: true });
}
