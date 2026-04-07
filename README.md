# Stars11 — Fantasy Cricket Platform

Private fantasy cricket app for IPL 2026. Friends create contests, pick Dream11-style teams, compete for virtual token prizes.

---

## Environments

| | Staging (local) | Production |
|---|---|---|
| **Frontend** | `npm run dev` → localhost:3000 | Vercel (auto-deploy on `git push`) |
| **Database** | Local PostgreSQL on port 5433 | Supabase (PostgreSQL) |
| **Auth** | JWT + OTP via Brevo SMTP | Same |
| **Config** | `.env` | Vercel Environment Variables |

---

## Local Dev Setup

```bash
npm install
npm run dev       # starts Next.js on localhost:3000
npm run seed      # seeds IPL 2026 matches + players into local DB
```

Local DB runs via Docker on port 5433. Connection string in `.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/stars11?schema=public"
```

---

## How Prod Deploys Work

### Code changes (no DB schema change)
```bash
git add .
git commit -m "your message"
git push origin main   # Vercel auto-deploys
```

### When prisma/schema.prisma changes (NEW COLUMNS OR TABLES)

Supabase does NOT auto-apply schema changes. `prisma migrate` doesn't work with Supabase free tier the usual way. The workflow that works is:

**Step 1 — Generate the SQL Supabase needs to run:**
```bash
# See what SQL the schema change would produce:
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

Or more reliably — just read the diff yourself and write the raw SQL manually. It's usually simple (`ALTER TABLE ... ADD COLUMN ...`).

**Step 2 — Run it in Supabase SQL Editor:**
- Go to Supabase dashboard → SQL Editor
- Paste and run the raw SQL
- Verify the column/table exists in Table Editor

**Step 3 — Then push code:**
```bash
git push origin main
```

### Schema changes in this session (run these on Supabase before pushing)

Two columns were added since the last prod push:

```sql
-- Added to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS "cricApiMatchId" TEXT UNIQUE;

-- Added to player_match_stats table  
ALTER TABLE player_match_stats ADD COLUMN IF NOT EXISTS "isInPlayingXI" BOOLEAN NOT NULL DEFAULT false;
```

Run both in Supabase SQL Editor, then push.

---

## Vercel Environment Variables

These must be set in Vercel dashboard (Settings → Environment Variables). The `.env` file is local only and never deployed.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `ADMIN_EMAIL` | Admin account email |
| `BREVO_SMTP_USER` | Brevo SMTP username (from Brevo SMTP settings) |
| `BREVO_SMTP_KEY` | Brevo transactional email API key |
| `CRICKET_DATA_API_KEY` | CricAPI key 1 (primary) |
| `CRICKET_DATA_API_KEY_2` | CricAPI key 2 (fallback) |
| `CRICKET_DATA_API_KEY_3` | CricAPI key 3 (fallback) |
| `CRICKET_DATA_API_KEY_4` | CricAPI key 4 (fallback) |
| `CRICKET_DATA_API_KEY_5` | CricAPI key 5 (fallback) |
| `CRICKET_DATA_API_KEY_6` | CricAPI key 6 (fallback) |
| `CRICKET_DATA_API_KEY_7` | CricAPI key 7 (fallback) |
| `CRICKET_DATA_API_KEY_8` | CricAPI key 8 (fallback) |

### CricAPI Key Status
- Each key: 100 requests/day, resets at midnight UTC (~5:30 AM IST)
- Each "Fetch from API" click in admin = 2 API calls (match lookup + scorecard)
- Keys are tried in order (1 → 2 → 3). If one is rate-limited, next is tried after 2s delay
- Do NOT use auto-sync — it burns the daily limit fast

---

## Admin Panel

URL: `/admin` — only accessible to the ADMIN role user.

Admin email is set via `ADMIN_EMAIL` env var. On first signup with that email, the user gets ADMIN role automatically.

### Scoring Workflow (per match)
1. Go to Admin → Scoring tab
2. Select the match
3. Click "Fetch from API" — pulls scorecard from CricAPI, fills stats form
4. Review/correct stats if needed
5. Click "Save Stats" — saves to DB, recalculates fantasy points for all entries live
6. Repeat steps 3-5 during the match (up to ~4-5 times)
7. After match ends: click "Finalize Scoring" — ranks entries, distributes prizes, marks match COMPLETED

---

## Key Technical Decisions

- **No prisma migrations folder** — using `prisma db push` style (schema sync). For prod, run raw SQL on Supabase manually before deploying schema changes.
- **No real payment gateway** — tokens are virtual. Users pay admin via UPI externally, admin approves requests manually in the admin panel.
- **No signup bonus** — new users start with `0` vINR and must add balance through the wallet flow before entering paid contests.
- **No live scores** — CricAPI is used only to fill historical/completed scorecard data after matches. Users check Cricbuzz for live scores themselves.
- **Auth** — JWT-based sessions (not Supabase Auth). OTPs sent via Brevo email.
- **Team visibility** — other players' teams are hidden until the match starts (enforced server-side).

---

## Project Structure

```
src/
  app/
    (app)/          # All authenticated pages
      admin/        # Admin panel
      contests/     # Contest list, detail, team selection, entry view
      dashboard/    # User dashboard
      matches/      # Match pages
      profile/      # Profile + wallet
      teams/        # Saved teams
    api/            # API routes (backend)
      admin/        # Admin-only endpoints
      contests/     # Contest CRUD + entry
      matches/      # Match list
      players/      # Player list for match
      teams/        # Saved team CRUD
      tokens/       # Token buy/withdraw requests
    login/          # Auth page
  components/       # Shared UI components
  lib/
    auth.ts         # JWT auth, OTP, requireAuth/requireAdmin
    cricket-api.ts  # CricAPI integration with 3-key fallback
    match-sync.ts   # Auto-update match status (UPCOMING→LIVE→COMPLETED)
    player-utils.ts # Shared player validation + resolution
    prisma.ts       # Prisma client singleton
    scoring.ts      # Fantasy points calculation (Dream11 rules)
    utils.ts        # Shared constants (ROLE_ORDER, ROLE_LABELS, etc.)
prisma/
  schema.prisma     # Database schema
scripts/
  seed.ts           # Seeds IPL 2026 matches + players
```
