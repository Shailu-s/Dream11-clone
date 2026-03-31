import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMatchStatuses } from "@/lib/match-sync";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const matchId = searchParams.get("matchId");

  await syncMatchStatuses();

  const where = {
    ...(status ? { status: status as "UPCOMING" | "LIVE" | "COMPLETED" } : {}),
    ...(matchId ? { id: matchId } : {}),
  };

  const matches = await prisma.match.findMany({
    where,
    orderBy: { date: "asc" },
    include: { _count: { select: { contests: true } } },
  });

  return NextResponse.json({ matches });
}
