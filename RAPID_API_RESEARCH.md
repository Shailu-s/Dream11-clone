# RapidAPI Research: cricket-api-free-data

## Provider Details
- **Name:** creativesdev (Smart API)
- **Host:** `cricket-api-free-data.p.rapidapi.com`
- **Authentication:** `x-rapidapi-key` header

## Working Endpoints

### 1. Match Schedule
- **Endpoint:** `/cricket-schedule`
- **Result:** Returns upcoming and current matches grouped by date.
- **Key Discovery:** IPL 2026 matches are identified with `seriesId: 9241`.
- **Match IDs Found:**
  - `149662`: LSG vs DC (Apr 01)
  - `149673`: KKR vs SRH (Apr 02)
  - `149684`: CSK vs PBKS (Apr 03)
  - `149695`: DC vs MI (Apr 04)
  - `149699`: GT vs RR (Apr 04)

### 2. Live Scores
- **Endpoint:** `/cricket-livescores`
- **Result:** Returns active matches. Currently empty (no live matches in the afternoon).

### 3. Match Scoreboard
- **Endpoint:** `/cricket-match-scoreboard?matchid=ID`
- **Result:** Returns batting and bowling details. 
- **Observation:** Matches that haven't started or are old/invalid return an empty structure: `{"firstInnings":{"batters":[], ...}}`.

### 4. Match Info
- **Endpoint:** `/cricket-match-info?matchid=ID`
- **Result:** Returns venue, toss, and basic metadata.

## Critical Issues & Unknowns

1. **Past Match IDs:** The `cricket-schedule` endpoint seems to only show future matches. We need a way to list "Recent" or "Completed" matches to find IDs for scoring past games (e.g. RR vs CSK).
2. **Fielding Data:** Most free APIs do not provide catching/stumping data. I need to verify if the `batting` array contains "dismissal" details that include the catcher's name (common in Cricbuzz-style responses).
3. **Playing XI:** Not explicitly found in the schedule. Might be in `cricket-match-info` once the toss happens.

## Comparison with CricAPI (Current)
- **Pros:** Different limit pool (RapidAPI vs CricAPI). Might have faster updates.
- **Cons:** Match IDs are internal and don't match standard Cricbuzz IDs. Listing past matches is currently undocumented/unsuccessful.

## Recommended Next Steps
- Try to call `/cricket-livescores` at 7:30 PM tonight to see the structure of an active IPL match.
- Locate the "Recent Matches" endpoint name if it exists (tried many variations without success).
