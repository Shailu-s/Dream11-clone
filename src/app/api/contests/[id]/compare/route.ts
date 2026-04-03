import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/contests/[id]/compare?entry1=X&entry2=Y
 *
 * Returns both teams with resolved player details for comparison.
 * Teams are hidden before match starts (same rule as entry detail).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contestId } = await params;
  const url = new URL(req.url);
  const entry1Id = url.searchParams.get("entry1");
  const entry2Id = url.searchParams.get("entry2");

  if (!entry1Id || !entry2Id) {
    return NextResponse.json({ error: "Both entry1 and entry2 are required" }, { status: 400 });
  }

  if (entry1Id === entry2Id) {
    return NextResponse.json({ error: "Cannot compare a team with itself" }, { status: 400 });
  }

  const user = await getSession();

  // Fetch both entries + contest/match in one query
  const entries = await prisma.contestEntry.findMany({
    where: { id: { in: [entry1Id, entry2Id] }, contestId },
    include: {
      user: { select: { username: true } },
      contest: {
        include: {
          match: { select: { id: true, team1: true, team2: true, date: true, status: true } },
        },
      },
    },
  });

  if (entries.length !== 2) {
    return NextResponse.json({ error: "One or both entries not found in this contest" }, { status: 404 });
  }

  const entry1 = entries.find(e => e.id === entry1Id)!;
  const entry2 = entries.find(e => e.id === entry2Id)!;
  const match = entry1.contest.match;

  // Don't reveal teams before match starts
  const matchStarted = match.status !== "UPCOMING" || match.date <= new Date();
  if (!matchStarted) {
    return NextResponse.json({ error: "Teams are hidden until match starts" }, { status: 403 });
  }

  // Parse player selections
  type Selection = { playerId: string; isCaptain: boolean; isViceCaptain: boolean };
  const sel1 = entry1.players as Selection[];
  const sel2 = entry2.players as Selection[];

  // Collect all unique player IDs across both teams
  const allPlayerIds = [...new Set([...sel1.map(s => s.playerId), ...sel2.map(s => s.playerId)])];

  // Single batch query for player info + stats
  const [players, playerStats] = await Promise.all([
    prisma.player.findMany({
      where: { id: { in: allPlayerIds } },
      select: { id: true, name: true, team: true, role: true, creditPrice: true },
    }),
    prisma.playerMatchStats.findMany({
      where: { matchId: match.id, playerId: { in: allPlayerIds } },
      select: { playerId: true, fantasyPoints: true },
    }),
  ]);

  const playerMap = new Map(players.map(p => [p.id, p]));
  const statsMap = new Map(playerStats.map(s => [s.playerId, s.fantasyPoints]));

  // Build resolved teams
  function resolveTeam(selections: Selection[]) {
    return selections.map(sel => ({
      ...sel,
      player: playerMap.get(sel.playerId) ?? null,
      fantasyPoints: statsMap.get(sel.playerId) ?? 0,
    }));
  }

  return NextResponse.json({
    entry1: {
      id: entry1.id,
      teamName: entry1.teamName,
      totalPoints: entry1.totalPoints,
      rank: entry1.rank,
      user: entry1.user,
      team: resolveTeam(sel1),
    },
    entry2: {
      id: entry2.id,
      teamName: entry2.teamName,
      totalPoints: entry2.totalPoints,
      rank: entry2.rank,
      user: entry2.user,
      team: resolveTeam(sel2),
    },
    match: {
      team1: match.team1,
      team2: match.team2,
      status: match.status,
    },
  });
}
