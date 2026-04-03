import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_SERIALIZABLE_RETRIES = 3;

class WithdrawRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    await withSerializableRetry(async () => {
      await prisma.$transaction(
        async (tx) => {
          const updatedUsers = await tx.user.updateMany({
            where: { id: user.id, tokenBalance: { gte: amount } },
            data: { tokenBalance: { decrement: amount } },
          });

          if (updatedUsers.count === 0) {
            throw new WithdrawRequestError("Insufficient balance");
          }

          await tx.tokenTransaction.create({
            data: {
              userId: user.id,
              type: "SELL_REQUEST",
              amount,
              status: "PENDING",
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    });

    return NextResponse.json({ message: "Withdrawal request submitted" });
  } catch (err) {
    if (err instanceof WithdrawRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (isSerializableConflict(err)) {
      return NextResponse.json({ error: "Your balance changed while submitting this withdrawal. Please try again." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
