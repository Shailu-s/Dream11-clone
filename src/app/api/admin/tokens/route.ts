import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_SERIALIZABLE_RETRIES = 3;

class AdminTokenActionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function GET() {
  try {
    await requireAdmin();

    const pendingTransactions = await prisma.tokenTransaction.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { username: true, email: true, tokenBalance: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ transactions: pendingTransactions });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const { transactionId, action, adminNote } = await req.json() as {
      transactionId?: string;
      action?: "APPROVED" | "REJECTED";
      adminNote?: string;
    };

    if (!transactionId || (action !== "APPROVED" && action !== "REJECTED")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await withSerializableRetry(async () => {
      await prisma.$transaction(
        async (tx) => {
          const transaction = await tx.tokenTransaction.findUnique({
            where: { id: transactionId },
          });

          if (!transaction) {
            throw new AdminTokenActionError("Transaction not found", 404);
          }

          const claimed = await tx.tokenTransaction.updateMany({
            where: { id: transactionId, status: "PENDING" },
            data: { status: action, adminNote },
          });

          if (claimed.count === 0) {
            throw new AdminTokenActionError("Transaction not found or already processed", 409);
          }

          if (action === "APPROVED" && transaction.type === "BUY_REQUEST") {
            await tx.user.update({
              where: { id: transaction.userId },
              data: { tokenBalance: { increment: transaction.amount } },
            });
          }

          if (action === "REJECTED" && transaction.type === "SELL_REQUEST") {
            await tx.user.update({
              where: { id: transaction.userId },
              data: { tokenBalance: { increment: transaction.amount } },
            });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    });

    return NextResponse.json({ message: `Transaction ${action.toLowerCase()}` });
  } catch (err) {
    if (err instanceof AdminTokenActionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (isSerializableConflict(err)) {
      return NextResponse.json({ error: "This transaction was updated at the same time. Please retry once." }, { status: 409 });
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
