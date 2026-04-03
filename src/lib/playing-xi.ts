import { prisma } from "@/lib/prisma";
import type { Match, Player } from "@prisma/client";

type ScrapeSource = "cricbuzz" | "espncricinfo";

type ScrapedPlayingXI = {
  source: ScrapeSource;
  pageUrl: string;
  teams: Array<{
    team: string;
    players: string[];
  }>;
};

type PlayerLite = Pick<Player, "id" | "name" | "team" | "season">;

const SOURCE_CONFIG = {
  cricbuzz: {
    baseUrl: "https://www.cricbuzz.com",
    indexUrl: "https://www.cricbuzz.com/cricket-match/live-scores",
    linkPattern: /<a\b[^>]*href="([^"]*\/live-cricket-scores\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
  },
  espncricinfo: {
    baseUrl: "https://www.espncricinfo.com",
    indexUrl: "https://www.espncricinfo.com/live-cricket-score",
    linkPattern: /<a\b[^>]*href="([^"]*\/live-cricket-score[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
  },
} as const;

const TEAM_ALIASES: Record<string, string[]> = {
  CSK: ["chennai super kings", "csk", "chennai"],
  MI: ["mumbai indians", "mi", "mumbai"],
  RCB: ["royal challengers bengaluru", "royal challengers bangalore", "rcb", "bengaluru", "bangalore"],
  KKR: ["kolkata knight riders", "kkr", "kolkata"],
  DC: ["delhi capitals", "dc", "delhi"],
  PBKS: ["punjab kings", "pbks", "punjab"],
  RR: ["rajasthan royals", "rr", "rajasthan"],
  SRH: ["sunrisers hyderabad", "srh", "hyderabad"],
  GT: ["gujarat titans", "gt", "gujarat"],
  LSG: ["lucknow super giants", "lsg", "lucknow"],
  IND: ["india", "ind"],
  SL: ["sri lanka", "sl"],
  PAK: ["pakistan", "pak"],
  ENG: ["england", "eng"],
  AUS: ["australia", "aus"],
  NZ: ["new zealand", "nz"],
  SA: ["south africa", "sa"],
  WI: ["west indies", "wi"],
  AFG: ["afghanistan", "afg"],
  BAN: ["bangladesh", "ban"],
};

const SCRAPE_HEADERS = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "accept-language": "en-US,en;q=0.9",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "cache-control": "no-cache",
};

const PLAYER_LIST_END_MARKERS = [
  " toss ",
  " match ",
  " venue ",
  " umpires ",
  " pitch ",
  " fall of wickets ",
  " did not bat ",
  " live blog ",
  " recent ",
  " score ",
  " preview ",
];

function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|tr|h1|h2|h3|h4|h5|h6)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{2,}/g, "\n")
  );
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(c\)|\(wk\)|\(w\)|\(vc\)|†|‡|\*/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(jr|sr)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTeamAliases(team: string): string[] {
  return TEAM_ALIASES[team] ?? [team.toLowerCase()];
}

function scoreTeamMention(haystack: string, team: string): number {
  const normalizedHaystack = normalizeText(haystack);
  return getTeamAliases(team).reduce((best, alias) => {
    const normalizedAlias = normalizeText(alias);
    return normalizedHaystack.includes(normalizedAlias) ? Math.max(best, normalizedAlias.length) : best;
  }, 0);
}

function cleanupPlayerName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, " ")
    .replace(/[†‡*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitPlayerList(playerList: string): string[] {
  let trimmed = ` ${playerList} `;
  const normalized = normalizeText(trimmed);

  for (const marker of PLAYER_LIST_END_MARKERS) {
    const markerIndex = normalized.indexOf(marker.trim());
    if (markerIndex > 0) {
      const rawCut = trimmed.slice(0, markerIndex);
      trimmed = rawCut;
      break;
    }
  }

  return trimmed
    .split(",")
    .map(cleanupPlayerName)
    .filter(Boolean);
}

function extractPlayingXISections(rawHtml: string): Array<{ label: string; players: string[] }> {
  const text = htmlToText(rawHtml);
  const sections: Array<{ label: string; players: string[] }> = [];
  const regex = /([A-Za-z0-9 .&'/-]{2,80})\s*\(Playing XI\)\s*:\s*([\s\S]*?)(?=\s+[A-Za-z0-9 .&'/-]{2,80}\s*\((?:Playing XI|From)\)\s*:|\s+(?:Toss|Match|Venue|Umpires|Pitch|Result|Preview|Recent Matches|Scorecard)\b|$)/gi;

  for (const match of text.matchAll(regex)) {
    const label = match[1]?.trim();
    const players = splitPlayerList(match[2] ?? "");
    if (!label || players.length < 8) continue;
    sections.push({ label, players });
  }

  return sections;
}

function buildAbsoluteUrl(baseUrl: string, href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }

  return `${baseUrl}${href.startsWith("/") ? href : `/${href}`}`;
}

function extractCandidateLinks(source: ScrapeSource, html: string, match: Match): string[] {
  const config = SOURCE_CONFIG[source];
  const candidates = new Map<string, number>();

  for (const anchor of html.matchAll(config.linkPattern)) {
    const href = anchor[1];
    const anchorHtml = anchor[2] ?? "";
    if (!href) continue;

    const blob = `${href} ${htmlToText(anchorHtml)}`;
    const score = scoreTeamMention(blob, match.team1) + scoreTeamMention(blob, match.team2);
    if (score <= 0) continue;

    const absoluteUrl = buildAbsoluteUrl(config.baseUrl, href);
    candidates.set(absoluteUrl, Math.max(score, candidates.get(absoluteUrl) ?? 0));
  }

  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([url]) => url);
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: SCRAPE_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }

  return res.text();
}

