import { prisma } from "./prisma";

// T20 matches last ~3.5 hours; 4 hours is a safe buffer to auto-mark as COMPLETED
const MATCH_DURATION_MS = 4 * 60 * 60 * 1000;

export async function syncMatchStatuses() {
  const now = new Date();
  const matchDurationAgo = new Date(Date.now() - MATCH_DURATION_MS);
  await prisma.match.updateMany({
    where: { status: { in: ["UPCOMING", "LIVE"] }, date: { lt: matchDurationAgo } },
    data: { status: "COMPLETED" },
  });
  await prisma.match.updateMany({
    where: { status: "UPCOMING", date: { lt: now, gte: matchDurationAgo } },
    data: { status: "LIVE" },
  });
}
