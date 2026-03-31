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
  }) as any[];

  // Transform to include isInPlayingXI as a top-level property
  const result = players.map(p => ({
    ...p,
    isInPlayingXI: p.matchStats?.[0]?.isInPlayingXI ?? false,
    matchStats: undefined // remove extra nesting
  }));

  return NextResponse.json({ players: result });
}
