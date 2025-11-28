import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions as any);
  if (!session || !session.user?.email) return res.status(401).json({ error: "Not authenticated" });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (req.method === "GET") {
    // return last 30 logs
    const logs = await prisma.sleepLog.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 30
    });
    return res.status(200).json({ data: logs });
  }

  if (req.method === "POST") {
    const payload = req.body;
    // expected fields: date, bedtime, timeToFallAsleepMin, awakenings, wakeAfterSleepMin, wakeTime, howRested
    const date = new Date(payload.date);
    // compute total time in bed & total sleep time & efficiency if provided times
    let totalTimeInBedMin = null;
    let totalSleepTimeMin = null;
    let sleepEfficiency = null;
    if (payload.bedtime && payload.wakeTime) {
      const bed = new Date(payload.bedtime);
      const wake = new Date(payload.wakeTime);
      const diff = Math.max(0, (wake.getTime() - bed.getTime()) / (1000 * 60));
      totalTimeInBedMin = Math.round(diff);
      if (typeof payload.timeToFallAsleepMin === "number" && typeof payload.wakeAfterSleepMin === "number") {
        totalSleepTimeMin = Math.max(0, totalTimeInBedMin - payload.timeToFallAsleepMin - payload.wakeAfterSleepMin);
        sleepEfficiency = totalSleepTimeMin > 0 ? Math.round((totalSleepTimeMin / totalTimeInBedMin) * 10000) / 100 : null;
      }
    }

    const created = await prisma.sleepLog.create({
      data: {
        userId: user.id,
        date,
        bedtime: payload.bedtime ? new Date(payload.bedtime) : date,
        timeToFallAsleepMin: payload.timeToFallAsleepMin ?? null,
        awakenings: payload.awakenings ?? null,
        wakeAfterSleepMin: payload.wakeAfterSleepMin ?? null,
        wakeTime: payload.wakeTime ? new Date(payload.wakeTime) : null,
        howRested: payload.howRested ?? null,
        totalTimeInBedMin,
        totalSleepTimeMin,
        sleepEfficiency
      }
    });

    return res.status(201).json({ data: created });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
