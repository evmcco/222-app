import type { Game } from '@/hooks/games';
import { gameDate, localDateKey, localGameTime } from './game-local-time';
import { compareGames, compareKickoff } from './game-sort';

export type DatedGameSection = { key: string; dateLabel: string; data: Game[] };

export function buildDatedGameSections(games: Game[], pins: readonly string[] = [], now: Date = new Date()): DatedGameSection[] {
  const pinnedIds = new Set(pins);
  const pinned: DatedGameSection = {
    key: 'pinned', dateLabel: 'Pinned', data: games.filter(game => pinnedIds.has(game.id)).sort(compareKickoff),
  };
  const sorted = games.filter(game => !pinnedIds.has(game.id)).sort((a, b) => compareGames(a, b, now));
  const sections: DatedGameSection[] = pinned.data.length ? [pinned] : [];
  const occurrences = new Map<string, number>();
  let previousDate: string | undefined;
  for (const game of sorted) {
    const date = localDateKey(gameDate(game.game_date));
    // Group only adjacent dates: merging every game on a date would undo live
    // clock ordering and mix older finals into the upcoming portion of the list.
    if (date !== previousDate) {
      const occurrence = (occurrences.get(date) ?? 0) + 1;
      occurrences.set(date, occurrence);
      sections.push({ key: `${date}:${occurrence}`, dateLabel: localGameTime(game).date, data: [] });
      previousDate = date;
    }
    sections[sections.length - 1].data.push(game);
  }
  return sections;
}
