import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const { transactionId, action, adminNote } = await req.json();

    if (!transactionId || !["APPROVED", "REJECTED"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const transaction = await prisma.tokenTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.status !== "PENDING") {
      return NextResponse.json({ error: "Transaction not found or already processed" }, { status: 404 });
    }

    if (action === "APPROVED") {
      if (transaction.type === "BUY_REQUEST") {
        // Approve buy: credit tokens to user
        await prisma.$transaction([
          prisma.tokenTransaction.update({
            where: { id: transactionId },
            data: { status: "APPROVED", adminNote },
          }),
          prisma.user.update({
            where: { id: transaction.userId },
            data: { tokenBalance: { increment: transaction.amount } },
          }),
        ]);
      } else {
        // Approve sell: tokens already deducted at request time, just mark approved
        await prisma.tokenTransaction.update({
          where: { id: transactionId },
          data: { status: "APPROVED", adminNote },
        });
      }
    } else {
      // REJECTED
      if (transaction.type === "SELL_REQUEST") {
        // Reject sell: refund the held tokens
        await prisma.$transaction([
          prisma.tokenTransaction.update({
            where: { id: transactionId },
            data: { status: "REJECTED", adminNote },
          }),
          prisma.user.update({
            where: { id: transaction.userId },
            data: { tokenBalance: { increment: transaction.amount } },
          }),
        ]);
      } else {
        // Reject buy: just mark rejected, no balance change
        await prisma.tokenTransaction.update({
          where: { id: transactionId },
          data: { status: "REJECTED", adminNote },
        });
      }
    }

    return NextResponse.json({ message: `Transaction ${action.toLowerCase()}` });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