function pickTeamSection(sections: Array<{ label: string; players: string[] }>, team: string) {
  let best: { label: string; players: string[] } | null = null;
  let bestScore = 0;

  for (const section of sections) {
    const score = scoreTeamMention(section.label, team);
    if (score > bestScore) {
      best = section;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : null;
}

async function scrapeSource(match: Match, source: ScrapeSource): Promise<ScrapedPlayingXI | null> {
  const config = SOURCE_CONFIG[source];
  const indexHtml = await fetchHtml(config.indexUrl);
  const candidateUrls = extractCandidateLinks(source, indexHtml, match);

  for (const pageUrl of candidateUrls) {
    try {
      const pageHtml = await fetchHtml(pageUrl);
      const sections = extractPlayingXISections(pageHtml);
      const team1Section = pickTeamSection(sections, match.team1);
      const team2Section = pickTeamSection(sections, match.team2);

      if (!team1Section || !team2Section) continue;
      if (team1Section.players.length < 11 || team2Section.players.length < 11) continue;

      return {
        source,
        pageUrl,
        teams: [
          { team: match.team1, players: team1Section.players.slice(0, 11) },
          { team: match.team2, players: team2Section.players.slice(0, 11) },
        ],
      };
    } catch (error) {
      console.warn(`[PlayingXI] ${source} page fetch failed for ${pageUrl}:`, error);
    }
  }

  return null;
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeText(value).split(" ").filter(Boolean));
}

function nameSimilarity(a: string, b: string): number {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1000;
  if (normalizedA.replace(/\s/g, "") === normalizedB.replace(/\s/g, "")) return 950;

  const aTokens = tokenSet(normalizedA);
  const bTokens = tokenSet(normalizedB);
  let shared = 0;

  for (const token of aTokens) {
    if (bTokens.has(token)) shared += 1;
  }

  const union = new Set([...aTokens, ...bTokens]).size || 1;
  const jaccard = shared / union;
  const surnameBonus = (() => {
    const aLast = normalizedA.split(" ").at(-1);
    const bLast = normalizedB.split(" ").at(-1);
    return aLast && bLast && aLast === bLast ? 0.25 : 0;
  })();

  return (jaccard + surnameBonus) * 100;
}

function matchScrapedNamesToPlayers(scrapedNames: string[], players: PlayerLite[]): { matchedIds: string[]; unmatchedNames: string[] } {
  const remaining = [...players];
  const matchedIds: string[] = [];
  const unmatchedNames: string[] = [];

  for (const scrapedName of scrapedNames) {
    let bestIndex = -1;
    let bestScore = 0;

    for (let i = 0; i < remaining.length; i++) {
      const score = nameSimilarity(scrapedName, remaining[i].name);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex >= 0 && bestScore >= 60) {
      matchedIds.push(remaining[bestIndex].id);
      remaining.splice(bestIndex, 1);
    } else {
      unmatchedNames.push(scrapedName);
    }
  }

  return { matchedIds, unmatchedNames };
}

export async function scrapePlayingXI(match: Match): Promise<ScrapedPlayingXI | null> {
  const sources: ScrapeSource[] = ["cricbuzz", "espncricinfo"];

  for (const source of sources) {
    try {
      const result = await scrapeSource(match, source);
      if (result) return result;
    } catch (error) {
      console.warn(`[PlayingXI] ${source} index fetch failed for ${match.team1} vs ${match.team2}:`, error);
    }
  }

  return null;
}

export async function maybeAutoConfirmPlayingXI(match: Match): Promise<{
  updated: boolean;
  source?: ScrapeSource;
  pageUrl?: string;
  reason?: string;
}> {
  if (match.playingXIConfirmed) {
    return { updated: false, reason: "already_confirmed" };
  }

  const players = await prisma.player.findMany({
    where: {
      team: { in: [match.team1, match.team2] },
      season: match.season,
    },
    select: {
      id: true,
      name: true,
      team: true,
      season: true,
    },
  });

  if (players.length === 0) {
    return { updated: false, reason: "no_players_found" };
  }

  const scraped = await scrapePlayingXI(match);
  if (!scraped) {
    return { updated: false, reason: "lineup_not_found" };
  }

  const team1Players = players.filter((player) => player.team === match.team1);
  const team2Players = players.filter((player) => player.team === match.team2);
  const team1Names = scraped.teams.find((team) => team.team === match.team1)?.players ?? [];
  const team2Names = scraped.teams.find((team) => team.team === match.team2)?.players ?? [];
  const team1Match = matchScrapedNamesToPlayers(team1Names, team1Players);
  const team2Match = matchScrapedNamesToPlayers(team2Names, team2Players);

  if (team1Match.matchedIds.length !== 11 || team2Match.matchedIds.length !== 11) {
    console.warn(`[PlayingXI] Partial match for ${match.team1} vs ${match.team2}`, {
      source: scraped.source,
      pageUrl: scraped.pageUrl,
      team1Matched: team1Match.matchedIds.length,
      team2Matched: team2Match.matchedIds.length,
      team1Unmatched: team1Match.unmatchedNames,
      team2Unmatched: team2Match.unmatchedNames,
    });

    return { updated: false, reason: "player_name_match_failed" };
  }

  const allPlayerIds = players.map((player) => player.id);
  const selectedPlayerIds = [...team1Match.matchedIds, ...team2Match.matchedIds];

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.match.updateMany({
      where: {
        id: match.id,
        playingXIConfirmed: false,
      },
      data: {
        playingXIConfirmed: true,
      },
    });

    if (claimed.count === 0) return;

    await tx.playerMatchStats.updateMany({
      where: {
        matchId: match.id,
        playerId: { in: allPlayerIds },
      },
      data: {
        isInPlayingXI: false,
        isProbableXI: false,
      },
    });

    await Promise.all(
      selectedPlayerIds.map((playerId) =>
        tx.playerMatchStats.upsert({
          where: { playerId_matchId: { playerId, matchId: match.id } },
          update: {
            isInPlayingXI: true,
            isProbableXI: false,
            isImpactPlayer: false,
          },
          create: {
            playerId,
            matchId: match.id,
            isInPlayingXI: true,
            isProbableXI: false,
            isImpactPlayer: false,
          },
        })
      )
    );
  }, { isolationLevel: "Serializable" });

  console.log(`[PlayingXI] Confirmed ${match.team1} vs ${match.team2} from ${scraped.source}: ${scraped.pageUrl}`);

  return {
    updated: true,
    source: scraped.source,
    pageUrl: scraped.pageUrl,
  };
}

