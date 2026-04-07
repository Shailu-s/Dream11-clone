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

  // Step 2: Flip UPCOMING → LIVE for matches whose lock time has passed (within 4-hour window)
  // Uses lockTime if set by admin (rain delay), otherwise falls back to scheduled match date
  const upcomingMatches = await prisma.match.findMany({
    where: { status: "UPCOMING", date: { gte: matchDurationAgo } },
    select: { id: true, date: true, lockTime: true },
  });
  const matchIdsToGoLive = upcomingMatches
    .filter((m) => (m.lockTime ?? m.date) <= now)
    .map((m) => m.id);
  const goingLive = matchIdsToGoLive.length > 0
    ? await prisma.match.updateMany({
        where: { id: { in: matchIdsToGoLive } },
        data: { status: "LIVE" },
      })
    : { count: 0 };

  if (completed.count > 0 || goingLive.count > 0) {
    console.log(`[MatchSync] ${completed.count} marked COMPLETED, ${goingLive.count} marked LIVE`);
  }
}
