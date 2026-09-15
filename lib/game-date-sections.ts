import type { Game } from '@/hooks/games';
import { gameDate, localGameTime } from './game-local-time';

export type DatedGameSection = { key: string; dateLabel: string; data: Game[] };

export function buildDatedGameSections(games: Game[], pins: readonly string[] = []): DatedGameSection[] {
  const timestamp = (game: Game) => {
    const time = gameDate(game.game_date).getTime();
    return Number.isFinite(time) ? time : Infinity;
  };
  const sorted = [...games].sort((a, b) => timestamp(a) - timestamp(b) || a.id.localeCompare(b.id));
  const pinnedIds = new Set(pins);
  const pinned: DatedGameSection = { key: 'pinned', dateLabel: 'Pinned', data: [] };
  const days = new Map<string, DatedGameSection>();
  for (const game of sorted) {
    if (pinnedIds.has(game.id)) {
      pinned.data.push(game);
      continue;
    }
    const date = gameDate(game.game_date);
    const key = Number.isFinite(date.getTime())
      ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : 'unknown';
    let group = days.get(key);
    if (!group) {
      group = { key, dateLabel: localGameTime(game).date, data: [] };
      days.set(key, group);
    }
    group.data.push(game);
  }
  return [...(pinned.data.length ? [pinned] : []), ...days.values()];
}
