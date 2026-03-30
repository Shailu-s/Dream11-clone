import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const { matchId, name, entryFee, prizeDistribution, maxParticipants } = await req.json();

    if (!matchId || !name || entryFee === undefined || !prizeDistribution) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (entryFee < 0) {
      return NextResponse.json({ error: "Entry fee cannot be negative" }, { status: 400 });
    }

    // Verify match exists, is upcoming, and hasn't started yet
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.status !== "UPCOMING") {
      return NextResponse.json({ error: "Match not available" }, { status: 400 });
    }
    if (match.date <= new Date()) {
      return NextResponse.json({ error: "Match has already started" }, { status: 400 });
    }

    // Validate prize distribution sums to 100
    const totalPct = prizeDistribution.reduce(
      (sum: number, p: { percentage: number }) => sum + p.percentage,
      0
    );
    if (totalPct !== 100) {
      return NextResponse.json({ error: "Prize distribution must sum to 100%" }, { status: 400 });
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    while (await prisma.contest.findUnique({ where: { inviteCode } })) {
      inviteCode = generateInviteCode();
    }

    const contest = await prisma.contest.create({
      data: {
        creatorId: user.id,
        matchId,
        name,
        entryFee,
        prizeDistribution,
        maxParticipants: maxParticipants || null,
        inviteCode,
      },
    });

    return NextResponse.json({ contest });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
