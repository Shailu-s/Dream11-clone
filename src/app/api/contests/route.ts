import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");

  const user = await getSession();

  const where = {
    status: "OPEN" as const,
    ...(matchId ? { matchId } : {}),
  };

  const contests = await prisma.contest.findMany({
    where,
    select: {
      id: true,
      name: true,
      entryFee: true,
      prizePool: true,
      maxParticipants: true,
      inviteCode: true,
      status: true,
      match: { select: { id: true, team1: true, team2: true, date: true, venue: true } },
      creator: { select: { username: true } },
      _count: { select: { entries: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // If logged in, mark which ones the user has joined
  let joinedContestIds: Set<string> = new Set();
  if (user) {
    const entries = await prisma.contestEntry.findMany({
      where: { userId: user.id, contestId: { in: contests.map((c) => c.id) } },
      select: { contestId: true },
    });
    joinedContestIds = new Set(entries.map((e) => e.contestId));
  }

  return NextResponse.json({
    contests: contests.map((c) => ({
      ...c,
      isJoined: joinedContestIds.has(c.id),
    })),
  });
}
