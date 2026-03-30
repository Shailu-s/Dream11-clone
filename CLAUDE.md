@AGENTS.md

# Development Workflow

## How We Work
- Work is done **phase by phase, flow by flow**
- For each flow: Claude tests all API endpoints + UI paths, fixes all bugs, then marks it ready for user testing
- User tests the flow manually in browser. Once confirmed working, flow is marked as user-verified
- When starting a new session, read this file and resume from where we left off
- **Do not skip ahead** — complete the current phase before moving to the next

## Phases & Flows

### Phase 1: Auth & Login
- [x] **Flow 1.1: OTP Send** — Send OTP to phone number
- [x] **Flow 1.2: OTP Verify (existing user)** — Verify OTP, get logged in
- [x] **Flow 1.3: New User Signup** — OTP → needsUsername → pick username → account created
- [x] **Flow 1.4: Admin Login** — Admin phone gets ADMIN role on signup

**Bugs fixed:**
- Prisma v7 requires `@prisma/adapter-pg` driver adapter — `new PrismaClient()` with no args crashes. Fixed in `src/lib/prisma.ts`
- OTP consumed on first verify call, so second call (with username) failed "Invalid or expired OTP". Fixed: OTP only consumed after successful login/signup

**User-verified:** Yes — admin login + signup tested and confirmed working

### Phase 2: Data Setup (Admin Seeds Matches & Players)
- [x] **Flow 2.1: Seed IPL matches** — 74 IPL 2026 matches seeded via `npm run seed`. Matches before today auto-marked COMPLETED.
- [x] **Flow 2.2: Seed players** — 150 players across 10 teams with roles and credit prices (6.0-10.5 Cr range)
- [x] **Flow 2.3: Admin match management** — Admin can change status. Matches API auto-updates past matches to COMPLETED. Contest creation only shows future UPCOMING matches.

**Key decisions:**
- Season is "IPL 2026" (started March 28, 2026)
- `GET /api/matches?status=UPCOMING` now filters by date (future only) and auto-marks old matches COMPLETED
- Contest creation validates match hasn't started (date check + status check)
- Seed script: `npm run seed` (uses `npx tsx scripts/seed.ts`)

**User-verified:** Not yet

### Phase 3: Contest Creation & Joining
- [x] **Flow 3.1: Create contest** — Pick match → set entry fee → set prize distribution → get invite code
- [x] **Flow 3.2: Join contest** — Enter invite code → view contest → select team → pay entry fee
- [x] **Flow 3.3: Contest detail page** — View contest info, participants, status, share invite code

**User-verified:** Not yet

### Phase 4: Team Selection
- [x] **Flow 4.1: Select 11 players** — Pick from match teams, respect salary cap + role constraints
- [x] **Flow 4.2: Captain & Vice-Captain** — Assign C/VC with multipliers
- [x] **Flow 4.3: Team validation** — All rules enforced before submission (server-side + client-side)
- [x] **Flow 4.4: Team lock** — Match date check prevents entry after start; LIVE status locks contests

**Bugs fixed:**
- Added date-based guard on contest entry (prevents submission after match starts even if status not updated)

**User-verified:** Not yet

### Phase 5: Token System
- [x] **Flow 5.1: Buy request** — User requests tokens, appears in admin panel
- [x] **Flow 5.2: Admin approve/reject** — Approve credits tokens, reject is no-op for buys
- [x] **Flow 5.3: Sell/withdraw request** — Tokens held immediately on request; rejected = refunded
- [x] **Flow 5.4: Transaction history** — User sees all token movements with status colors

**Bugs fixed:**
- Withdrawal now deducts tokens immediately (hold) to prevent double-spending
- Admin reject of withdrawal refunds held tokens
- Admin approve/reject now uses database transactions for atomicity

**User-verified:** Not yet

### Phase 6: Scoring & Results
- [x] **Flow 6.1: Admin enters player stats** — Manual stat entry per match via admin scoring desk
- [x] **Flow 6.2: Fantasy points calculation** — Auto-calculate from stats using Dream11 rules
- [x] **Flow 6.3: Finalize scoring** — Calculate entry points → rank → distribute prizes (with confirmation dialog)
- [x] **Flow 6.4: Contest completion** — Contest marked COMPLETED, prizes credited, match marked COMPLETED

**Added:**
- Contest cancellation API (`DELETE /api/admin/contests`) — refunds all entry fees

**User-verified:** Not yet

### Phase 7: Leaderboard & Profile
- [x] **Flow 7.1: Contest leaderboard** — Per-contest ranking with points and prizes
- [x] **Flow 7.2: Overall leaderboard** — Platform-wide stats (wins, podiums, contests played)
- [x] **Flow 7.3: User profile** — Contest history, past teams, results
- [x] **Flow 7.4: Dashboard** — Upcoming/live/completed matches, active & past contest entries

**User-verified:** Not yet

### Phase 8: Polish & Edge Cases
- [x] **Flow 8.1: Contest refunds** — Admin cancel endpoint refunds all entry fees
- [x] **Flow 8.2: Error handling** — All API routes handle errors, UI shows error messages
- [x] **Flow 8.3: Mobile responsiveness** — Navbar has hamburger menu, all pages use responsive layouts
- [x] **Flow 8.4: Loading states** — Loading indicators on all data-fetching pages

**Admin UX improvements:**
- Tabbed admin console (Tokens, Scoring, Matches, Users)
- Match filter tabs in admin (ALL/UPCOMING/LIVE/COMPLETED)
- Scoring desk defaults to LIVE/UPCOMING matches
- Finalize scoring requires confirmation dialog

**User-verified:** Not yet

## Current Status
**All phases code-complete.** Ready for user testing across all flows.

### How to Test
1. Start dev server: `npm run dev`
2. Login with admin phone (set in `.env` as `ADMIN_PHONE`)
3. Seed data if not already: `npm run seed`
4. Test flows: login → dashboard → create contest → share code → join → pick team → admin scoring → results
