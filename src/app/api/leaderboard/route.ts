import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Get all completed contest entries grouped by user
  const entries = await prisma.contestEntry.findMany({
    where: { contest: { status: "COMPLETED" } },
    include: { user: { select: { username: true } } },
  });

  // Aggregate stats per user
  const userStats = new Map<
    string,
    {
      username: string;
      totalContests: number;
      wins: number;
      top2: number;
      top3: number;
      totalPrize: number;
      totalPoints: number;
    }
  >();

  for (const entry of entries) {
    const existing = userStats.get(entry.userId) || {
      username: entry.user.username,
      totalContests: 0,
      wins: 0,
      top2: 0,
      top3: 0,
      totalPrize: 0,
      totalPoints: 0,
    };

    existing.totalContests++;
    existing.totalPoints += entry.totalPoints;
    existing.totalPrize += entry.prizeWon;
    if (entry.rank === 1) existing.wins++;
    if (entry.rank === 2) existing.top2++;
    if (entry.rank === 3) existing.top3++;

    userStats.set(entry.userId, existing);
  }

  const leaderboard = Array.from(userStats.values()).sort(
    (a, b) => b.wins - a.wins || b.totalPrize - a.totalPrize
  );

  return NextResponse.json({ leaderboard });
}
