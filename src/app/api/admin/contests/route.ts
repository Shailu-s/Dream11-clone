import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
