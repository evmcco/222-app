import { conferenceAbbreviation, getFilterOptions, type TeamCatalog } from '@/lib/game-filters';
import type { Team } from '@/hooks/games';
import type { CompetitionSnapshot } from '@/lib/competition-data';
import type { Poll, StandingRow, StandingsView } from '@/lib/standings';

export function selectStandings(data: CompetitionSnapshot | undefined, view: StandingsView, poll: Poll, conferenceId: string, catalog?: TeamCatalog) {
  const teams = new Map<string, Team>();
  for (const game of data?.games ?? []) { teams.set(game.home_team.id, game.home_team); teams.set(game.away_team.id, game.away_team); }
  // Snapshot identity map also covers teams whose schedule has not been published yet.
  const identities = data?.teams;
  for (const team of Object.values(identities ?? {})) teams.set(team.id, team);
  const release = data?.rankings[poll];
  const conference = data?.standings.find(item => item.conference_id === conferenceId);
  const teamConferences = new Map<string, string>();
  for (const standing of data?.standings ?? []) {
    for (const entry of standing.entries) teamConferences.set(entry.team_id, standing.conference_name);
  }
  if (catalog?.season === data?.season_year) {
    for (const team of catalog?.rows ?? []) teamConferences.set(team.team_id, team.conference_name);
  }
  const entries = view === 'top25'
    ? [...(release?.entries ?? [])].sort((a, b) => a.rank - b.rank)
    : [...(conference?.entries ?? [])];
  const rows: StandingRow[] = entries.map(entry => ({
    team: teams.get(entry.team_id) ?? { id: entry.team_id, name: 'Team unavailable', abbreviation: '—', logo: '' },
    conferenceAbbreviation: teamConferences.has(entry.team_id) ? conferenceAbbreviation(teamConferences.get(entry.team_id)!) : undefined,
    // Keep verified records from the same cached snapshot as the ranks/schedules
    // visible while checking for a newer revision.
    record: data?.records[entry.team_id]?.overall_ready ? data.records[entry.team_id] : undefined,
    ...('rank' in entry ? { rank: entry.rank, previousRank: entry.previous_rank } : {}),
  }));
  if (view === 'conferences') {
    // Use the same verified conference wins shown in each row. Unknown records
    // follow known records rather than being treated as zero wins.
    const wins = (row: StandingRow) => row.record?.conference_ready ? row.record.conference_wins : -1;
    const losses = (row: StandingRow) => row.record?.conference_ready ? row.record.conference_losses : 0;
    rows.sort((a, b) => wins(b) - wins(a)
      || losses(a) - losses(b)
      || a.team.name.localeCompare(b.team.name, 'en', { sensitivity: 'base' })
      || a.team.id.localeCompare(b.team.id));
    rows.forEach((row, index) => { row.position = index + 1; });
  }
  const badgePoll = view === 'conferences' ? 'ap' : poll;
  return { rows, games: data?.games ?? [], ranks: new Map((data?.rankings[badgePoll]?.entries ?? []).map(entry => [entry.team_id, entry.rank])),
    conferences: getStandingsConferences(data, catalog),
    polls: availablePolls(data),
  };
}

export function getStandingsConferences(data: CompetitionSnapshot | undefined, catalog?: TeamCatalog) {
  if (!data || catalog?.season !== data.season_year) return [];
  const available = new Set(data.standings.map(item => item.conference_id));
  return getFilterOptions(catalog).filter(option => option.value.startsWith('conference:') && available.has(option.value.slice(11)))
    .map(option => ({ id: option.value.slice(11), name: option.label, group: option.group }));
}
export function availablePolls(data: CompetitionSnapshot | undefined): Poll[] {
  return data?.rankings.cfp?.entries.length ? ['cfp', 'ap', 'usa'] : ['ap', 'usa'];
}
export type PollSelection = { season: number; cfpAvailable: boolean; poll: Poll };
export function resolvePollSelection(data: CompetitionSnapshot | undefined, selection: PollSelection | null): Poll {
  const polls = availablePolls(data);
  const cfpAvailable = polls.includes('cfp');
  return selection?.season === data?.season_year && selection?.cfpAvailable === cfpAvailable && polls.includes(selection.poll)
    ? selection.poll : polls[0];
}
