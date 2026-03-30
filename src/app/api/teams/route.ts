import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/teams?matchId=... — list user's saved teams (optionally filtered by match)
export async function GET(req: Request) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get("matchId");

    const teams = await prisma.savedTeam.findMany({
      where: {
        userId: user.id,
        ...(matchId ? { matchId } : {}),
      },
      include: {
        match: { select: { id: true, team1: true, team2: true, date: true, status: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ teams });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch teams";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/teams — create a saved team
export async function POST(req: Request) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { matchId, teamName, players } = await req.json();

    if (!matchId || !teamName?.trim() || !Array.isArray(players) || players.length !== 11) {
      return NextResponse.json({ error: "Invalid team data" }, { status: 400 });
    }

    const team = await prisma.savedTeam.create({
      data: {
        userId: user.id,
        matchId,
        teamName: teamName.trim(),
        players,
      },
    });

    return NextResponse.json({ team });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save team";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
