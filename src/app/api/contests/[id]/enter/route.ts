import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePlayerSelections } from "@/lib/player-utils";

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

    // Require team name
    if (!teamName || !teamName.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    // Check for duplicate team name in this contest (same user)
    const existingEntry = await prisma.contestEntry.findFirst({
      where: { contestId: id, userId: user.id, teamName: teamName.trim() },
    });
    if (existingEntry) {
      return NextResponse.json({ error: "You already have a team with this name in this contest. Choose a different name." }, { status: 400 });
    }

    // Check balance
    if (user.tokenBalance < contest.entryFee) {
      return NextResponse.json({ error: "Insufficient tokens" }, { status: 400 });
    }

    // Validate team
    const result = await validatePlayerSelections(players);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Auto-save team to SavedTeam (upsert: if same name+match exists, update players)
    const existingSavedTeam = await prisma.savedTeam.findFirst({
      where: { userId: user.id, matchId: contest.matchId, teamName: teamName.trim() },
    });

    // Deduct entry fee, create entry, and auto-save team in a transaction
    const trimmedName = teamName.trim();
    const matchId = contest.matchId;
    const savedTeamId = existingSavedTeam?.id;
    const userId = user.id;
    const entryFee = contest.entryFee;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { tokenBalance: { decrement: entryFee } },
      });
      await tx.tokenTransaction.create({
        data: { userId, type: "CONTEST_ENTRY", amount: entryFee, status: "APPROVED" },
      });
      await tx.contestEntry.create({
        data: { contestId: id, userId, teamName: trimmedName, players },
      });
      await tx.contest.update({
        where: { id },
        data: { prizePool: { increment: entryFee } },
      });
      if (savedTeamId) {
        await tx.savedTeam.update({ where: { id: savedTeamId }, data: { players } });
      } else {
        await tx.savedTeam.create({
          data: { userId, matchId, teamName: trimmedName, players },
        });
      }
    });

    return NextResponse.json({ message: "Team submitted successfully" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    // requireAuth throws on unauthenticated; other errors are server-side
    if (msg === "Unauthorized" || msg === "Forbidden") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[contest enter]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
