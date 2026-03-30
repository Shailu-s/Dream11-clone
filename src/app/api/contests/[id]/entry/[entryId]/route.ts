import { NextResponse } from "next/server";
import { getSession, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateTeam } from "@/lib/team-validation";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const { id: contestId, entryId } = await params;
  const user = await getSession();

  const entry = await prisma.contestEntry.findUnique({
    where: { id: entryId },
    include: {
      user: { select: { username: true } },
      contest: {
        include: {
          match: { select: { id: true, team1: true, team2: true, date: true, status: true } },
        },
      },
    },
  });

  if (!entry || entry.contestId !== contestId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Resolve player details from the players JSON
  const playerSelections = entry.players as Array<{
    playerId: string;
    isCaptain: boolean;
    isViceCaptain: boolean;
  }>;

  const playerIds = playerSelections.map((p) => p.playerId);
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, name: true, team: true, role: true, creditPrice: true },
  });

  const playerMap = new Map(players.map((p) => [p.id, p]));

  const team = playerSelections.map((sel) => ({
    ...sel,
    player: playerMap.get(sel.playerId) ?? null,
  }));

  return NextResponse.json({
    entry: { ...entry, team },
    isOwner: user?.id === entry.userId,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: contestId, entryId } = await params;
    const { players, teamName } = await req.json();

    const entry = await prisma.contestEntry.findUnique({
      where: { id: entryId },
      include: { contest: { include: { match: true } } },
    });

    if (!entry || entry.contestId !== contestId || entry.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (entry.contest.status !== "OPEN") {
      return NextResponse.json({ error: "Contest is locked" }, { status: 400 });
    }

    if (entry.contest.match.date <= new Date()) {
      return NextResponse.json({ error: "Match has already started" }, { status: 400 });
    }

    // Validate team
    const playerIds = players.map((p: { playerId: string }) => p.playerId);
    const playerData = await prisma.player.findMany({ where: { id: { in: playerIds } } });
    const validation = validateTeam(players, playerData);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    await prisma.contestEntry.update({
      where: { id: entryId },
      data: {
        players,
        teamName: teamName?.trim() || entry.teamName,
      },
    });

    return NextResponse.json({ message: "Team updated" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update team";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
