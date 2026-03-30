import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    const players = await prisma.player.findMany({
      orderBy: [{ team: "asc" }, { creditPrice: "desc" }],
    });
    return NextResponse.json({ players });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const { playerId, creditPrice } = await req.json();

    if (!playerId || creditPrice === undefined || creditPrice < 1 || creditPrice > 15) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const player = await prisma.player.update({
      where: { id: playerId },
      data: { creditPrice },
    });

    return NextResponse.json({ player });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
