export interface ScenarioLeaderboardEntry {
  scenarioId: string;
  cityName: string;
  completionTicks: number;
  completedAt: string;
}

export function recordCompletion(
  entries: ScenarioLeaderboardEntry[],
  entry: ScenarioLeaderboardEntry,
): ScenarioLeaderboardEntry[] {
  return [...entries, entry].sort(
    (left, right) => left.completionTicks - right.completionTicks,
  );
}

export function serializeLeaderboard(entries: ScenarioLeaderboardEntry[]): string {
  return JSON.stringify(entries);
}

export function deserializeLeaderboard(serialized: string): ScenarioLeaderboardEntry[] {
  const parsed = JSON.parse(serialized) as ScenarioLeaderboardEntry[];
  if (!Array.isArray(parsed)) throw new Error("Invalid leaderboard");
  return [...parsed].sort((left, right) => left.completionTicks - right.completionTicks);
}
