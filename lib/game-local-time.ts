import type { Game } from '@/hooks/games';

export function gameDate(value: string): Date {
  // The database's zone-less timestamps are UTC.
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
}

export function localGameTime(game: Pick<Game, 'game_date' | 'start_time'>) {
  const date = gameDate(game.game_date);
  if (!Number.isFinite(date.getTime())) return { date: 'Date TBD', time: 'TBD' };
  return {
    date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).replace(',', ''),
    time: game.start_time === 'TBD' ? 'TBD' : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}
