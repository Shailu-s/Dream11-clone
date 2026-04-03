export function getNextDefaultTeamName(
  username: string,
  existingTeamNames: string[]
): string {
  const trimmedUsername = username.trim();
  if (!trimmedUsername) return "";

  const usedSuffixes = new Set<number>();

  for (const teamName of existingTeamNames) {
    if (teamName === trimmedUsername) {
      usedSuffixes.add(1);
      continue;
    }

    const match = teamName.match(new RegExp(`^${escapeRegExp(trimmedUsername)}_t(\\d+)$`));
    if (!match) continue;

    const suffix = Number(match[1]);
    if (Number.isInteger(suffix) && suffix >= 2) {
      usedSuffixes.add(suffix);
    }
  }

  if (!usedSuffixes.has(1)) {
    return trimmedUsername;
  }

  let nextSuffix = 2;
  while (usedSuffixes.has(nextSuffix)) {
    nextSuffix += 1;
  }

  return `${trimmedUsername}_t${nextSuffix}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
