import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncMatchStatuses } from "@/lib/match-sync";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSession();

  await syncMatchStatuses();

  const contest = await prisma.contest.findUnique({
    where: { id },
    include: {
      match: true,
      creator: { select: { username: true } },
      entries: {
        include: { user: { select: { username: true } } },
        orderBy: { totalPoints: "desc" },
      },
      _count: { select: { entries: true } },
    },
  });

  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  // Calculate prize pool
  const prizePool = contest.entryFee * contest.entries.length * (1 - contest.platformCutPct / 100);

  return NextResponse.json({
    contest: { ...contest, calculatedPrizePool: prizePool },
    isParticipant: user ? contest.entries.some((e) => e.userId === user.id) : false,
    isCreator: user ? contest.creatorId === user.id : false,
    userId: user?.id,
  });
}
