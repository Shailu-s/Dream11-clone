import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const { matchId, status, lockTime } = await req.json();

    // Must provide either status or lockTime
    if (!matchId || (!status && lockTime === undefined)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Handle lock time extension
    if (lockTime !== undefined) {
      const newLockTime = lockTime ? new Date(lockTime) : null;
      if (newLockTime && newLockTime <= new Date()) {
        return NextResponse.json({ error: "Lock time must be in the future" }, { status: 400 });
      }
      const match = await prisma.match.update({
        where: { id: matchId },
        data: { lockTime: newLockTime },
      });
      return NextResponse.json({ match });
    }

    // Handle status change
    if (!["UPCOMING", "LIVE", "COMPLETED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized" || msg === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("[admin/matches PUT]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
