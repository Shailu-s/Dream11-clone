import { PlayerSelection, TeamValidation } from "@/types";

interface PlayerInfo {
  id: string;
  team: string;
  role: string;
  creditPrice: number;
}

export function validateTeam(
  selections: PlayerSelection[],
  players: PlayerInfo[]
): TeamValidation {
  const errors: string[] = [];
  const selectedPlayers = players.filter((p) =>
    selections.some((s) => s.playerId === p.id)
  );

  // Must have exactly 11 players
  if (selections.length !== 11) {
    errors.push(`Select exactly 11 players (${selections.length} selected)`);
  }

  // Salary cap: 100 credits
  const totalCredits = selectedPlayers.reduce((sum, p) => sum + p.creditPrice, 0);
  if (totalCredits > 100) {
    errors.push(`Total credits ${totalCredits.toFixed(1)} exceeds cap of 100`);
  }

  // Max 7 from one team
  const teamCounts = new Map<string, number>();
  for (const p of selectedPlayers) {
    teamCounts.set(p.team, (teamCounts.get(p.team) || 0) + 1);
  }
  for (const [team, count] of teamCounts) {
    if (count > 7) {
      errors.push(`Max 7 players from one team (${team}: ${count})`);
    }
  }

  // Role constraints
  const roleCounts = new Map<string, number>();
  for (const p of selectedPlayers) {
    roleCounts.set(p.role, (roleCounts.get(p.role) || 0) + 1);
  }

  const wk = roleCounts.get("WK") || 0;
  const bat = roleCounts.get("BAT") || 0;
  const ar = roleCounts.get("AR") || 0;
  const bowl = roleCounts.get("BOWL") || 0;

  if (wk < 1 || wk > 4) errors.push(`Wicketkeepers: need 1-4 (have ${wk})`);
  if (bat < 2 || bat > 6) errors.push(`Batsmen: need 2-6 (have ${bat})`);
  if (ar < 1 || ar > 4) errors.push(`All-rounders: need 1-4 (have ${ar})`);
  if (bowl < 2 || bowl > 6) errors.push(`Bowlers: need 2-6 (have ${bowl})`);

  // Captain & Vice-Captain
  const captains = selections.filter((s) => s.isCaptain);
  const viceCaptains = selections.filter((s) => s.isViceCaptain);
  if (captains.length !== 1) errors.push("Select exactly 1 Captain");
  if (viceCaptains.length !== 1) errors.push("Select exactly 1 Vice-Captain");
  if (captains.length === 1 && viceCaptains.length === 1) {
    if (captains[0].playerId === viceCaptains[0].playerId) {
      errors.push("Captain and Vice-Captain must be different players");
    }
  }

  return { valid: errors.length === 0, errors };
}
