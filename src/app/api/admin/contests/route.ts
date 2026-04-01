import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// List all contests for admin
export async function GET() {
  try {
    await requireAdmin();
    const contests = await prisma.contest.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        entryFee: true,
        match: { select: { team1: true, team2: true, date: true } },
        creator: { select: { username: true } },
        _count: { select: { entries: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ contests });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

// Cancel a contest and refund all entry fees
export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { contestId } = await req.json();

    if (!contestId) {
      return NextResponse.json({ error: "contestId required" }, { status: 400 });
    }

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: { entries: true },
    });

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    if (contest.status === "COMPLETED" || contest.status === "CANCELLED") {
      return NextResponse.json({ error: "Contest already finalized" }, { status: 400 });
    }

    // Refund all participants
    for (const entry of contest.entries) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: entry.userId },
          data: { tokenBalance: { increment: contest.entryFee } },
        }),
        prisma.tokenTransaction.create({
          data: {
            userId: entry.userId,
            type: "CONTEST_REFUND",
            amount: contest.entryFee,
            status: "APPROVED",
          },
        }),
      ]);
    }

    // Mark contest as cancelled
    await prisma.contest.update({
      where: { id: contestId },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({
      message: `Contest cancelled, ${contest.entries.length} entries refunded`,
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
