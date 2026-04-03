import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_SERIALIZABLE_RETRIES = 3;

class AdminContestActionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

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

    const refundedCount = await withSerializableRetry(async () => {
      return prisma.$transaction(
        async (tx) => {
          const contest = await tx.contest.findUnique({
            where: { id: contestId },
            include: { entries: true },
          });

          if (!contest) {
            throw new AdminContestActionError("Contest not found", 404);
          }

          const claimed = await tx.contest.updateMany({
            where: { id: contestId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
            data: { status: "CANCELLED" },
          });

          if (claimed.count === 0) {
            throw new AdminContestActionError("Contest already finalized", 409);
          }

          for (const entry of contest.entries) {
            await tx.user.update({
              where: { id: entry.userId },
              data: { tokenBalance: { increment: contest.entryFee } },
            });
          }

          if (contest.entries.length > 0) {
            await tx.tokenTransaction.createMany({
              data: contest.entries.map((entry) => ({
                userId: entry.userId,
                type: "CONTEST_REFUND",
                amount: contest.entryFee,
                status: "APPROVED",
              })),
            });
          }

          return contest.entries.length;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    });

    return NextResponse.json({
      message: `Contest cancelled, ${refundedCount} entries refunded`,
    });
  } catch (err) {
    if (err instanceof AdminContestActionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (isSerializableConflict(err)) {
      return NextResponse.json({ error: "This contest was updated at the same time. Please retry once." }, { status: 409 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

async function withSerializableRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (!isSerializableConflict(err) || attempt >= MAX_SERIALIZABLE_RETRIES) {
        throw err;
      }
    }
  }
}

function isSerializableConflict(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
}
