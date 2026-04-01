import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTotalUsageToday } from "@/lib/cricket-api";

// GET /api/admin/cron-status — returns the last cron run info for the admin scoring desk
export async function GET() {
  try {
    await requireAdmin();

    const lastLog = await prisma.cronLog.findFirst({
      where: { skipped: false },
      orderBy: { ranAt: "desc" },
    });

    const requestsUsedToday = await getTotalUsageToday();

    if (!lastLog) {
      return NextResponse.json({
        lastRanAt: null,
        matchName: null,
        statsCount: null,
        matchEnded: false,
        error: null,
        requestsUsedToday,
      });
    }

    return NextResponse.json({
      lastRanAt: lastLog.ranAt,
      matchName: lastLog.matchName,
      statsCount: lastLog.statsCount,
      matchEnded: lastLog.matchEnded,
      error: lastLog.error,
      requestsUsedToday,
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
