import { Player } from "@prisma/client";
import { prisma } from "./prisma";

const BASE_URL = "https://api.cricapi.com/v1";

// Keys tried in order. Add new keys here as fallbacks.
const API_KEYS = [
  process.env.CRICKET_DATA_API_KEY,
  process.env.CRICKET_DATA_API_KEY_2,
  process.env.CRICKET_DATA_API_KEY_3,
  process.env.CRICKET_DATA_API_KEY_4,
  process.env.CRICKET_DATA_API_KEY_5,
  process.env.CRICKET_DATA_API_KEY_6,
  process.env.CRICKET_DATA_API_KEY_7,
  process.env.CRICKET_DATA_API_KEY_8,
].filter(Boolean) as string[];

// Each key is from a separate CricAPI account with its own 100/day limit.
// Use 90 as safe limit to leave a small buffer for manual admin use.
const SAFE_LIMIT_PER_KEY = 90;

function isRateLimitError(data: any): boolean {
  if (!data) return false;
  const reason = (data.reason || data.message || "").toLowerCase();
  return (
    data.status === "failure" &&
    (reason.includes("limit") || reason.includes("quota") || reason.includes("exceeded") || reason.includes("blocked"))
  );
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Returns today's date string in UTC: "YYYY-MM-DD" */
function utcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns current hit count for a given key index today.
 */
export async function getKeyUsageToday(keyIndex: number): Promise<number> {
  const date = utcDateString();
  const record = await prisma.apiKeyUsage.findUnique({
    where: { keyIndex_date: { keyIndex, date } },
  });
  return record?.hitCount ?? 0;
}

/**
 * Increments usage counter for a key after a successful request.
 */
async function recordKeyUsage(keyIndex: number): Promise<void> {
  const date = utcDateString();
  await prisma.apiKeyUsage.upsert({
    where: { keyIndex_date: { keyIndex, date } },
    update: { hitCount: { increment: 1 } },
    create: { keyIndex, date, hitCount: 1 },
  });
}

/**
 * Returns total requests used today across all keys.
 */
export async function getTotalUsageToday(): Promise<number> {
  const date = utcDateString();
  const records = await prisma.apiKeyUsage.findMany({ where: { date } });
  return records.reduce((sum, r) => sum + r.hitCount, 0);
}

/**
 * Loads today's usage map from DB once. Used by both getBestAvailableKeyIndex and fetchWithFallback
 * so we never query the same table twice in one cron run.
 */
async function loadUsageMap(): Promise<Map<number, number>> {
  const date = utcDateString();
  const usageRecords = await prisma.apiKeyUsage.findMany({ where: { date } });
  return new Map(usageRecords.map(r => [r.keyIndex, r.hitCount]));
}

/**
 * Returns the index of the best available key (lowest usage, under safe limit).
 * Returns -1 if all keys are at or above safe limit.
 * Also returns the usage map so callers can pass it to fetchWithFallback (avoids double DB query).
 */
export async function getBestAvailableKeyIndex(): Promise<{ keyIndex: number; usageMap: Map<number, number> }> {
  const usageMap = await loadUsageMap();
  for (let i = 0; i < API_KEYS.length; i++) {
    const used = usageMap.get(i) ?? 0;
    if (used < SAFE_LIMIT_PER_KEY) {
      return { keyIndex: i, usageMap };
    }
  }
  return { keyIndex: -1, usageMap };
}

/**
 * Tries each API key in sequence, tracking budget.
 * Accepts a pre-loaded usageMap to avoid re-querying DB when called right after getBestAvailableKeyIndex.
 * IMPORTANT: The usageMap is mutated in-place after each call so subsequent calls
 * in the same cron run see accurate counts without re-querying the DB.
 * Skips keys already at safe limit. Only throws if ALL keys are exhausted.
 */
async function fetchWithFallback(path: string, existingUsageMap?: Map<number, number>): Promise<{ data: any; keyIndex: number }> {
  const sep = path.includes("?") ? "&" : "?";
  const usageMap = existingUsageMap ?? await loadUsageMap();

  for (let i = 0; i < API_KEYS.length; i++) {
    const used = usageMap.get(i) ?? 0;

    // Skip keys at or above safe limit
    if (used >= SAFE_LIMIT_PER_KEY) {
      console.warn(`[CricAPI] Key ${i + 1} at budget limit (${used}/${SAFE_LIMIT_PER_KEY}), skipping.`);
      continue;
    }

    const key = API_KEYS[i];
    const url = `${BASE_URL}/${path}${sep}apikey=${key}`;
    const res = await fetch(url);
    const data = await res.json();

    // Always record usage — even rate-limit responses count as a hit
    await recordKeyUsage(i);
    // Update the in-memory map so subsequent calls in this cron run see the real count
    usageMap.set(i, (usageMap.get(i) ?? 0) + 1);

    if (!isRateLimitError(data)) {
      if (i > 0) console.log(`[CricAPI] Key ${i + 1} succeeded.`);
      return { data, keyIndex: i };
    }

    // CricAPI rejected this key — mark it at safe limit so we don't retry it
    // (CricAPI's internal counter may be ahead of ours)
    console.warn(`[CricAPI] Key ${i + 1} hit rate limit (${data.info?.hitsToday ?? "?"}/${data.info?.hitsLimit ?? "?"}). Marking key exhausted.`);
    usageMap.set(i, SAFE_LIMIT_PER_KEY);

    if (i + 1 < API_KEYS.length) {
      await sleep(2000);
    }
  }

  throw new Error("All CricAPI keys have hit their daily limit. Try again tomorrow.");
}

/**
 * Detects if a CricAPI scorecard response indicates the match has ended.
 * Checks the `status` and `matchEnded` fields returned by the API.
 */
export function isMatchEnded(apiData: any): boolean {
  if (!apiData) return false;

  // CricAPI sets matchEnded: true when match is over
  if (apiData.matchEnded === true) return true;

  // Also check the status string for completion signals
  const status = (apiData.status || "").toLowerCase();
  const endSignals = ["won", "lost", "tied", "no result", "abandoned", "draw", "match over"];
  return endSignals.some(signal => status.includes(signal));
}

const TEAM_ALIASES: Record<string, string[]> = {
  CSK: ["chennai super kings", "csk"],
  MI: ["mumbai indians", "mi"],
  RCB: ["royal challengers bengaluru", "royal challengers bangalore", "rcb", "rcbw"],
  KKR: ["kolkata knight riders", "kkr"],
  DC: ["delhi capitals", "dc"],
  PBKS: ["punjab kings", "pbks"],
  RR: ["rajasthan royals", "rr"],
  SRH: ["sunrisers hyderabad", "srh"],
  GT: ["gujarat titans", "gt"],
  LSG: ["lucknow super giants", "lsg"],
};

export function isTeamMatch(dbTeam: string, apiTeamName: string): boolean {
  const normalizedApi = apiTeamName.toLowerCase();
  const aliases = TEAM_ALIASES[dbTeam] || [dbTeam.toLowerCase()];
  return aliases.some(alias => normalizedApi.includes(alias));
}

export async function fetchCricScore(usageMap?: Map<number, number>) {
  const { data } = await fetchWithFallback("cricScore", usageMap);
  if (data.status !== "success") {
    throw new Error(data.reason || "Failed to fetch matches");
  }
  return data.data || [];
}

export async function fetchScorecard(matchId: string, usageMap?: Map<number, number>): Promise<{ scorecard: any; keyIndex: number }> {
  const { data, keyIndex } = await fetchWithFallback(`match_scorecard?id=${matchId}`, usageMap);
  if (data.status !== "success") {
    throw new Error(data.reason || "Failed to fetch scorecard");
  }
  return { scorecard: data.data, keyIndex };
}

/**
 * Admin-only fetch using a dedicated API key (CRICKET_DATA_API_KEY_ADMIN).
 * Completely separate from the cron keys — never touches the shared budget counter.
 */
async function fetchAdminOnly(path: string): Promise<any> {
  const adminKey = process.env.CRICKET_DATA_API_KEY_ADMIN;
  if (!adminKey) throw new Error("CRICKET_DATA_API_KEY_ADMIN not configured");
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE_URL}/${path}${sep}apikey=${adminKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (isRateLimitError(data)) throw new Error("Admin API key daily limit reached");
  return data;
}

export async function fetchCricScoreAdmin() {
  const data = await fetchAdminOnly("cricScore");
  if (data.status !== "success") throw new Error(data.reason || "Failed to fetch matches");
  return data.data || [];
}

export async function fetchScorecardAdmin(matchId: string): Promise<any> {
  const data = await fetchAdminOnly(`match_scorecard?id=${matchId}`);
  if (data.status !== "success") throw new Error(data.reason || "Failed to fetch scorecard");
  return data.data;
}

/**
 * Normalizes player name for matching.
 * E.g., "MS Dhoni" -> "ms dhoni", "M.S. Dhoni" -> "ms dhoni"
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Matches a player from API name to DB player.
 */
function findDbPlayer(apiName: string, apiTeam: string, dbPlayers: Player[]): Player | null {
  const normalizedApiName = normalizeName(apiName);

  // Filter dbPlayers by team if possible
  const teamPlayers = dbPlayers.filter(p => isTeamMatch(p.team, apiTeam));
  const candidates = teamPlayers.length > 0 ? teamPlayers : dbPlayers;

  // 1. Try exact match (case insensitive)
  let found = candidates.find(p => p.name.toLowerCase() === apiName.toLowerCase());
  if (found) return found;

  // 2. Try normalized name match
  found = candidates.find(p => normalizeName(p.name) === normalizedApiName);
  if (found) return found;

  // 3. Try last name + first initial match
  const apiParts = normalizedApiName.split(" ");
  if (apiParts.length >= 2) {
    const lastName = apiParts[apiParts.length - 1];
    const firstInitial = apiParts[0][0];

    found = candidates.find(p => {
      const dbNorm = normalizeName(p.name).split(" ");
      if (dbNorm.length < 2) return false;
      const dbLast = dbNorm[dbNorm.length - 1];
      const dbFirstInitial = dbNorm[0][0];
      return dbLast === lastName && dbFirstInitial === firstInitial;
    });
    if (found) return found;
  }

  // 4. Token-set match — handles reversed names like "Vyshak Vijaykumar" vs "Vijaykumar Vyshak"
  // Safe: candidates are already team-filtered, and token collisions within one team are near-impossible
  const apiTokens = new Set(normalizedApiName.split(" ").filter(t => t.length > 1));
  if (apiTokens.size >= 2) {
    found = candidates.find(p => {
      const dbTokens = normalizeName(p.name).split(" ").filter(t => t.length > 1);
      if (dbTokens.length < 2) return false;
      return dbTokens.every(t => apiTokens.has(t)) && dbTokens.length === apiTokens.size;
    });
    if (found) return found;
  }

  return null;
}


export function parseScorecard(apiData: any, dbPlayers: Player[]) {
  const scorecard = apiData.scorecard || [];
  const teams = apiData.teams || []; // [Team1, Team2]
  
  // Map to store combined stats by player ID
  const statsMap = new Map<string, any>();

  scorecard.forEach((innings: any, index: number) => {
    const battingTeamName = innings.inning.split(" Inning")[0];
    // The fielding team is the "other" team in this match
    const fieldingTeamName = teams.find((t: string) => t !== battingTeamName) || "";
    
    // Batting stats (belong to battingTeamName)
    (innings.batting || []).forEach((b: any) => {
      if (!b.batsman?.name) return;
      const player = findDbPlayer(b.batsman.name, battingTeamName, dbPlayers);
      if (!player) return;

      const stats = statsMap.get(player.id) || {
        playerId: player.id,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        wickets: 0,
        oversBowled: 0,
        maidens: 0,
        runsConceded: 0,
        catches: 0,
        stumpings: 0,
        runOutsDirect: 0,
        runOutsIndirect: 0,
        lbwBowled: 0,
        didBat: false,
        isOut: false,
        dismissal: null as string | null,
      };

      stats.runs = b.r;
      stats.ballsFaced = b.b;
      stats.fours = b["4s"];
      stats.sixes = b["6s"];
      stats.didBat = true;
      // "dismissal-text" is the pre-formatted string from CricAPI e.g. "c Head b Muzarabani", "not out", "run out (Roy)"
      stats.dismissal = b["dismissal-text"] || null;
      stats.isOut = !!(b["dismissal-text"] && b["dismissal-text"] !== "not out");
      
      statsMap.set(player.id, stats);
    });

    // Bowling stats (belong to fieldingTeamName)
    (innings.bowling || []).forEach((bw: any) => {
      if (!bw.bowler?.name) return;
      const player = findDbPlayer(bw.bowler.name, fieldingTeamName, dbPlayers);
      if (!player) return;

      const stats = statsMap.get(player.id) || {
        playerId: player.id,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        wickets: 0,
        oversBowled: 0,
        maidens: 0,
        runsConceded: 0,
        catches: 0,
        stumpings: 0,
        runOutsDirect: 0,
        runOutsIndirect: 0,
        lbwBowled: 0,
        didBat: false,
        isOut: false,
        dismissal: null as string | null,
      };

      stats.oversBowled = bw.o;
      stats.maidens = bw.m;
      stats.runsConceded = bw.r;
      stats.wickets = bw.w;
      
      statsMap.set(player.id, stats);
    });

    // Fielding & Bowler Bonuses (LBW/Bowled) (belong to fieldingTeamName)
    (innings.catching || []).forEach((c: any) => {
      // Some entries (e.g. run-outs) may not have a catcher field
      const catcherName = c.catcher?.name;
      if (!catcherName) return;

      const player = findDbPlayer(catcherName, fieldingTeamName, dbPlayers);
      if (!player) return;

      const stats = statsMap.get(player.id) || {
        playerId: player.id,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        wickets: 0,
        oversBowled: 0,
        maidens: 0,
        runsConceded: 0,
        catches: 0,
        stumpings: 0,
        runOutsDirect: 0,
        runOutsIndirect: 0,
        lbwBowled: 0,
        didBat: false,
        isOut: false,
        dismissal: null as string | null,
      };

      stats.catches += (c.catch || 0) + (c.cb || 0); // cb = caught and bowled
      stats.stumpings += (c.stumped || 0);
      stats.runOutsDirect += (c.runout || 0);
      stats.lbwBowled += (c.lbw || 0) + (c.bowled || 0);

      statsMap.set(player.id, stats);
    });
  });

  return Array.from(statsMap.values());
}
