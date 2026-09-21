import { compareKickoff } from '@/lib/game-sort';
import type { Game, Team } from '@/hooks/games';

export type ScheduleGame = Game & { conference_competition?: boolean | null };
export type StandingRecord = { wins: number; losses: number; ties?: number; conference_wins: number; conference_losses: number; conference_ties?: number; overall_ready: boolean; conference_ready: boolean };
export type StandingRow = { team: Team; conferenceAbbreviation?: string; rank?: number; previousRank?: number | null; position?: number | null; group?: string; record?: StandingRecord };
export type StandingsView = 'top25' | 'conferences';
export type Poll = 'ap' | 'usa' | 'cfp';
export const pollNames: Record<Poll, string> = { ap: 'AP Top 25', usa: 'Coaches Poll', cfp: 'CFP Rankings' };

export function recordLabel(record: StandingRecord | undefined, conference = false): string {
  if (!record || !(conference ? record.conference_ready : record.overall_ready)) return '—';
  const wins = conference ? record.conference_wins : record.wins;
  const losses = conference ? record.conference_losses : record.losses;
  const ties = conference ? record.conference_ties : record.ties;
  return `${wins}–${losses}${ties ? `–${ties}` : ''}`;
}
export function teamSchedule(games: ScheduleGame[], teamId: string, conferenceOnly: boolean) {
  return games.filter(game => (game.home_team_id === teamId || game.away_team_id === teamId)
    && (!conferenceOnly || game.conference_competition === true))
    .sort(compareKickoff);
}
export function opponentFor(game: ScheduleGame, teamId: string) {
  return game.home_team_id === teamId ? game.away_team : game.home_team;
}
export function gameResult(game: ScheduleGame, teamId: string): 'W' | 'L' | 'T' | null {
  if (game.status !== 'final' || /cancel|postpon|suspend/i.test(game.interruption ?? '')) return null;
  const home = game.home_team_score;
  const away = game.away_team_score;
  if (home == null || away == null || !Number.isFinite(home) || !Number.isFinite(away)) return null;
  if (home === away) return 'T';
  return (home > away) === (game.home_team_id === teamId) ? 'W' : 'L';
}
export function currentRank(ranks: ReadonlyMap<string, number>, teamId: string) {
  const rank = ranks.get(teamId);
  return rank && rank >= 1 && rank <= 25 ? rank : undefined;
}
