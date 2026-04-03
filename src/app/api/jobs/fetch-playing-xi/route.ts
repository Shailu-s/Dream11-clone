import { NextResponse } from "next/server";
import { syncMatchStatuses } from "@/lib/match-sync";
import { runAutoPlayingXISync } from "@/lib/playing-xi";

/**
 * GET /api/jobs/fetch-playing-xi
 *
 * Intended for external cron (e.g. cron-job.org) every 2-3 minutes.
 * Scrapes confirmed playing XIs in a narrow pre-match/live window and saves them once.
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
    const { processed, results } = await runAutoPlayingXISync();

    return NextResponse.json({
      processed,
      updated: results.filter((result) => result.updated).length,
      results,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[PlayingXI] Cron error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
