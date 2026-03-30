import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const { amount, buyerName, upiTransactionId } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!buyerName || buyerName.trim().length < 2) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    // Save fullName to user profile if not already set
    if (!user.fullName) {
      await prisma.user.update({
        where: { id: user.id },
        data: { fullName: buyerName.trim() },
      });
    }

    const transaction = await prisma.tokenTransaction.create({
      data: {
        userId: user.id,
        type: "BUY_REQUEST",
        amount,
        status: "PENDING",
        buyerName: buyerName.trim(),
        upiTransactionId: upiTransactionId?.trim() || null,
      },
    });

    return NextResponse.json({ transaction });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
