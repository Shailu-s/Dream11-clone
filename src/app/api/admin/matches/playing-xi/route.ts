import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { matchId, playingXIs } = await req.json();

    if (!matchId || !playingXIs || !Array.isArray(playingXIs)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Validate exactly 11 selected per team
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    const selectedIds = playingXIs.filter((x: any) => x.isInPlayingXI).map((x: any) => x.playerId);
    const selectedPlayers = await prisma.player.findMany({
      where: { id: { in: selectedIds } },
      select: { team: true },
    });
    const t1Count = selectedPlayers.filter(p => p.team === match.team1).length;
    const t2Count = selectedPlayers.filter(p => p.team === match.team2).length;
    if (t1Count !== 11 || t2Count !== 11) {
      return NextResponse.json({
        error: `Each team must have exactly 11 players. Got ${match.team1}: ${t1Count}, ${match.team2}: ${t2Count}`
      }, { status: 400 });
    }
    
    await Promise.all(
      playingXIs.map((item: { playerId: string; isInPlayingXI: boolean }) =>
        prisma.playerMatchStats.upsert({
          where: {
            playerId_matchId: {
              playerId: item.playerId,
              matchId: matchId,
            },
          },
          update: {
            isInPlayingXI: item.isInPlayingXI,
          },
          create: {
            playerId: item.playerId,
            matchId: matchId,
            isInPlayingXI: item.isInPlayingXI,
          },
        })
      )
    );

    return NextResponse.json({ message: "Playing XI updated successfully" });
  } catch (error: any) {
    console.error("Playing XI Update Error:", error);
    return NextResponse.json({ 
      error: error.message || "Forbidden or Error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    }, { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 });
  }
}
