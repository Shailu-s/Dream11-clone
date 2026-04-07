import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePlayerSelections } from "@/lib/player-utils";
import { calculateEntryPoints } from "@/lib/scoring";

const MAX_SERIALIZABLE_RETRIES = 3;

class ContestEntryValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { players, teamName } = await req.json();

    // Require team name
    if (!teamName || !teamName.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    // Validate team
    const result = await validatePlayerSelections(players);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const trimmedName = teamName.trim();
    await withSerializableRetry(async () => {
      await prisma.$transaction(
        async (tx) => {
          const contest = await tx.contest.findUnique({
            where: { id },
            include: { match: true },
          });

          if (!contest || contest.status !== "OPEN") {
            throw new ContestEntryValidationError("Contest not available");
          }

          if ((contest.match.lockTime ?? contest.match.date) <= new Date()) {
            throw new ContestEntryValidationError("Match has already started");
          }

          const existingCount = await tx.contestEntry.count({
            where: { contestId: id },
          });
          if (contest.maxParticipants && existingCount >= contest.maxParticipants) {
            throw new ContestEntryValidationError("Contest is full");
          }

          const existingStats = await tx.playerMatchStats.findMany({
            where: { matchId: contest.matchId },
            select: { playerId: true, fantasyPoints: true },
          });
          const statsMap = new Map(existingStats.map((s) => [s.playerId, s.fantasyPoints]));
          const initialPoints = existingStats.length > 0
            ? calculateEntryPoints(players, statsMap)
            : 0;

          const balanceUpdate = await tx.user.updateMany({
            where: { id: user.id, tokenBalance: { gte: contest.entryFee } },
            data: { tokenBalance: { decrement: contest.entryFee } },
          });
          if (balanceUpdate.count === 0) {
            throw new ContestEntryValidationError("Insufficient tokens");
          }

          await tx.tokenTransaction.create({
            data: { userId: user.id, type: "CONTEST_ENTRY", amount: contest.entryFee, status: "APPROVED" },
          });
          await tx.contestEntry.create({
            data: { contestId: id, userId: user.id, teamName: trimmedName, players, totalPoints: initialPoints },
          });
          await tx.contest.update({
            where: { id },
            data: { prizePool: { increment: contest.entryFee } },
          });

          const updatedSavedTeams = await tx.savedTeam.updateMany({
            where: { userId: user.id, matchId: contest.matchId, teamName: trimmedName },
            data: { players },
          });
          if (updatedSavedTeams.count === 0) {
            await tx.savedTeam.create({
              data: { userId: user.id, matchId: contest.matchId, teamName: trimmedName, players },
            });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    });

    return NextResponse.json({ message: "Team submitted successfully" });
  } catch (err) {
    if (err instanceof ContestEntryValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (isContestEntryNameConflict(err)) {
      return NextResponse.json({ error: "This team name already exists in this contest. Choose a different name." }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "Unauthorized" || msg === "Forbidden") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isSerializableConflict(err)) {
      return NextResponse.json({ error: "This contest was updated while you were joining. Please try again." }, { status: 409 });
    }
    console.error("[contest enter]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function withSerializableRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (!isSerializableConflict(err) || attempt >= MAX_SERIALIZABLE_RETRIES) {
        throw err;
      }
    }
  }
}

function isSerializableConflict(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
}

function isContestEntryNameConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray(err.meta?.target) &&
    err.meta.target.includes("contestId") &&
    err.meta.target.includes("userId") &&
    err.meta.target.includes("teamName")
  );
}
