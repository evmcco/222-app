import type { GameRow } from '@/hooks/games';

// The ingestion service stores UTC kickoff times in a zone-less SQL column.
function timestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const time = Date.parse(zoned);
  return Number.isFinite(time) ? time : 0;
}

export function compareGames(a: GameRow, b: GameRow): number {
  if (a.status === 'final' && b.status !== 'final') return 1;
  if (a.status !== 'final' && b.status === 'final') return -1;
  if (a.status === 'final' && b.status === 'final') {
    // Historical games without a recorded completion fall back to kickoff.
    const completionOrder = (timestamp(b.completed_at) || timestamp(b.game_date))
      - (timestamp(a.completed_at) || timestamp(a.game_date));
    return completionOrder || timestamp(b.game_date) - timestamp(a.game_date) || a.id.localeCompare(b.id);
  }
  return timestamp(a.game_date) - timestamp(b.game_date) || a.id.localeCompare(b.id);
}
