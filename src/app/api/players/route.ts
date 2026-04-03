import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team");
  const matchId = searchParams.get("matchId");

  let teams: string[] = [];

  if (matchId) {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (match) {
      teams = [match.team1, match.team2];
    }
  } else if (team) {
    teams = [team];
  }

  const where = teams.length > 0 ? { team: { in: teams } } : {};

  const players = await prisma.player.findMany({
    where,
    include: {
      matchStats: matchId ? {
        where: { matchId }
      } : false
    },
    orderBy: [{ role: "asc" }, { creditPrice: "desc" }],
  });

  const playerIds = players.map((player) => player.id);
  const currentMatch = matchId
    ? await prisma.match.findUnique({
        where: { id: matchId },
        select: { id: true, date: true, season: true },
      })
    : null;

  const recentStats = playerIds.length === 0
    ? []
    : await prisma.playerMatchStats.findMany({
        where: {
          playerId: { in: playerIds },
          match: {
            status: "COMPLETED",
            season: currentMatch?.season,
            ...(currentMatch ? { date: { lt: currentMatch.date } } : {}),
          },
        },
        select: {
          playerId: true,
          fantasyPoints: true,
          match: {
            select: {
              date: true,
            },
          },
        },
        orderBy: [{ match: { date: "desc" } }],
      });

  const recentPointsMap = new Map<string, number[]>();
  for (const stat of recentStats) {
    const existing = recentPointsMap.get(stat.playerId) ?? [];
    if (existing.length >= 5) continue;
    existing.push(stat.fantasyPoints);
    recentPointsMap.set(stat.playerId, existing);
  }

  // Transform to include playing XI fields as top-level properties
  const result = players.map(p => ({
    ...p,
    isInPlayingXI: p.matchStats?.[0]?.isInPlayingXI ?? false,
    isProbableXI: p.matchStats?.[0]?.isProbableXI ?? false,
    isImpactPlayer: p.matchStats?.[0]?.isImpactPlayer ?? false,
    recentFantasyPoints: recentPointsMap.get(p.id) ?? [],
    recentFantasyAvg: (() => {
      const points = recentPointsMap.get(p.id) ?? [];
      if (points.length === 0) return null;
      return points.reduce((sum, point) => sum + point, 0) / points.length;
    })(),
    matchStats: undefined,
  }));

  return NextResponse.json({ players: result });
}
