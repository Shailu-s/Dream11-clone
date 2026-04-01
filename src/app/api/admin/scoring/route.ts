import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateFantasyPoints, calculateEntryPoints } from "@/lib/scoring";

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
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // Get all contests for this match
    const contests = await prisma.contest.findMany({
      where: { matchId, status: { in: ["LOCKED", "OPEN"] } },
      include: { entries: true },
    });

    for (const contest of contests) {
      // Calculate points for each entry
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

      // Rank entries
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

      // Calculate prize pool
      const prizePool = contest.entryFee * contest.entries.length * (1 - contest.platformCutPct / 100);
      const distribution = contest.prizeDistribution as Array<{
        rank: number;
        percentage: number;
      }>;

      // Only pay out ranks that have participants; redistribute unclaimed % to rank 1
      const numEntries = sortedEntries.length;
      const claimedDistribution = distribution.filter((d) => d.rank <= numEntries);
      const claimedPct = claimedDistribution.reduce((sum, d) => sum + d.percentage, 0);
      const unclaimedPct = 100 - claimedPct;

      // Build effective distribution: rank 1 absorbs all unclaimed percentage
      const effectiveDistribution = claimedDistribution.map((d) => ({
        rank: d.rank,
        percentage: d.rank === 1 ? d.percentage + unclaimedPct : d.percentage,
      }));

      // Assign ranks and prizes
      for (let i = 0; i < sortedEntries.length; i++) {
        const rank = i + 1;
        const prizeDist = effectiveDistribution.find((d) => d.rank === rank);
        const prizeWon = prizeDist ? (prizePool * prizeDist.percentage) / 100 : 0;

        await prisma.contestEntry.update({
          where: { id: sortedEntries[i].id },
          data: { rank, prizeWon },
        });

        // Credit prize to winner
        if (prizeWon > 0) {
          await prisma.$transaction([
            prisma.user.update({
              where: { id: sortedEntries[i].userId },
              data: { tokenBalance: { increment: prizeWon } },
            }),
            prisma.tokenTransaction.create({
              data: {
                userId: sortedEntries[i].userId,
                type: "CONTEST_PRIZE",
                amount: prizeWon,
                status: "APPROVED",
              },
            }),
          ]);
        }
      }

      // Mark contest as completed
      await prisma.contest.update({
        where: { id: contest.id },
        data: { status: "COMPLETED", prizePool },
      });
    }

    // Mark match as completed
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json({ message: "Scoring complete, prizes distributed" });
  } catch (e) {
    console.error("[finalize scoring]", e);
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
