import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    await requireAuth();
    const { inviteCode } = await req.json();

    if (!inviteCode) {
      return NextResponse.json({ error: "Invite code required" }, { status: 400 });
    }

    const contest = await prisma.contest.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: { match: true, _count: { select: { entries: true } } },
    });

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    if (contest.status !== "OPEN") {
      return NextResponse.json({ error: "Contest is not open for joining" }, { status: 400 });
    }

    if (contest.maxParticipants && contest._count.entries >= contest.maxParticipants) {
      return NextResponse.json({ error: "Contest is full" }, { status: 400 });
    }

    return NextResponse.json({ contest });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
