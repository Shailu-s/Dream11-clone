import { Player } from "@prisma/client";

const BASE_URL = "https://api.cricapi.com/v1";

// Keys tried in order. Add new keys here as fallbacks.
const API_KEYS = [
  process.env.CRICKET_DATA_API_KEY,
  process.env.CRICKET_DATA_API_KEY_2,
  process.env.CRICKET_DATA_API_KEY_3,
].filter(Boolean) as string[];

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

/**
 * Tries each API key in sequence. Waits 2s between attempts.
 * Only throws if ALL keys are exhausted.
 */
async function fetchWithFallback(path: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";

  for (let i = 0; i < API_KEYS.length; i++) {
    const key = API_KEYS[i];
    const url = `${BASE_URL}/${path}${sep}apikey=${key}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!isRateLimitError(data)) {
      if (i > 0) console.log(`[CricAPI] Key ${i + 1} succeeded.`);
      return data;
    }

    console.warn(`[CricAPI] Key ${i + 1} hit rate limit (${data.info?.hitsToday ?? "?"}/${data.info?.hitsLimit ?? "?"}). ${i + 1 < API_KEYS.length ? "Trying next key in 2s..." : "All keys exhausted."}`);

    if (i + 1 < API_KEYS.length) {
      await sleep(2000);
    }
  }

  throw new Error("All CricAPI keys have hit their daily limit. Try again tomorrow.");
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

export async function fetchCricScore() {
  const data = await fetchWithFallback("cricScore");
  if (data.status !== "success") {
    throw new Error(data.reason || "Failed to fetch matches");
  }
  return data.data || [];
}

export async function fetchScorecard(matchId: string) {
  const data = await fetchWithFallback(`match_scorecard?id=${matchId}`);
  if (data.status !== "success") {
    throw new Error(data.reason || "Failed to fetch scorecard");
  }
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
      };

      stats.runs = b.r;
      stats.ballsFaced = b.b;
      stats.fours = b["4s"];
      stats.sixes = b["6s"];
      stats.didBat = true;
      stats.isOut = b.dismissal && b.dismissal !== "not out";
      
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
