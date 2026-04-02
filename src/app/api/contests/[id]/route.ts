import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSession();

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

  // Fetch scorecard from already-saved stats — no API hit
  const statsRows = await prisma.playerMatchStats.findMany({
    where: { matchId: contest.matchId },
    include: { player: { select: { name: true, team: true, role: true } } },
  });

  // Only include if we actually have performance data (not just XI flags)
  const hasStats = statsRows.some(s => s.runs > 0 || s.wickets > 0 || s.catches > 0 || s.stumpings > 0 || s.fantasyPoints > 0);

  const scorecard = hasStats ? statsRows.map(s => ({
    playerId: s.playerId,
    name: s.player.name,
    team: s.player.team,
    role: s.player.role,
    runs: s.runs,
    ballsFaced: s.ballsFaced,
    fours: s.fours,
    sixes: s.sixes,
    wickets: s.wickets,
    oversBowled: s.oversBowled,
    maidens: s.maidens,
    runsConceded: s.runsConceded,
    catches: s.catches,
    stumpings: s.stumpings,
    runOutsDirect: s.runOutsDirect,
    runOutsIndirect: s.runOutsIndirect,
    didBat: s.didBat,
    isInPlayingXI: s.isInPlayingXI,
    fantasyPoints: s.fantasyPoints,
  })) : [];

  return NextResponse.json({
    contest: { ...contest, calculatedPrizePool: prizePool },
    isParticipant: user ? contest.entries.some((e) => e.userId === user.id) : false,
    isCreator: user ? contest.creatorId === user.id : false,
    userId: user?.id,
    scorecard,
  });
}
