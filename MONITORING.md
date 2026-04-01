# Stars11 — Match Day Monitoring Guide

## Your Stack at a Glance
```
User → Vercel (Next.js + API Routes + Cron) → Supabase (Postgres)
                                             → CricAPI (3 keys, 100 req/day each)
                                             → Brevo (OTP emails)
```

---

## Pre-Match Checklist (Do this at 7:00 PM)

### 1. Verify Cron is Registered on Vercel
- Go to: vercel.com → your project → **Settings → Cron Jobs**
- You should see: `/api/jobs/fetch-scores` with schedule `*/2 * * * *`
- If missing → `vercel.json` didn't deploy. Check Vercel deployment logs.

### 2. Verify Match is UPCOMING in DB
Run in Supabase SQL editor:
```sql
SELECT team1, team2, date, status FROM matches
WHERE date::date = CURRENT_DATE
ORDER BY date;
```
Expected: status = `UPCOMING`

### 3. Verify API Budget is Fresh
```sql
SELECT "keyIndex", "hitCount", 90 - "hitCount" as remaining
FROM api_key_usage
WHERE date = CURRENT_DATE
ORDER BY "keyIndex";
```
Expected: 0 rows (no hits yet today) or low hit counts. All 3 keys should have 80+ remaining.

### 4. Open Vercel Live Logs
- Go to: vercel.com → your project → **Logs**
- Search box: type `Cron`
- Toggle **Live** mode ON
- Keep this tab open during the match

---

## During the Match — What to Expect

### Timeline
| Time | Expected Event | How to Verify |
|------|---------------|---------------|
| 7:30 PM | Cron runs, flips match LIVE | Vercel logs: `[Cron] LSG vs DC: saved X player stats` |
| 7:32 PM | First scorecard fetch attempted | `cron_logs` table — new row every 2 min |
| 7:34 PM+ | Stats saving, points updating | Contest leaderboard updating on UI |
| During match | API keys being used | `api_key_usage` table |
| Match ends | `matchEnded: true` logged | `cron_logs` last row |
| After end | Match auto-marked COMPLETED | Check match status in DB |
| After end | **You** finalize prizes | Admin panel → Scoring → Finalize & Distribute Prizes |

### Every 2 Minutes During Match — Cron Should Log This
```sql
SELECT "ranAt", "matchName", "apiKeyUsed", "requestsUsedToday", "statsCount", "matchEnded", "error"
FROM cron_logs
ORDER BY "ranAt" DESC
LIMIT 5;
```
**Healthy output looks like:**
- `skipped = false`
- `statsCount` = 20–30 (number of players with stats)
- `error = null`
- `requestsUsedToday` incrementing by 1 every 2 min
- `matchEnded = false` until match ends, then `true`

**If `error` is not null** → check Vercel logs for full error message.

---

## API Budget Monitoring

### Check Remaining Budget
```sql
SELECT
  "keyIndex" + 1 as key_number,
  "hitCount" as used,
  90 - "hitCount" as safe_remaining,
  100 - "hitCount" as total_remaining
FROM api_key_usage
WHERE date = CURRENT_DATE
ORDER BY "keyIndex";
```

### Budget Rules (coded into the app)
- Each key has a **safe limit of 90/day** (10 kept as buffer for manual admin use)
- App automatically switches to next key when one hits 90
- If all 3 keys hit 90 → cron skips with `reason: "API budget exhausted"` — no crash
- A 210-min match at 1 req/2min = ~105 requests total — well within 270 safe limit

---

## Checking Points are Updating

During the match, verify contest entries are getting updated points:
```sql
SELECT ce."totalPoints", u.username, ce."updatedAt"
FROM contest_entries ce
JOIN contests c ON c.id = ce."contestId"
JOIN matches m ON m.id = c."matchId"
JOIN users u ON u.id = ce."userId"
WHERE m.date::date = CURRENT_DATE
ORDER BY ce."totalPoints" DESC;
```
Points should change every 2 minutes as cron saves new stats.

---

## Match Ended — What Happens

1. CricAPI returns `matchEnded: true` or status contains "won"
2. Cron automatically marks match as `COMPLETED`
3. `cron_logs` will show `matchEnded = true`
4. Admin scoring desk shows banner: **"Match ended — ready to finalize"**
5. **Go to Admin → Scoring → select the match → click "Finalize & Distribute Prizes"**
6. Prizes auto-distributed, tokens credited to winners

### Verify Prizes Distributed
```sql
SELECT u.username, u."tokenBalance", tt.amount, tt.type, tt."createdAt"
FROM token_transactions tt
JOIN users u ON u.id = tt."userId"
WHERE tt.type = 'CONTEST_PRIZE'
AND tt."createdAt"::date = CURRENT_DATE
ORDER BY tt."createdAt" DESC;
```

---

## Vercel Logs — Key Search Terms

| Search term | What it finds |
|-------------|--------------|
| `Cron` | All cron activity |
| `[Cron] Fatal` | Complete cron failures |
| `rate limit` | API key limit hit |
| `matchEnded` | Match completion events |
| `500` | All server errors |
| `fetch-scores` | Just the cron route |

---

## Supabase Logs

Go to: supabase.com → your project → **Logs** (left sidebar)

- **API Logs** — every DB query, slow query warnings
- **Postgres Logs** — raw DB errors, constraint violations

Most useful during match: keep Supabase SQL editor open and re-run the `cron_logs` query manually every 10 minutes to confirm cron is running.

---

## Something Went Wrong — Quick Fixes

### Cron not running / match not going LIVE
```sql
-- Manually flip match to LIVE
UPDATE matches SET status = 'LIVE'
WHERE date::date = CURRENT_DATE AND status = 'UPCOMING';
```
Then hit the cron manually via Vercel dashboard → Cron Jobs → Run Now.

### Stats not updating / API failing
- Check Vercel logs for `[CricAPI]` errors
- If all keys exhausted, cron will skip gracefully — no action needed until tomorrow
- Admin can still manually fetch and save via Admin → Scoring → "Fetch from API"

### Need to manually trigger cron
```bash
curl -X GET https://your-prod-url.vercel.app/api/jobs/fetch-scores \
  -H "Authorization: Bearer stars11_cron_secret_2026"
```

### Points look wrong after match
- Admin → Scoring → select match → "Fetch from API" → review stats → "Save Stats"
- This overwrites whatever cron saved with fresh data
- Then "Finalize & Distribute Prizes"

---

## Two Matches in One Day (e.g. 3:30 PM + 7:30 PM)

- Cron handles both automatically — each match is processed independently
- At 3:30 PM: first match goes LIVE, cron fetches it
- When first match ends: marked COMPLETED, cron stops fetching it
- At 7:30 PM: second match goes LIVE, cron starts fetching it
- You finalize each match separately in admin panel after each ends

---

## Admin Panel Quick Access

- **Scoring desk**: `/admin` → Scoring tab
- Shows: last cron run time, players saved, API hits today, match ended flag
- Buttons: Fetch from API (manual), Save Stats, Finalize & Distribute Prizes
