import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const { matchId, status } = await req.json();

    if (!matchId || !["UPCOMING", "LIVE", "COMPLETED"].includes(status)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const match = await prisma.match.update({
      where: { id: matchId },
      data: { status },
    });

    // If match is now LIVE, lock all contests for this match
    if (status === "LIVE") {
      await prisma.contest.updateMany({
        where: { matchId, status: "OPEN" },
        data: { status: "LOCKED" },
      });
    }

    return NextResponse.json({ match });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
