import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCricScore, fetchScorecard, parseScorecard, isTeamMatch, isMatchEnded, getTotalUsageToday, getBestAvailableKeyIndex } from "@/lib/cricket-api";
import { calculateFantasyPoints, calculateEntryPoints } from "@/lib/scoring";
import { syncMatchStatuses } from "@/lib/match-sync";

/**
 * GET /api/jobs/fetch-scores
 *
 * Called by Vercel Cron every 2 minutes.
 * Protected by CRON_SECRET header — Vercel automatically sends this.
 *
 * Flow:
 * 1. Validate cron secret
 * 2. Check API budget — skip if all keys exhausted
 * 3. Sync match statuses (UPCOMING → LIVE based on date)
 * 4. Find LIVE matches
 * 5. For each LIVE match: fetch scorecard, save stats, update entry points
 * 6. Detect match end via API signal → mark COMPLETED
 * 7. Log everything to cron_logs
 */
export async function GET(req: Request) {
  const startedAt = Date.now();

  // 1. Validate cron secret — prevents unauthorized triggers
  // Vercel sends this automatically. If CRON_SECRET is not set (e.g. local dev),
  // we allow the call only if it comes from localhost.
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // 2. Check API budget before doing anything
    const bestKeyIndex = await getBestAvailableKeyIndex();
    const totalUsedToday = await getTotalUsageToday();

    if (bestKeyIndex === -1) {
      // All keys exhausted — log and bail out gracefully
      await prisma.cronLog.create({
        data: {
          skipped: true,
          notes: `All API keys exhausted for today. Total hits: ${totalUsedToday}`,
        },
      });
      console.warn(`[Cron] Skipped — all API keys exhausted (${totalUsedToday} total hits today)`);
      return NextResponse.json({ skipped: true, reason: "API budget exhausted", totalUsedToday });
    }

    // 3. Sync match statuses — flip UPCOMING → LIVE if date has passed
    await syncMatchStatuses();

    // 4. Find all LIVE matches
    const liveMatches = await prisma.match.findMany({
      where: { status: "LIVE" },
    });

    if (liveMatches.length === 0) {
      await prisma.cronLog.create({
        data: {
          skipped: true,
          requestsUsedToday: totalUsedToday,
          notes: "No LIVE matches found",
        },
      });
      return NextResponse.json({ skipped: true, reason: "No live matches", totalUsedToday });
    }

    // 5. Process each live match
    const results = [];

    for (const match of liveMatches) {
      const matchLabel = `${match.team1} vs ${match.team2}`;
      let apiMatchId = match.cricApiMatchId;
      let matchEndedFlag = false;
      let statsCount = 0;
      let keyUsed: number | null = null;
      let errorMsg: string | null = null;

      try {
        // 5a. Discover API match ID if not cached
        if (!apiMatchId) {
          console.log(`[Cron] Discovering API match ID for ${matchLabel}`);
          const apiMatches = await fetchCricScore();
          const found = apiMatches.find((m: any) => {
            return (
              (isTeamMatch(match.team1, m.t1) && isTeamMatch(match.team2, m.t2)) ||
              (isTeamMatch(match.team1, m.t2) && isTeamMatch(match.team2, m.t1))
            );
          });

          if (found) {
            apiMatchId = found.id;
            await prisma.match.update({
              where: { id: match.id },
              data: { cricApiMatchId: apiMatchId },
            });
            console.log(`[Cron] Found API match ID: ${apiMatchId} for ${matchLabel}`);
          } else {
            throw new Error(`Could not find ${matchLabel} on CricAPI`);
          }
        }

        // 5b. Fetch scorecard
        const { scorecard: apiScorecard, keyIndex } = await fetchScorecard(apiMatchId as string);
        keyUsed = keyIndex + 1; // 1-indexed for display

        // 5c. Check if match has ended
        matchEndedFlag = isMatchEnded(apiScorecard);

        // 5d. Get DB players for this match
        const dbPlayers = await prisma.player.findMany({
          where: {
            team: { in: [match.team1, match.team2] },
            season: match.season,
          },
        });

        // 5e. Parse scorecard into player stats
        const playerStats = parseScorecard(apiScorecard, dbPlayers);
        statsCount = playerStats.length;

        // 5f. Upsert all player stats + recalculate fantasy points
        // Fetch existing XI/impact flags (set by admin before match)
        const existingRows = await prisma.playerMatchStats.findMany({
          where: { matchId: match.id },
          select: { playerId: true, isInPlayingXI: true, isImpactPlayer: true },
        });
        const xiMap = new Map(existingRows.map(r => [r.playerId, { isInPlayingXI: r.isInPlayingXI, isImpactPlayer: r.isImpactPlayer }]));

        for (const stat of playerStats) {
          const xi = xiMap.get(stat.playerId);
          const fantasyPoints = calculateFantasyPoints({
            ...stat,
            isInPlayingXI: xi?.isInPlayingXI ?? false,
            isImpactPlayer: xi?.isImpactPlayer ?? false,
          });
          await prisma.playerMatchStats.upsert({
            where: { playerId_matchId: { playerId: stat.playerId, matchId: match.id } },
            update: { ...stat, fantasyPoints, matchId: undefined, playerId: undefined },
            create: { ...stat, matchId: match.id, fantasyPoints },
          });
        }

        // 5g. Recalculate totalPoints for all contest entries in this match
        const allStats = await prisma.playerMatchStats.findMany({ where: { matchId: match.id } });
        const statsMap = new Map<string, number>();
        for (const s of allStats) {
          statsMap.set(s.playerId, s.fantasyPoints);
        }

        const contests = await prisma.contest.findMany({
          where: { matchId: match.id, status: { in: ["OPEN", "LOCKED"] } },
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

        console.log(`[Cron] ${matchLabel}: saved ${statsCount} player stats, matchEnded=${matchEndedFlag}`);

        // 5h. If match ended via API signal, mark match COMPLETED
        // Note: We do NOT auto-finalize prizes — admin must do that manually.
        if (matchEndedFlag) {
          await prisma.match.update({
            where: { id: match.id },
            data: { status: "COMPLETED" },
          });
          console.log(`[Cron] ${matchLabel} marked COMPLETED (API signalled match end)`);
        }

      } catch (err) {
        errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Cron] Error processing ${matchLabel}:`, errorMsg);
      }

      // Log this match's cron run
      const updatedUsage = await getTotalUsageToday();
      await prisma.cronLog.create({
        data: {
          matchId: match.id,
          matchName: matchLabel,
          apiKeyUsed: keyUsed,
          requestsUsedToday: updatedUsage,
          matchEnded: matchEndedFlag,
          statsCount,
          error: errorMsg,
          skipped: false,
        },
      });

      results.push({
        match: matchLabel,
        statsCount,
        matchEnded: matchEndedFlag,
        keyUsed,
        error: errorMsg,
      });
    }

    const elapsed = Date.now() - startedAt;
    console.log(`[Cron] Done in ${elapsed}ms. Matches processed: ${liveMatches.length}`);

    return NextResponse.json({
      processed: liveMatches.length,
      results,
      totalUsedToday: await getTotalUsageToday(),
      elapsedMs: elapsed,
    });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Cron] Fatal error:", errorMsg);

    await prisma.cronLog.create({
      data: {
        skipped: false,
        error: errorMsg,
        notes: "Fatal cron error",
      },
    }).catch(() => {}); // don't throw if logging itself fails

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
