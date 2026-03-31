import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchCricScore, fetchScorecard, parseScorecard, isTeamMatch } from "@/lib/cricket-api";
import { calculateFantasyPoints, calculateEntryPoints } from "@/lib/scoring";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get("matchId");

    if (!matchId) {
      return NextResponse.json({ error: "matchId required" }, { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    let apiMatchId = match.cricApiMatchId;

    // 1. If no API ID, try to find it
    if (!apiMatchId) {
      console.log(`Searching for API match ID for ${match.team1} vs ${match.team2}`);
      const apiMatches = await fetchCricScore();
      
      // Match by teams and date (within 24 hours)
      const foundMatch = apiMatches.find((m: any) => {
        const teamMatch = (isTeamMatch(match.team1, m.t1) && isTeamMatch(match.team2, m.t2)) ||
                        (isTeamMatch(match.team1, m.t2) && isTeamMatch(match.team2, m.t1));
        
        return teamMatch;
      });

      if (foundMatch) {
        apiMatchId = foundMatch.id;
        await prisma.match.update({
          where: { id: matchId },
          data: { cricApiMatchId: apiMatchId },
        });
      }
    }

    if (!apiMatchId) {
      return NextResponse.json({ 
        error: "Could not find this match on Cricket API. Please link it manually." 
      }, { status: 404 });
    }

    // 2. Fetch scorecard
    const apiScorecard = await fetchScorecard(apiMatchId);

    // 3. Get all players for these teams to facilitate matching
    const dbPlayers = await prisma.player.findMany({
      where: {
        team: { in: [match.team1, match.team2] },
        season: match.season,
      },
    });

    // 4. Parse scorecard
    const playerStats = parseScorecard(apiScorecard, dbPlayers);

    // Phase 2: Auto-save if requested
    const autoSave = searchParams.get("autoSave") === "true";
    if (autoSave && playerStats.length > 0) {
      console.log(`Auto-saving stats for match ${matchId}`);
      for (const stat of playerStats) {
        const fantasyPoints = calculateFantasyPoints(stat);
        await prisma.playerMatchStats.upsert({
          where: {
            playerId_matchId: { playerId: stat.playerId, matchId },
          },
          update: { ...stat, fantasyPoints, matchId: undefined, playerId: undefined },
          create: { ...stat, matchId, fantasyPoints },
        });
      }

      // Recalculate points for all contest entries
      const statsMap = new Map<string, number>();
      playerStats.forEach(s => statsMap.set(s.playerId, calculateFantasyPoints(s)));

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
    }

    return NextResponse.json({ 
      apiMatchId,
      playerStats,
      matchName: apiScorecard.name,
      status: apiScorecard.status,
      autoSaved: autoSave
    });

  } catch (error: any) {
    console.error("Fetch API Error:", error);
    return NextResponse.json({ error: error.message || "Forbidden" }, { status: 403 });
  }
}
