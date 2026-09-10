/** Swiping left advances; swiping right returns. Vertical/short drags do nothing. */
export function weekAfterSwipe(weeks: number[], week: number | null, dx: number, dy: number): number | null {
  if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy) * 1.5) return null;
  const index = weeks.indexOf(week ?? -1);
  if (index < 0) return null;
  return weeks[index + (dx < 0 ? 1 : -1)] ?? null;
}
