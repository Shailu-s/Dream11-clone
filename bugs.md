## Bug Tracker — Stars11 / WGF

All bugs from initial staging test. Status as of 2026-03-31.

---

### Bug 1 — Team naming ✅ FIXED
Team names required with validation. Duplicate names in same contest blocked.

### Bug 2 — Number input placeholder 0 issue ✅ FIXED
Number inputs no longer have sticky placeholder 0.

### Bug 3 — Admin scoring UX ✅ FIXED
Tabbed layout, match selector dropdown, save/finalize buttons with proper feedback.

### Bug 4 — Countdown timer ✅ FIXED
Shared `useCountdown` hook in `Countdown.tsx`, used across contest detail, match detail, and contest cards.

### Bug 5 — Header/profile clickability ✅ FIXED
@username and vINR balance are clickable Links to /profile. Logout has distinct styling.

### Bug 6 — Live score updates during match ✅ FIXED
Saving stats updates fantasy points immediately. Pages auto-refresh every 60s during live matches.

### Bug 7 — Finalize score confirmation dialog ✅ FIXED
Modal with warnings, checklist of consequences, Cancel and "Yes, Finalize" buttons.

### Bug 8 — Contest completion display (WGF messages) ✅ FIXED
WGF-style messages after completion based on rank. Prize shown on leaderboard.

### Bug 9 — Contest page restructure ✅ FIXED
"Available" and "My Contests" tabs. Join-by-code integrated. Create contest accessible.

### Bug 10 — Wallet/vINR page UX ✅ FIXED
/tokens redirects to /profile. Profile combines wallet features: Buy vINR, Withdraw, History tabs.

### Bug 11 — Join contest inside contest page ✅ FIXED
Join button inline on contest detail page. No separate header item.

### Bug 12 — Buy request form reset ✅ FIXED
Form fields reset after successful submission.

### Bug 13 — Buy/sell request pending state ✅ FIXED
Pending banners + History tab with status badges (PENDING, APPROVED, REJECTED).

### Bug 14 — Cricket API integration 🔲 SKIPPED
API key saved. Will address separately.

### Bug 15 — Hide teams before match start ✅ FIXED
API returns `teamHidden: true` for non-owners before match. UI shows lock message.

### Bug 16 — Saved teams visibility ✅ FIXED
Teams auto-saved during contest join. Visible on team selection page.

### Bug 17 — Join with existing saved team ✅ FIXED
"Your Saved Teams" section on team selection. Pick saved team or build new.

### Bug 18 — Combined wallet + profile ✅ FIXED
Profile page has My Activity, Buy vINR, Withdraw, and History tabs.

### Bug 19 — Disable edit/add buttons after match starts ✅ FIXED
Buttons only render when `!matchStarted`. Edit button also checks `canEdit`.

### Bug 20 — Team view shows points instead of price ✅ FIXED
Shows fantasy points with captain/VC multipliers after match starts.

### Bug 21 — IPL team logos blank on UI ✅ FIXED
ESPN CDN URLs were returning 404 (9 out of 10 broken). Downloaded all 10 logos to `public/teams/` as local PNGs. Switched from remote ESPN URLs to local `/teams/{INITIALS}.png` paths.

---

## Codebase Cleanup (Gemini mess) ✅ DONE

| # | Issue | Status |
|---|-------|--------|
| 1 | Duplicate `useCountdown` hook in 2 pages | ✅ Extracted to shared hook in `Countdown.tsx` |
| 2 | Duplicate team validation in 2 API routes | ✅ Extracted to `src/lib/player-utils.ts` |
| 3 | Duplicate player+stats fetch in 3 API routes | ✅ Extracted `resolvePlayerDetails()` to `player-utils.ts` |
| 4 | `as any` type cast in enter/route.ts | ✅ Fixed — uses properly typed `PlayerSelection[]` |
| 5 | Inline dashboard components | — Skipped (single-use, not worth extracting) |
| 6 | Dead comments in 2 files | ✅ Removed |
| 7 | Inconsistent error handling | — Low priority, deferred |
| 8 | Navbar array mutation | ✅ Fixed — uses spread syntax |
| 9 | Race condition in profile useEffect | ✅ Fixed — `setLoading(false)` in `.finally()` |
| 10 | Magic number in match-sync.ts | ✅ Named constant `MATCH_DURATION_MS` |
| 11 | Duplicate role constants | ✅ Centralized `ROLE_ORDER` and `ROLE_LABELS` in `utils.ts` |
