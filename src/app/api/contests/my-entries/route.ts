import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuth();

    const entries = await prisma.contestEntry.findMany({
      where: { userId: user.id },
      include: {
        contest: {
          select: {
            id: true,
            name: true,
            status: true,
            match: {
              select: {
                team1: true,
                team2: true,
                date: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
