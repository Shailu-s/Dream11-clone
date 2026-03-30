import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  // Auto-update match statuses: mark matches COMPLETED 4+ hours after start time
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
  await prisma.match.updateMany({
    where: { status: "UPCOMING", date: { lt: fourHoursAgo } },
    data: { status: "COMPLETED" },
  });

  const where = status ? { status: status as "UPCOMING" | "LIVE" | "COMPLETED" } : {};

  const matches = await prisma.match.findMany({
    where,
    orderBy: { date: "asc" },
    include: { _count: { select: { contests: true } } },
  });

  return NextResponse.json({ matches });
}
