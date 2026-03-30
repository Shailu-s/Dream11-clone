import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (user.tokenBalance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Deduct tokens immediately (hold) and create pending transaction
    // If admin rejects, tokens will be refunded
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { tokenBalance: { decrement: amount } },
      }),
      prisma.tokenTransaction.create({
        data: {
          userId: user.id,
          type: "SELL_REQUEST",
          amount,
          status: "PENDING",
        },
      }),
    ]);

    return NextResponse.json({ message: "Withdrawal request submitted" });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
