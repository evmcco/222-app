import type { GameRow } from '@/hooks/games';
import { gameDate, localDateKey } from './game-local-time';

// The ingestion service stores UTC kickoff times in a zone-less SQL column.
function timestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const time = gameDate(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function compareKickoff(a: GameRow, b: GameRow): number {
  const kickoff = (game: GameRow) => timestamp(game.game_date) || Infinity;
  return kickoff(a) - kickoff(b) || a.id.localeCompare(b.id);
}

function remainingTime(game: GameRow): number {
  const quarter = game.quarter?.trim().toUpperCase() ?? '';
  const overtime = /^(\d*)OT$/.exec(quarter);
  // Overtime is untimed; later overtime periods precede earlier ones.
  if (overtime) return -(Number(overtime[1]) || 1);
  if (quarter === 'HALFTIME' || game.current_game_time?.toUpperCase() === 'HALFTIME') return 30 * 60;
  const period = /^(?:Q([1-4])|([1-4])(?:ST|ND|RD|TH)?)$/.exec(quarter);
  const clock = /^(\d{1,2}):([0-5]\d)$/.exec(game.current_game_time?.trim() ?? '');
  // Missing/invalid clocks must not look like the end of a game.
  if (!period || !clock || Number(clock[1]) * 60 + Number(clock[2]) > 15 * 60) return Infinity;
  return (4 - Number(period[1] ?? period[2])) * 15 * 60 + Number(clock[1]) * 60 + Number(clock[2]);
}

function priority(game: GameRow, today: string): number {
  const isToday = localDateKey(gameDate(game.game_date)) === today;
  if (game.status === 'live' && !game.interruption) return 0;
  // Keep unresolved delays visible, including games interrupted across midnight.
  if (game.interruption && game.status !== 'final' && (isToday || game.status === 'live')) return 1;
  if (game.status === 'final') return isToday ? 2 : 5;
  return isToday ? 3 : 4;
}

export function compareGames(a: GameRow, b: GameRow, now: Date = new Date()): number {
  const today = localDateKey(now);
  const group = priority(a, today);
  const groupOrder = group - priority(b, today);
  if (groupOrder) return groupOrder;
  if (group === 0) {
    return remainingTime(a) - remainingTime(b) || compareKickoff(a, b);
  }
  if (group === 2) {
    // Historical games without a recorded completion fall back to kickoff.
    const completionOrder = (timestamp(b.completed_at) || timestamp(b.game_date))
      - (timestamp(a.completed_at) || timestamp(a.game_date));
    return completionOrder || compareKickoff(a, b);
  }
  return compareKickoff(a, b);
}
