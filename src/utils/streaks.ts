//src/utils/streaks.ts
const DAY_MS = 86400000;

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getStreak(completions: string[]): number {
  if (!completions || completions.length === 0) return 0;

  const sorted = [...completions].sort().reverse();
  const today = todayString();
  const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);

  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const expected = new Date(new Date(current).getTime() - DAY_MS)
      .toISOString()
      .slice(0, 10);
    if (sorted[i] === expected) {
      streak++;
      current = sorted[i];
    } else {
      break;
    }
  }
  return streak;
}