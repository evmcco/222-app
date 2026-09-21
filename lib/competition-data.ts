import type { Game, Team } from '@/hooks/games';
export type Poll = 'ap' | 'usa' | 'cfp';
export interface TeamSeasonRecord {
  team_id: string; season_year: number; wins: number; losses: number; ties: number;
  conference_wins: number; conference_losses: number; conference_ties: number;
  overall_ready: boolean; conference_ready: boolean; updated_at: string;
}
export interface RankingEntry { team_id: string; rank: number; previous_rank: number | null; points: number | null; first_place_votes: number | null }
export interface ReceivingVotesEntry { team_id: string; points: number }
export interface RankingRelease {
  id: string; season_year: number; poll: Poll; season_type: number; week_number: number;
  published_at: string; fetched_at: string; entries: RankingEntry[];
  others_receiving_votes?: ReceivingVotesEntry[] | null;
}
export interface StandingEntry {
  team_id: string; group_id: string; group_name: string; position: number | null; source_order: number;
  overall_wins: number; overall_losses: number; overall_ties: number;
  conference_wins: number; conference_losses: number; conference_ties: number;
}
export interface ConferenceStanding {
  season_year: number; conference_id: string; conference_name: string; fetched_at: string; records_match?: boolean; entries: StandingEntry[];
}
export interface CompetitionSnapshot {
  season_year: number; revision: number; fetched_at: string;
  teams: Record<string, Team>; games: Game[]; records: Record<string, TeamSeasonRecord>;
  rankings: Partial<Record<Poll, RankingRelease>>; standings: ConferenceStanding[];
}
export interface CompetitionState { snapshot?: CompetitionSnapshot; isCurrent: boolean; error: string | null; checkedAt: number }
export function acceptCompetitionSnapshot(previous: CompetitionState | undefined, incoming: CompetitionSnapshot, minimumRevision = 0): CompetitionState {
  if (!Number.isSafeInteger(incoming?.revision) || incoming.revision < 0 || !Array.isArray(incoming.games) || !incoming.records || !incoming.rankings || !Array.isArray(incoming.standings)) {
    throw new Error('Invalid competition snapshot');
  }
  if ((previous?.snapshot && previous.snapshot.season_year !== incoming.season_year)) throw new Error('Wrong competition season');
  const floor = Math.max(previous?.snapshot?.revision ?? 0, minimumRevision);
  if (incoming.revision < floor) return { ...previous!, isCurrent: false, error: null, checkedAt: previous?.checkedAt ?? 0 };
  return { snapshot: incoming, isCurrent: true, error: null, checkedAt: Date.now() };
}
export function currentTeamRecord(data: CompetitionSnapshot | undefined, teamId: string, isCurrent: boolean): TeamSeasonRecord | undefined {
  const record = data?.records[teamId];
  return isCurrent && record?.overall_ready ? record : undefined;
}
export function currentRank(data: CompetitionSnapshot | undefined, teamId: string, poll: Poll): number | null {
  return data?.rankings[poll]?.entries.find(entry => entry.team_id === teamId)?.rank ?? null;
}
