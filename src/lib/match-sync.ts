import { prisma } from "./prisma";

// T20 matches last ~3.5 hours; 4 hours is a safe buffer to auto-mark as COMPLETED
const MATCH_DURATION_MS = 4 * 60 * 60 * 1000;

export async function syncMatchStatuses() {
  const now = new Date();
  const matchDurationAgo = new Date(Date.now() - MATCH_DURATION_MS);

  // Step 1: Auto-complete matches older than 4 hours from start
  // This prevents stale matches from staying LIVE and burning API hits
  const completed = await prisma.match.updateMany({
    where: { status: { in: ["UPCOMING", "LIVE"] }, date: { lt: matchDurationAgo } },
    data: { status: "COMPLETED" },
  });

  // Step 2: Flip UPCOMING → LIVE for matches whose start time has passed (within 4-hour window)
  const goingLive = await prisma.match.updateMany({
    where: { status: "UPCOMING", date: { lt: now, gte: matchDurationAgo } },
    data: { status: "LIVE" },
  });

  if (completed.count > 0 || goingLive.count > 0) {
    console.log(`[MatchSync] ${completed.count} marked COMPLETED, ${goingLive.count} marked LIVE`);
  }
}