export async function runAutoPlayingXISync(now = new Date()) {
  const lineupWindowStart = new Date(now.getTime() - 30 * 60 * 1000);
  const lineupWindowEnd = new Date(now.getTime() + 45 * 60 * 1000);

  const lineupMatches = await prisma.match.findMany({
    where: {
      playingXIConfirmed: false,
      status: { in: ["UPCOMING", "LIVE"] },
      date: { gte: lineupWindowStart, lte: lineupWindowEnd },
    },
    orderBy: { date: "asc" },
  });

  const results: Array<{
    match: string;
    updated: boolean;
    source?: ScrapeSource;
    pageUrl?: string;
    reason?: string;
  }> = [];

  for (const match of lineupMatches) {
    try {
      const result = await maybeAutoConfirmPlayingXI(match);
      results.push({
        match: `${match.team1} vs ${match.team2}`,
        ...result,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[PlayingXI] Sync failed for ${match.team1} vs ${match.team2}:`, errorMsg);
      results.push({
        match: `${match.team1} vs ${match.team2}`,
        updated: false,
        reason: errorMsg,
      });
    }
  }

  return {
    processed: lineupMatches.length,
    results,
  };
}

export const __internal = {
  extractPlayingXISections,
  htmlToText,
  matchScrapedNamesToPlayers,
  normalizeText,
};
