import type { Game } from '@/hooks/games';

export type GameFilter = 'all' | 'ranked' | `conference:${string}` | `state:${string}`;
export type FilterOption = { value: GameFilter; label: string; group?: string };
export type TeamMetadata = {
  season_year: number; team_id: string; name: string; state: string; division: 'fbs' | 'fcs';
  conference_id: string; conference_name: string; conference_tier: 'p4' | 'g6' | 'independent' | 'fcs';
};
export type TeamCatalog = { season: number; rows: TeamMetadata[]; teams: Record<string, TeamMetadata> };
const stateNames: Record<string, string> = {
  AL: 'Alabama', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana',
  IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', MD: 'Maryland', MA: 'Massachusetts',
  MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', NV: 'Nevada', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin',
  WY: 'Wyoming', NE: 'Nebraska', ND: 'North Dakota', MT: 'Montana', ME: 'Maine', NH: 'New Hampshire',
  VT: 'Vermont', AK: 'Alaska',
};
export const basicFilterOptions: FilterOption[] = [{ value: 'all', label: 'All games' }, { value: 'ranked', label: 'Ranked' }];
export function conferenceAbbreviation(name: string): string {
  return ({
    'Big Ten': 'B1G', 'Big 12': 'B12', American: 'AAC',
    'Conference USA': 'CUSA', 'Mid-American': 'MAC', 'Mountain West': 'MWC',
    'Pac-12': 'PAC-12', 'Sun Belt': 'SBC', Independents: 'IND',
  } as Record<string, string>)[name] ?? name;
}
export function makeTeamCatalog(rows: unknown, season: number): TeamCatalog {
  if (!Array.isArray(rows) || rows.length < 230 || rows.length > 500) throw new Error('Team metadata is incomplete');
  const teams: Record<string, TeamMetadata> = {};
  for (const row of rows) {
    if (!row || row.season_year !== season || typeof row.team_id !== 'string' || !/^\d+$/.test(row.team_id) || teams[row.team_id]
      || typeof row.name !== 'string' || !row.name || ![...Object.keys(stateNames), 'DC'].includes(row.state)
      || !['fbs', 'fcs'].includes(row.division) || typeof row.conference_id !== 'string' || !row.conference_id
      || typeof row.conference_name !== 'string' || !row.conference_name
      || !['p4', 'g6', 'independent', 'fcs'].includes(row.conference_tier)
      || (row.division === 'fcs') !== (row.conference_tier === 'fcs')) throw new Error('Invalid team metadata');
    teams[row.team_id] = row;
  }
  if (rows.filter(row => row.division === 'fbs').length < 130) throw new Error('FBS metadata is incomplete');
  return { season, rows, teams };
}
export function getFilterOptions(catalog?: TeamCatalog): FilterOption[] {
  if (!catalog) return basicFilterOptions;
  const fbs = catalog.rows.filter(team => team.division === 'fbs');
  const conferences = [...new Map(fbs.map(team => [team.conference_id, team])).values()];
  const order = { p4: 0, g6: 1, independent: 2, fcs: 3 };
  conferences.sort((a, b) => order[a.conference_tier] - order[b.conference_tier] || a.conference_name.localeCompare(b.conference_name));
  const seen = new Set<string>();
  return [...basicFilterOptions,
    ...conferences.map(team => {
      const group = seen.has(team.conference_tier) ? undefined : ({ p4: 'P4 Conferences', g6: 'G6 Conferences', independent: undefined, fcs: undefined }[team.conference_tier]);
      seen.add(team.conference_tier);
      return { value: `conference:${team.conference_id}` as GameFilter,
        label: team.conference_tier === 'g6' ? conferenceAbbreviation(team.conference_name) : team.conference_name, group };
    }),
    ...[...new Set(fbs.map(team => team.state))].filter(state => stateNames[state])
      .sort((a, b) => stateNames[a].localeCompare(stateNames[b]))
      .map((state, index) => ({ value: `state:${state}` as GameFilter, label: stateNames[state], group: index === 0 ? 'States' : undefined })),
  ];
}
export function isGameFilter(value: unknown): value is GameFilter {
  if (typeof value !== 'string') return false;
  return value === 'all' || value === 'ranked' || /^conference:\d+$/.test(value)
    || (value.startsWith('state:') && Object.hasOwn(stateNames, value.slice(6)));
}
export function savedFilterLabel(value: GameFilter) {
  return basicFilterOptions.find(option => option.value === value)?.label
    ?? (value.startsWith('state:') ? stateNames[value.slice(6)] : 'Saved conference');
}

export function matchesGameFilter(game: Game, filter: GameFilter, catalog?: TeamCatalog): boolean {
  if (filter === 'all') return true;
  if (filter === 'ranked') return [game.home_team_ranking, game.away_team_ranking]
    .some(rank => rank != null && rank >= 1 && rank <= 25);
  const [kind, value] = filter.split(':');
  return [game.home_team_id, game.away_team_id].some(id => {
    const team = catalog?.season === game.season_year ? catalog.teams[id] : undefined;
    return team && (kind === 'conference' ? team.conference_id === value : team.state === value);
  });
}

export type GameSection = { key: 'pinned' | 'live' | 'delayed' | 'scheduled' | 'final'; title: string; data: Game[] };
function kickoff(game: Game) {
  const date = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(game.game_date) ? game.game_date : `${game.game_date}Z`;
  return Date.parse(date) || 0;
}
export function buildGameSections(games: Game[], filter: GameFilter, pins: readonly string[], catalog?: TeamCatalog): GameSection[] {
  const pinnedIds = new Set(pins);
  const visible = games.filter(game => matchesGameFilter(game, filter, catalog));
  const unpinned = visible.filter(game => !pinnedIds.has(game.id));
  const sections: GameSection[] = [
    { key: 'pinned', title: 'Pinned', data: visible.filter(game => pinnedIds.has(game.id)).sort((a, b) => kickoff(a) - kickoff(b) || a.id.localeCompare(b.id)) },
    { key: 'live', title: 'Live', data: unpinned.filter(game => game.status === 'live' && !game.interruption) },
    { key: 'delayed', title: 'Delayed', data: unpinned.filter(game => !!game.interruption && game.status !== 'final') },
    { key: 'scheduled', title: 'Upcoming', data: unpinned.filter(game => game.status === 'scheduled' && !game.interruption) },
    { key: 'final', title: 'Final', data: unpinned.filter(game => game.status === 'final') },
  ];
  return sections.filter(section => section.data.length > 0);
}
