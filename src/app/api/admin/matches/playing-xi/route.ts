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

    // Set isInPlayingXI = false for all players in this match first
    // Or just update the ones provided. Let's do a transaction for reliability.
    
    await prisma.$transaction(
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
