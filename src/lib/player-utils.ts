import { prisma } from "./prisma";
import { validateTeam } from "./team-validation";
import { PlayerSelection } from "@/types";

interface PlayerInfo {
  id: string;
  name: string;
  team: string;
  role: string;
  creditPrice: number;
}

/**
 * Validates player selections: checks all players exist and team rules pass.
 * Returns { valid: true, playerData } or { valid: false, error }.
 */
export async function validatePlayerSelections(
  players: PlayerSelection[]
): Promise<
  | { valid: true; playerData: PlayerInfo[] }
  | { valid: false; error: string }
> {
  const playerIds = players.map((p) => p.playerId);
  const uniquePlayerIds = Array.from(new Set(playerIds));
  const playerData = await prisma.player.findMany({
    where: { id: { in: uniquePlayerIds } },
  });

  const foundIds = new Set(playerData.map((p) => p.id));
  const missingCount = players.filter((s) => !foundIds.has(s.playerId)).length;
  if (missingCount > 0) {
    return {
      valid: false,
      error: "Some players in your team are no longer available. Please rebuild your team for this match.",
    };
  }

  const validation = validateTeam(players, playerData);
  if (!validation.valid) {
    return { valid: false, error: validation.errors.join(", ") };
  }

  return { valid: true, playerData };
}

/**
 * Resolves player details and fantasy points for a list of player selections.
 */
export async function resolvePlayerDetails(
  playerSelections: Array<{ playerId: string; isCaptain: boolean; isViceCaptain: boolean }>,
  matchId: string
) {
  const playerIds = playerSelections.map((p) => p.playerId);
  const [players, playerStats] = await Promise.all([
    prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, name: true, team: true, role: true, creditPrice: true },
    }),
    prisma.playerMatchStats.findMany({
      where: { matchId, playerId: { in: playerIds } },
      select: { playerId: true, fantasyPoints: true },
    }),
  ]);

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const statsMap = new Map(playerStats.map((s) => [s.playerId, s.fantasyPoints]));

  return playerSelections.map((sel) => ({
    ...sel,
    player: playerMap.get(sel.playerId) ?? null,
    fantasyPoints: statsMap.get(sel.playerId) ?? 0,
  }));
}
