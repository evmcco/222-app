import catalog from '@/constants/fbs-teams-2026.json';
import type { Game } from '@/hooks/games';

export type GameFilter = 'all' | 'ranked' | `conference:${string}` | `state:${string}`;
export type FilterOption = { value: GameFilter; label: string; group?: string };
const teams: Record<string, { conference: string; state: string }> = catalog.teams;
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
export const filterOptions: FilterOption[] = [
  { value: 'all', label: 'All games' },
  { value: 'ranked', label: 'Ranked' },
  ...[
    ['1', 'ACC', 'P4 Conferences'], ['4', 'Big 12'], ['5', 'Big Ten'], ['8', 'SEC'],
    ['151', 'American', 'G6 Conferences'], ['12', 'Conference USA'], ['15', 'Mid-American'],
    ['17', 'Mountain West'], ['9', 'Pac-12'], ['37', 'Sun Belt'], ['18', 'Independents'],
  ].map(([id, label, group]) => ({ value: `conference:${id}` as GameFilter, label, group })),
  ...[...catalog.fbsStates]
    .sort((a, b) => stateNames[a].localeCompare(stateNames[b]))
    .map((state, index) => ({ value: `state:${state}` as GameFilter, label: stateNames[state], group: index === 0 ? 'States' : undefined })),
];

export function isGameFilter(value: unknown): value is GameFilter {
  return filterOptions.some(option => option.value === value);
}

export function matchesGameFilter(game: Game, filter: GameFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'ranked') return [game.home_team_ranking, game.away_team_ranking]
    .some(rank => rank != null && rank >= 1 && rank <= 25);
  const [kind, value] = filter.split(':');
  return [game.home_team_id, game.away_team_id].some(id => {
    const team = teams[id];
    return team && (kind === 'conference' ? team.conference === value : team.state === value);
  });
}

export type GameSection = { key: 'pinned' | 'live' | 'delayed' | 'scheduled' | 'final'; title: string; data: Game[] };
function kickoff(game: Game) {
  const date = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(game.game_date) ? game.game_date : `${game.game_date}Z`;
  return Date.parse(date) || 0;
}
export function buildGameSections(games: Game[], filter: GameFilter, pins: readonly string[]): GameSection[] {
  const pinnedIds = new Set(pins);
  const visible = games.filter(game => matchesGameFilter(game, filter));
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
