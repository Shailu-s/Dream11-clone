import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { matchId, playingXIs, impactPlayers, confirm } = await req.json();

    if (!matchId || !playingXIs || !Array.isArray(playingXIs)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    // Validate exactly 11 selected per team
    const selectedIds = playingXIs.filter((x: any) => x.selected).map((x: any) => x.playerId);
    const selectedPlayers = await prisma.player.findMany({
      where: { id: { in: selectedIds } },
      select: { id: true, team: true },
    });
    const t1Count = selectedPlayers.filter(p => p.team === match.team1).length;
    const t2Count = selectedPlayers.filter(p => p.team === match.team2).length;
    if (t1Count !== 11 || t2Count !== 11) {
      return NextResponse.json({
        error: `Each team must have exactly 11 players. Got ${match.team1}: ${t1Count}, ${match.team2}: ${t2Count}`
      }, { status: 400 });
    }

    // Validate: no player can be in both playing XI and impact players
    // Only consider impact entries where selected=true AND player is not in playing XI (ignore any corrupted state)
    const impactIds = new Set(
      (impactPlayers || [])
        .filter((x: any) => x.selected && !selectedIds.includes(x.playerId))
        .map((x: any) => x.playerId)
    );
    const overlap = selectedIds.filter(id => impactIds.has(id));
    if (overlap.length > 0) {
      return NextResponse.json({
        error: "A player cannot be in both Playing XI and Impact Players"
      }, { status: 400 });
    }

    // Upsert playing XI entries — never touch isImpactPlayer here (bench players manage that separately)
    await Promise.all(
      playingXIs.map((item: { playerId: string; selected: boolean }) => {
        const data = confirm
          ? { isInPlayingXI: item.selected, isProbableXI: false, isImpactPlayer: false }
          : { isProbableXI: item.selected, isInPlayingXI: false, isImpactPlayer: false };

        // For selected (XI) players always clear isImpactPlayer
        // For non-selected (bench) players do NOT touch isImpactPlayer
        const updateData = item.selected
          ? data
          : { ...(confirm ? { isInPlayingXI: false } : { isProbableXI: false }) };

        return prisma.playerMatchStats.upsert({
          where: { playerId_matchId: { playerId: item.playerId, matchId } },
          update: updateData,
          create: { playerId: item.playerId, matchId, ...data },
        });
      })
    );

    // Upsert impact player entries (bench players only — never touch playing XI players)
    if (impactPlayers && Array.isArray(impactPlayers)) {
      // Only process players that are NOT in the playing XI
      const benchImpact = impactPlayers.filter(
        (item: { playerId: string; selected: boolean }) => !selectedIds.includes(item.playerId)
      );
      await Promise.all(
        benchImpact.map((item: { playerId: string; selected: boolean }) =>
          prisma.playerMatchStats.upsert({
            where: { playerId_matchId: { playerId: item.playerId, matchId } },
            update: { isImpactPlayer: item.selected },
            create: { playerId: item.playerId, matchId, isImpactPlayer: item.selected },
          })
        )
      );
    }

    // If confirming, mark match as playingXIConfirmed
    if (confirm) {
      await prisma.match.update({
        where: { id: matchId },
        data: { playingXIConfirmed: true },
      });
    }

    return NextResponse.json({
      message: confirm ? "Playing XI confirmed" : "Probable XI saved",
    });
  } catch (error: any) {
    console.error("Playing XI Update Error:", error);
    return NextResponse.json({
      error: error.message || "Forbidden or Error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    }, { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 });
  }
}
