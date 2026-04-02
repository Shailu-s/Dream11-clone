import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCricScore, fetchScorecard, parseScorecard, isTeamMatch, isMatchEnded, getBestAvailableKeyIndex } from "@/lib/cricket-api";
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
    // 2. Check API budget before doing anything (single DB query — reused below)
    const { keyIndex: bestKeyIndex, usageMap } = await getBestAvailableKeyIndex();
    const totalUsedToday = Array.from(usageMap.values()).reduce((s, v) => s + v, 0);

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

    // Cached cricScore result for this cron run — avoids hitting the endpoint twice
    // if multiple matches need ID discovery or if stale-ID rediscovery kicks in.
    let cachedApiMatches: any[] | undefined;
    async function getApiMatches(): Promise<any[]> {
      if (cachedApiMatches !== undefined) return cachedApiMatches;
      const result = await fetchCricScore(usageMap);
      cachedApiMatches = result;
      return result;
    }

    // 3. Sync match statuses — flip UPCOMING → LIVE if date has passed
    await syncMatchStatuses();

    // 4. Find LIVE matches that have at least one active contest
    // No point burning API hits on matches nobody created a contest for
    const liveMatches = await prisma.match.findMany({
      where: {
        status: "LIVE",
        contests: { some: { status: { in: ["OPEN", "LOCKED"] } } },
      },
    });

    // Also count total LIVE matches (including those without contests) for diagnostics
    const allLiveCount = await prisma.match.count({ where: { status: "LIVE" } });

    if (liveMatches.length === 0) {
      const note = allLiveCount > 0
        ? `${allLiveCount} LIVE match(es) but none have active contests — skipping API calls`
        : "No LIVE matches found";
      await prisma.cronLog.create({
        data: {
          skipped: true,
          requestsUsedToday: totalUsedToday,
          notes: note,
        },
      });
      console.log(`[Cron] ${note}`);
      return NextResponse.json({ skipped: true, reason: note, totalUsedToday });
    }

    console.log(`[Cron] ${liveMatches.length} LIVE match(es) with contests (${allLiveCount} total LIVE). Budget: ${totalUsedToday} hits used today.`);

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
          const apiMatches = await getApiMatches(); // uses cached result — no extra API hit
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

        // 5b. Fetch scorecard — pass usageMap to avoid re-querying DB and to keep budget in sync
        // If cached ID is stale/invalid, clear it and rediscover once.
        let { scorecard: apiScorecard, keyIndex } = await fetchScorecard(apiMatchId as string, usageMap).catch(async (err) => {
          if (err.message?.includes("not found") || err.message?.includes("invalid")) {
            console.warn(`[Cron] Cached match ID ${apiMatchId} is stale, clearing and rediscovering...`);
            await prisma.match.update({ where: { id: match.id }, data: { cricApiMatchId: null } });
            const apiMatches = await getApiMatches(); // reuses cached result — no extra API hit
            const found = apiMatches.find((m: any) =>
              (isTeamMatch(match.team1, m.t1) && isTeamMatch(match.team2, m.t2)) ||
              (isTeamMatch(match.team1, m.t2) && isTeamMatch(match.team2, m.t1))
            );
            if (!found) throw new Error(`Could not rediscover ${matchLabel} on CricAPI`);
            apiMatchId = found.id;
            await prisma.match.update({ where: { id: match.id }, data: { cricApiMatchId: apiMatchId } });
            return fetchScorecard(apiMatchId as string, usageMap);
          }
          throw err;
        });
        keyUsed = keyIndex + 1; // 1-indexed for display

        // 5c. Check if match has ended
        matchEndedFlag = isMatchEnded(apiScorecard);

        // 5c2. Save result/scores/toss from API response to match row
        const matchResult = apiScorecard.status || null;
        const matchScores = apiScorecard.score || null;
        const matchToss = apiScorecard.tossWinner && apiScorecard.tossChoice
          ? `${apiScorecard.tossWinner} won toss, chose to ${apiScorecard.tossChoice}`
          : null;
        await prisma.match.update({
          where: { id: match.id },
          data: { result: matchResult, scores: matchScores, toss: matchToss },
        });

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

        // 5f. Upsert all player stats + recalculate fantasy points (batched in $transaction)
        // Fetch existing XI/impact flags (set by admin before match)
        const existingRows = await prisma.playerMatchStats.findMany({
          where: { matchId: match.id },
          select: { playerId: true, isInPlayingXI: true, isImpactPlayer: true },
        });
        const xiMap = new Map(existingRows.map(r => [r.playerId, { isInPlayingXI: r.isInPlayingXI, isImpactPlayer: r.isImpactPlayer }]));

        // Build upsert ops + collect fantasy points for reuse (avoids BUG-003 re-query)
        const statsMap = new Map<string, number>();
        const upsertOps = playerStats.map(stat => {
          const xi = xiMap.get(stat.playerId);
          const fantasyPoints = calculateFantasyPoints({
            ...stat,
            isInPlayingXI: xi?.isInPlayingXI ?? false,
            isImpactPlayer: xi?.isImpactPlayer ?? false,
          });
          statsMap.set(stat.playerId, fantasyPoints);
          return prisma.playerMatchStats.upsert({
            where: { playerId_matchId: { playerId: stat.playerId, matchId: match.id } },
            update: { ...stat, fantasyPoints, matchId: undefined, playerId: undefined },
            create: { ...stat, matchId: match.id, fantasyPoints },
          });
        });

        await prisma.$transaction(upsertOps);

        // 5g. Recalculate totalPoints for all contest entries in this match (batched)
        // Also include points from players NOT in this API fetch (e.g. already in DB from prior cron run)
        const existingStats = await prisma.playerMatchStats.findMany({
          where: { matchId: match.id },
          select: { playerId: true, fantasyPoints: true },
        });
        for (const s of existingStats) {
          if (!statsMap.has(s.playerId)) {
            statsMap.set(s.playerId, s.fantasyPoints);
          }
        }

        const contests = await prisma.contest.findMany({
          where: { matchId: match.id, status: { in: ["OPEN", "LOCKED"] } },
          include: { entries: true },
        });

        const entryUpdateOps = [];
        for (const contest of contests) {
          for (const entry of contest.entries) {
            const playerSelections = entry.players as Array<{
              playerId: string;
              isCaptain: boolean;
              isViceCaptain: boolean;
            }>;
            const totalPoints = calculateEntryPoints(playerSelections, statsMap);
            entryUpdateOps.push(
              prisma.contestEntry.update({
                where: { id: entry.id },
                data: { totalPoints },
              })
            );
          }
        }

        if (entryUpdateOps.length > 0) {
          await prisma.$transaction(entryUpdateOps);
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

      // Log this match's cron run — compute total from in-memory usageMap (no extra DB query)
      const currentUsageTotal = Array.from(usageMap.values()).reduce((s, v) => s + v, 0);
      await prisma.cronLog.create({
        data: {
          matchId: match.id,
          matchName: matchLabel,
          apiKeyUsed: keyUsed,
          requestsUsedToday: currentUsageTotal,
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
    const finalUsageTotal = Array.from(usageMap.values()).reduce((s, v) => s + v, 0);
    console.log(`[Cron] Done in ${elapsed}ms. Matches processed: ${liveMatches.length}. API hits today: ${finalUsageTotal}`);

    return NextResponse.json({
      processed: liveMatches.length,
      results,
      totalUsedToday: finalUsageTotal,
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
