export function calculateFantasyPoints(stats: {
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  wickets: number;
  oversBowled: number;
  maidens: number;
  runsConceded: number;
  catches: number;
  stumpings: number;
  runOutsDirect: number;
  runOutsIndirect: number;
  lbwBowled: number;
  didBat: boolean;
  isOut: boolean;
  isInPlayingXI?: boolean;
  isImpactPlayer?: boolean;
}): number {
  let points = 0;

  // Playing XI appearance bonus (+2)
  if (stats.isInPlayingXI) {
    points += 2;
  }

  // Impact player bonus (+2) — only if they actually batted or bowled (not just fielded)
  if (stats.isImpactPlayer && (stats.didBat || stats.oversBowled > 0)) {
    points += 2;
  }

  // Batting points
  points += stats.runs * 1;
  points += stats.fours * 1; // boundary bonus
  points += stats.sixes * 2; // six bonus

  if (stats.runs >= 100) points += 16;
  else if (stats.runs >= 50) points += 8;

  // Duck penalty (batted, got out, scored 0)
  if (stats.didBat && stats.isOut && stats.runs === 0) {
    points -= 2;
  }

  // Strike rate bonus/penalty (min 10 balls)
  if (stats.ballsFaced >= 10) {
    const sr = (stats.runs / stats.ballsFaced) * 100;
    if (sr > 170) points += 6;
    else if (sr > 150) points += 4;
    else if (sr > 130) points += 2;
    else if (sr >= 60 && sr <= 70) points -= 2;
    else if (sr >= 50 && sr < 60) points -= 4;
    else if (sr < 50) points -= 6;
  }

  // Bowling points
  points += stats.wickets * 25;
  points += stats.lbwBowled * 8; // LBW/Bowled bonus

  if (stats.wickets >= 5) points += 16;
  else if (stats.wickets >= 4) points += 8;
  else if (stats.wickets >= 3) points += 4;

  points += stats.maidens * 12;

  // Economy rate bonus/penalty (min 2 overs)
  if (stats.oversBowled >= 2) {
    const er = stats.runsConceded / stats.oversBowled;
    if (er < 5) points += 6;
    else if (er < 6) points += 4;
    else if (er <= 7) points += 2;
    else if (er >= 10 && er <= 11) points -= 2;
    else if (er > 11 && er <= 12) points -= 4;
    else if (er > 12) points -= 6;
  }

  // Fielding points
  points += stats.catches * 8;
  points += stats.stumpings * 12;
  points += stats.runOutsDirect * 12;
  points += stats.runOutsIndirect * 6;

  return points;
}

export function calculateEntryPoints(
  playerSelections: Array<{
    playerId: string;
    isCaptain: boolean;
    isViceCaptain: boolean;
  }>,
  statsMap: Map<string, number> // playerId -> fantasyPoints
): number {
  let total = 0;
  for (const sel of playerSelections) {
    const pts = statsMap.get(sel.playerId) || 0;
    if (sel.isCaptain) total += pts * 2;
    else if (sel.isViceCaptain) total += pts * 1.5;
    else total += pts;
  }
  return total;
}

export function calculateContestPlacements(
  entries: Array<{
    id: string;
    userId: string;
    totalPoints: number;
  }>,
  prizePool: number,
  distribution: Array<{
    rank: number;
    percentage: number;
  }>
) {
  const sortedEntries = [...entries].sort((a, b) => b.totalPoints - a.totalPoints);
  const numEntries = sortedEntries.length;
  const claimedDistribution = distribution.filter((d) => d.rank <= numEntries);
  const claimedPct = claimedDistribution.reduce((sum, d) => sum + d.percentage, 0);
  const unclaimedPct = 100 - claimedPct;
  const effectiveDistribution = claimedDistribution.map((d) => ({
    rank: d.rank,
    percentage: d.rank === 1 ? d.percentage + unclaimedPct : d.percentage,
  }));

  const placements: Array<{
    id: string;
    userId: string;
    totalPoints: number;
    rank: number;
    prizeWon: number;
  }> = [];

  let position = 1;
  let index = 0;

  while (index < sortedEntries.length) {
    const groupPoints = sortedEntries[index].totalPoints;
    const tieGroup = [sortedEntries[index]];
    index += 1;

    while (index < sortedEntries.length && sortedEntries[index].totalPoints === groupPoints) {
      tieGroup.push(sortedEntries[index]);
      index += 1;
    }

    const occupiedRanks = Array.from(
      { length: tieGroup.length },
      (_, offset) => position + offset
    );
    const combinedPrizePct = occupiedRanks.reduce((sum, rank) => {
      const prizeDist = effectiveDistribution.find((d) => d.rank === rank);
      return sum + (prizeDist?.percentage || 0);
    }, 0);
    const prizeWonPerEntry =
      tieGroup.length > 0 ? (prizePool * combinedPrizePct) / 100 / tieGroup.length : 0;

    for (const tiedEntry of tieGroup) {
      placements.push({
        ...tiedEntry,
        rank: position,
        prizeWon: prizeWonPerEntry,
      });
    }

    position += tieGroup.length;
  }

  return placements;
}
