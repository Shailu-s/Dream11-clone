import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePlayerSelections, resolvePlayerDetails } from "@/lib/player-utils";

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
          match: { select: { id: true, team1: true, team2: true, date: true, status: true, lockTime: true } },
        },
      },
    },
  });

  if (!entry || entry.contestId !== contestId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = user?.id === entry.userId;
  const matchStarted =
    entry.contest.match.status !== "UPCOMING" ||
    (entry.contest.match.lockTime ?? entry.contest.match.date) <= new Date();

  // Don't reveal team composition to other users before match starts
  if (!isOwner && !matchStarted) {
    return NextResponse.json({
      entry: {
        id: entry.id,
        teamName: entry.teamName,
        totalPoints: entry.totalPoints,
        rank: entry.rank,
        prizeWon: entry.prizeWon,
        userId: entry.userId,
        contestId: entry.contestId,
        user: entry.user,
        contest: entry.contest,
        players: [],
        team: [],
      },
      isOwner: false,
      teamHidden: true,
    });
  }

  // Resolve player details from the players JSON
  const playerSelections = entry.players as Array<{
    playerId: string;
    isCaptain: boolean;
    isViceCaptain: boolean;
  }>;

  const team = await resolvePlayerDetails(playerSelections, entry.contest.match.id);

  return NextResponse.json({
    entry: { ...entry, team },
    isOwner,
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

    if ((entry.contest.match.lockTime ?? entry.contest.match.date) <= new Date()) {
      return NextResponse.json({ error: "Match has already started" }, { status: 400 });
    }

    // If team name is changing, check for duplicate within this contest for this user
    const newTeamName = teamName?.trim() || entry.teamName;
    if (newTeamName !== entry.teamName) {
      const dupe = await prisma.contestEntry.findFirst({
        where: { contestId, userId: user.id, teamName: newTeamName, id: { not: entryId } },
      });
      if (dupe) {
        return NextResponse.json({ error: "This team name already exists in this contest." }, { status: 400 });
      }
    }

    // Validate team
    const result = await validatePlayerSelections(players);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await prisma.contestEntry.update({
      where: { id: entryId },
      data: {
        players,
        teamName: newTeamName,
      },
    });

    return NextResponse.json({ message: "Team updated" });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray(err.meta?.target) &&
      err.meta.target.includes("contestId") &&
      err.meta.target.includes("userId") &&
      err.meta.target.includes("teamName")
    ) {
      return NextResponse.json({ error: "This team name already exists in this contest." }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "Failed to update team";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
