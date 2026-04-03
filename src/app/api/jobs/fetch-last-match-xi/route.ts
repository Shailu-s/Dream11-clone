import { NextResponse } from "next/server";
import { syncMatchStatuses } from "@/lib/match-sync";
import { runLastMatchXISync } from "@/lib/playing-xi";

/**
 * GET /api/jobs/fetch-last-match-xi
 *
 * Intended for an external cron running once per day.
 * Seeds "Last Match XI" flags for upcoming matches using each team's most recent confirmed XI.
 */
export async function GET(req: Request) {
  const startedAt = Date.now();
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await syncMatchStatuses();
    const { processed, updatedTeams, results } = await runLastMatchXISync();

    return NextResponse.json({
      processed,
      updatedTeams,
      results,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[LastMatchXI] Cron error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
