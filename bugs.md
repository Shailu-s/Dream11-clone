## Bug Tracker — Stars11 / WGF

### Phase 9: Optimization & Production Readiness

---

#### BUG-001: CricAPI keys exhaust in ~1 hour instead of lasting 4 hours [CRITICAL]
**Status:** FIXED
**Symptoms:** 3 keys x 90 safe hits = 270 budget. A 4-hour match at 1 hit/2min = 120 hits. Should have 150 left over, but keys max out in ~60 min.

**Root causes identified:**

**A) `fetchScorecard()` called WITHOUT `usageMap` in cron job**
- File: `src/app/api/jobs/fetch-scores/route.ts` lines 120, 132
- `fetchScorecard(apiMatchId)` doesn't pass the `usageMap` that was loaded at cron start
- This means EVERY scorecard call triggers a fresh `loadUsageMap()` DB query inside `fetchWithFallback()`
- Not a direct API-hit waster, but causes stale budget decisions when multiple matches are LIVE

**B) Cron fetches scorecards for ALL LIVE matches, even those with ZERO contests**
- File: `src/app/api/jobs/fetch-scores/route.ts` line 68
- `prisma.match.findMany({ where: { status: "LIVE" } })` — no contest filter
- If 3 matches are LIVE but only 1 has contests, 2/3 of API hits are completely wasted
- IPL doubleheaders (3:30 PM + 7:30 PM) mean both matches can be LIVE simultaneously

**C) `match-sync.ts` can keep old matches stuck as LIVE**
- File: `src/lib/match-sync.ts` lines 9-16
- Uses a 4-hour window: any match whose start time is <4 hours ago = LIVE
- If a match ends in 3 hours but the API didn't signal `matchEnded` (network error, cron crash), it stays LIVE for another hour, burning API hits on a finished match
- Timezone mismatch risk: match dates stored as UTC DateTime, but if seeded with IST values, the comparison is off by 5.5 hours — could keep yesterday's match as LIVE

**D) `getTotalUsageToday()` called inside per-match loop (line 231)**
- File: `src/app/api/jobs/fetch-scores/route.ts` line 231
- After processing each match, queries the `api_key_usage` table again
- Also called again at the very end (line 261)
- Not an API hit, but unnecessary DB queries that slow down the cron

**E) Rate-limited responses still count as API hits on CricAPI's side**
- File: `src/lib/cricket-api.ts` lines 116-117
- When a key is rejected by CricAPI, CricAPI still counts it as a hit
- Our code records it too (correct), but the stale usageMap means we may keep trying a key that CricAPI already considers exhausted, wasting hits

---

#### BUG-002: N+1 upserts in cron job — player stats saved one-by-one [HIGH]
**Status:** FIXED
**File:** `src/app/api/jobs/fetch-scores/route.ts` lines 172-184
**Issue:** Each player stat is upserted individually. 22 players = 22 separate DB round-trips per match.
**Fix:** Batch upserts in a `prisma.$transaction()`.

---

#### BUG-003: Redundant stats re-query after upsert [MEDIUM]
**Status:** FIXED
**File:** `src/app/api/jobs/fetch-scores/route.ts` line 187
**Issue:** After upserting all player stats, immediately queries them all again to build `statsMap`. The data was just written — reuse it.

---

#### BUG-004: N+1 contest entry updates [HIGH]
**Status:** FIXED
**File:** `src/app/api/jobs/fetch-scores/route.ts` lines 198-211
**Issue:** Each contest entry's `totalPoints` is updated individually. 10 contests x 5 entries = 50 separate UPDATE queries.
**Fix:** Batch updates in a `prisma.$transaction()`.

---

#### BUG-005: Duplicate score-processing logic in cron and admin route [MEDIUM]
**Status:** OPEN
**Files:** `src/app/api/jobs/fetch-scores/route.ts` and `src/app/api/admin/scoring/fetch-api/route.ts`
**Issue:** Nearly identical logic for upserting stats + recalculating contest entry points. Changes to one must be replicated to the other.
**Fix:** Extract into a shared `src/lib/score-processor.ts` function.

---

#### BUG-006: `syncMatchStatuses()` called from user-facing routes [LOW]
**Status:** FIXED
**Files:** `src/app/api/contests/[id]/route.ts`, `src/app/api/matches/route.ts`, `src/app/api/teams/route.ts`
**Issue:** Every user viewing a contest page, matches page, or teams page triggers 2 `updateMany` queries to sync match statuses. This should only happen in the cron job.
**Fix:** Remove from user-facing routes; rely solely on cron for status transitions.

---

#### BUG-007: No transaction wrapping in cron per-match processing [MEDIUM]
**Status:** OPEN
**File:** `src/app/api/jobs/fetch-scores/route.ts`
**Issue:** If cron crashes after upserting stats but before updating contest entries, data is inconsistent — stats show new values but contest points don't reflect them.
**Fix:** Wrap per-match processing in a `$transaction`.

---

#### BUG-008: No rate limiting on auth endpoints [MEDIUM]
**Status:** OPEN
**Files:** `src/app/api/auth/*`
**Issue:** No rate limiting on OTP send, signup, login. Could enable brute force or spam.

---

#### BUG-009: No input validation middleware [LOW]
**Status:** OPEN
**Issue:** Each route validates request body manually. No centralized schema validation (e.g., Zod).

---

#### BUG-010: Player name matching can silently drop stats [LOW]
**Status:** OPEN
**File:** `src/lib/cricket-api.ts` `findDbPlayer()` function
**Issue:** If API player name doesn't match any DB player via exact/normalized/initial matching, stats are silently dropped. No warning logged.
