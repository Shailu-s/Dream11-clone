# TODO

## Playing XI Scraping

- Implement automatic Playing XI fetch around match start time.
- Primary source: Cricbuzz.
- Secondary source: ESPNcricinfo.
- Research fallback source: CricketFastLiveLine.
- Save scraped Playing XI once per match to DB and stop hitting source after confirmed save.
- Add confidence/source tracking for scraped Playing XI data.
- Decide polling window near toss/start (for example: from 30 minutes before start until 20 minutes after start).

## Player Form Feature

- Verify whether "recent player performance / last few matches form" should exist in team creation/edit screens.
- Current codebase does not expose recent-form data in player APIs or team-builder UI.
- If needed, implement recent form using internal `player_match_stats` history, not live scraping.

## Production Hardening

- Keep Supabase production schema aligned with Prisma schema changes.
- Whenever schema changes are made, prepare exact SQL for production before deploy.
- Clean up remaining critical/high issues in `bugs.md`.
