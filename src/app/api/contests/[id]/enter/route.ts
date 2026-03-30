import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateTeam } from "@/lib/team-validation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { players, teamName } = await req.json();

    // Get contest
    const contest = await prisma.contest.findUnique({
      where: { id },
      include: { match: true, _count: { select: { entries: true } } },
    });

    if (!contest || contest.status !== "OPEN") {
      return NextResponse.json({ error: "Contest not available" }, { status: 400 });
    }

    // Check if match has already started (time-based guard)
    if (contest.match.date <= new Date()) {
      return NextResponse.json({ error: "Match has already started" }, { status: 400 });
    }

    if (contest.maxParticipants && contest._count.entries >= contest.maxParticipants) {
      return NextResponse.json({ error: "Contest is full" }, { status: 400 });
    }

    // Check balance
    if (user.tokenBalance < contest.entryFee) {
      return NextResponse.json({ error: "Insufficient tokens" }, { status: 400 });
    }

    // Get player data for validation
    const playerIds = players.map((p: { playerId: string }) => p.playerId);
    const playerData = await prisma.player.findMany({
      where: { id: { in: playerIds } },
    });

    // Validate team
    const validation = validateTeam(players, playerData);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    // Deduct entry fee and create entry in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { tokenBalance: { decrement: contest.entryFee } },
      }),
      prisma.tokenTransaction.create({
        data: {
          userId: user.id,
          type: "CONTEST_ENTRY",
          amount: contest.entryFee,
          status: "APPROVED",
        },
      }),
      prisma.contestEntry.create({
        data: {
          contestId: id,
          userId: user.id,
          teamName: teamName || "My Team",
          players,
        },
      }),
      prisma.contest.update({
        where: { id },
        data: { prizePool: { increment: contest.entryFee } },
      }),
    ]);

    return NextResponse.json({ message: "Team submitted successfully" });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
