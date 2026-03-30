import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const team = await prisma.savedTeam.findUnique({
      where: { id },
      include: {
        match: { select: { id: true, team1: true, team2: true, date: true, status: true } },
      },
    });

    if (!team || team.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Resolve player details
    const playerSelections = team.players as Array<{
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
    const resolvedPlayers = playerSelections.map((sel) => ({
      ...sel,
      player: playerMap.get(sel.playerId) ?? null,
    }));

    return NextResponse.json({ team: { ...team, players: resolvedPlayers } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch team";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { teamName, players } = await req.json();

    const existing = await prisma.savedTeam.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const team = await prisma.savedTeam.update({
      where: { id },
      data: {
        ...(teamName?.trim() ? { teamName: teamName.trim() } : {}),
        ...(Array.isArray(players) && players.length === 11 ? { players } : {}),
      },
    });

    return NextResponse.json({ team });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update team";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.savedTeam.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.savedTeam.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete team";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
