import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateFantasyPoints, calculateEntryPoints, calculateContestPlacements } from "@/lib/scoring";

const MAX_SERIALIZABLE_RETRIES = 3;

class AdminScoringError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get("matchId");

    if (!matchId) {
      return NextResponse.json({ error: "matchId required" }, { status: 400 });
    }

    const stats = await prisma.playerMatchStats.findMany({
      where: { matchId },
    });

    return NextResponse.json({ stats });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

// Admin manually enters player stats for a match
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { matchId, playerStats } = await req.json();

    if (!matchId || !playerStats || !Array.isArray(playerStats)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Fetch existing XI/impact flags for this match (set by admin via Playing XI tab)
    const existingRows = await prisma.playerMatchStats.findMany({
      where: { matchId },
      select: { playerId: true, isInPlayingXI: true, isImpactPlayer: true },
    });
    const xiMap = new Map(existingRows.map(r => [r.playerId, { isInPlayingXI: r.isInPlayingXI, isImpactPlayer: r.isImpactPlayer }]));

    // Save player stats and calculate fantasy points
    for (const stat of playerStats) {
      const xi = xiMap.get(stat.playerId);
      const fantasyPoints = calculateFantasyPoints({
        ...stat,
        isInPlayingXI: xi?.isInPlayingXI ?? false,
        isImpactPlayer: xi?.isImpactPlayer ?? false,
      });

      await prisma.playerMatchStats.upsert({
        where: {
          playerId_matchId: { playerId: stat.playerId, matchId },
        },
        update: { ...stat, fantasyPoints, matchId: undefined, playerId: undefined },
        create: { ...stat, matchId, fantasyPoints },
      });
    }

    // After saving stats, recalculate and update points for all contest entries in this match
    const allStats = await prisma.playerMatchStats.findMany({ where: { matchId } });
    const statsMap = new Map<string, number>();
    for (const s of allStats) {
      statsMap.set(s.playerId, s.fantasyPoints);
    }

    const contests = await prisma.contest.findMany({
      where: { matchId, status: { in: ["OPEN", "LOCKED"] } },
      include: { entries: true },
    });

    for (const contest of contests) {
      for (const entry of contest.entries) {
        const playerSelections = entry.players as Array<{
          playerId: string;
          isCaptain: boolean;
          isViceCaptain: boolean;
        }>;
        const totalPoints = calculateEntryPoints(playerSelections, statsMap);
        await prisma.contestEntry.update({
          where: { id: entry.id },
          data: { totalPoints },
        });
      }
    }

    return NextResponse.json({ message: "Stats saved and points updated" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to save stats";
    const status = msg.includes("Forbidden") || msg.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// Calculate and distribute results for all contests of a match
export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const { matchId } = await req.json();

    if (!matchId) {
      return NextResponse.json({ error: "matchId required" }, { status: 400 });
    }

    // Get all player stats for this match
    const stats = await prisma.playerMatchStats.findMany({
      where: { matchId },
    });

    const statsMap = new Map<string, number>();
    for (const s of stats) {
      statsMap.set(s.playerId, s.fantasyPoints);
    }

    const contestIds = await prisma.contest.findMany({
      where: { matchId, status: { in: ["LOCKED", "OPEN"] } },
      select: { id: true },
    });

    for (const { id: contestId } of contestIds) {
      await withSerializableRetry(async () => {
        await prisma.$transaction(
          async (tx) => {
            const contest = await tx.contest.findUnique({
              where: { id: contestId },
              include: { entries: true },
            });

            if (!contest) {
              throw new AdminScoringError("Contest not found during finalize", 404);
            }

            const sortedEntries = contest.entries
              .map((e) => ({
                ...e,
                totalPoints: calculateEntryPoints(
                  e.players as Array<{
                    playerId: string;
                    isCaptain: boolean;
                    isViceCaptain: boolean;
                  }>,
                  statsMap
                ),
              }))
              .sort((a, b) => b.totalPoints - a.totalPoints);

            const prizePool = contest.entryFee * contest.entries.length * (1 - contest.platformCutPct / 100);
            const distribution = contest.prizeDistribution as Array<{
              rank: number;
              percentage: number;
            }>;

            const claimed = await tx.contest.updateMany({
              where: { id: contestId, status: { in: ["LOCKED", "OPEN"] } },
              data: { status: "COMPLETED", prizePool },
            });

            if (claimed.count === 0) {
              return;
            }

            for (const entry of sortedEntries) {
              await tx.contestEntry.update({
                where: { id: entry.id },
                data: { totalPoints: entry.totalPoints },
              });
            }

            const placements = calculateContestPlacements(
              sortedEntries.map((entry) => ({
                id: entry.id,
                userId: entry.userId,
                totalPoints: entry.totalPoints,
              })),
              prizePool,
              distribution
            );

            for (const tiedEntry of placements) {
              await tx.contestEntry.update({
                where: { id: tiedEntry.id },
                data: { rank: tiedEntry.rank, prizeWon: tiedEntry.prizeWon },
              });

              if (tiedEntry.prizeWon > 0) {
                await tx.user.update({
                  where: { id: tiedEntry.userId },
                  data: { tokenBalance: { increment: tiedEntry.prizeWon } },
                });
              }
            }

            const prizeTransactions = placements
              .filter((entry) => entry.prizeWon > 0)
              .map((entry) => ({
                userId: entry.userId,
                type: "CONTEST_PRIZE" as const,
                amount: entry.prizeWon,
                status: "APPROVED" as const,
              }));

            if (prizeTransactions.length > 0) {
              await tx.tokenTransaction.createMany({
                data: prizeTransactions,
              });
            }
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
      });
    }

    await prisma.match.update({
      where: { id: matchId },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json({ message: "Scoring complete, prizes distributed" });
  } catch (e) {
    console.error("[finalize scoring]", e);
    if (e instanceof AdminScoringError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : "Server error";
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
