import type { Game, Team } from '@/hooks/games';
import type { TeamCatalog, TeamMetadata } from '@/lib/game-filters';
import type { GameNarrative } from '@/hooks/narratives';

// Fictional, frozen snapshot. Never use these IDs with a live service.
export const demoWeek = { season_year: 2026, season_type: 2, week_number: 3 };
export const demoScenarios = ['Saturday · 2 PM', 'Upcoming', 'In progress', 'Completed', 'Overtime', 'Delayed'] as const;
export type DemoScenario = typeof demoScenarios[number];
const identities = [
  ['61', 'Georgia', 'UGA', 'GA', '8', 'SEC'], ['59', 'Georgia Tech', 'GT', 'GA', '1', 'ACC'],
  ['194', 'Ohio State', 'OSU', 'OH', '5', 'Big Ten'], ['130', 'Michigan', 'MICH', 'MI', '5', 'Big Ten'],
  ['251', 'Texas', 'TEX', 'TX', '8', 'SEC'], ['245', 'Texas A&M', 'TAMU', 'TX', '8', 'SEC'],
  ['2483', 'Oregon', 'ORE', 'OR', '5', 'Big Ten'], ['264', 'Washington', 'WASH', 'WA', '5', 'Big Ten'],
  ['52', 'Florida State', 'FSU', 'FL', '1', 'ACC'], ['57', 'Florida', 'FLA', 'FL', '8', 'SEC'],
  ['228', 'Clemson', 'CLEM', 'SC', '1', 'ACC'], ['2390', 'Miami', 'MIA', 'FL', '1', 'ACC'],
  ['213', 'Penn State', 'PSU', 'PA', '5', 'Big Ten'], ['2', 'Auburn', 'AUB', 'AL', '8', 'SEC'],
  ['2633', 'Tennessee', 'TENN', 'TN', '8', 'SEC'], ['201', 'Oklahoma', 'OU', 'OK', '8', 'SEC'],
  ['99', 'LSU', 'LSU', 'LA', '8', 'SEC'], ['30', 'USC', 'USC', 'CA', '5', 'Big Ten'],
  ['87', 'Notre Dame', 'ND', 'IN', '18', 'FBS Independents'], ['2509', 'Purdue', 'PUR', 'IN', '5', 'Big Ten'],
  ['254', 'Utah', 'UTAH', 'UT', '4', 'Big 12'], ['252', 'BYU', 'BYU', 'UT', '4', 'Big 12'],
  ['2306', 'Kansas State', 'KSU', 'KS', '4', 'Big 12'], ['2305', 'Kansas', 'KU', 'KS', '4', 'Big 12'],
  ['2294', 'Iowa', 'IOWA', 'IA', '5', 'Big Ten'], ['275', 'Wisconsin', 'WIS', 'WI', '5', 'Big Ten'],
  ['2567', 'SMU', 'SMU', 'TX', '1', 'ACC'], ['2628', 'TCU', 'TCU', 'TX', '4', 'Big 12'],
  ['150', 'Duke', 'DUKE', 'NC', '1', 'ACC'], ['153', 'North Carolina', 'UNC', 'NC', '1', 'ACC'],
  ['97', 'Louisville', 'LOU', 'KY', '1', 'ACC'], ['221', 'Pittsburgh', 'PITT', 'PA', '1', 'ACC'],
];
// Fictional poll: each rank belongs to exactly one team for the entire slate.
const rankings = [3, null, 1, 8, 2, 12, 4, null, 17, null, 9, 10, 5, null, 6, 15, 7, 16, 11, null, 13, 18, 14, 20, 19, 21, 22, 23, 24, 25, null, null];
const teams: Team[] = identities.map(([id, name, abbreviation]) => ({ id, name, abbreviation, logo: `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png` }));
const rows: TeamMetadata[] = identities.map(([team_id, name, , state, conference_id, conference_name]) => ({
  season_year: 2026, team_id, name, state, conference_id, conference_name, division: 'fbs', conference_tier: conference_id === '18' ? 'independent' : 'p4',
}));
export const demoCatalog: TeamCatalog = { season: 2026, rows, teams: Object.fromEntries(rows.map(row => [row.team_id, row])) };
function fixture(id: string, pair: number, status: Game['status'], quarter: string | null, clock: string | null,
  home: number[], away: number[], extra: Partial<Game> = {}): Game {
  const home_team = teams[pair * 2];
  const away_team = teams[pair * 2 + 1];
  const start = status === 'scheduled' ? '2026-09-19T19:30:00Z' : '2026-09-19T16:00:00Z';
  return {
    id: `demo:${id}`, ...demoWeek, home_team, away_team, home_team_id: home_team.id, away_team_id: away_team.id,
    status, quarter, current_game_time: clock, home_team_score: home.reduce((a, b) => a + b, 0), away_team_score: away.reduce((a, b) => a + b, 0),
    home_team_period_scores: home, away_team_period_scores: away, home_team_ranking: rankings[pair * 2], away_team_ranking: rankings[pair * 2 + 1],
    spread: -3.5, total_points: 48.5, home_moneyline: -160, away_moneyline: 140,
    start_time: start, game_date: start, date_display: 'Sep 19', created_at: start, updated_at: '2026-09-19T18:00:00Z', ...extra,
  };
}
// Start the demo with the featured rivalry pinned above the dated sections.
export const demoDefaultPins = ['demo:01-q3'];
export const demoGames: Game[] = [
  fixture('01-q3', 0, 'live', '3rd', '8:42', [0, 0, 0], [21, 21, 7]),
  fixture('02-half', 1, 'live', '2nd', '0:00', [7, 7], [0, 14]),
  fixture('03-ot', 2, 'live', '1OT', '', [7, 7, 7, 7, 0], [7, 7, 7, 7, 0], { start_time: '2026-09-19T14:00:00Z', game_date: '2026-09-19T14:00:00Z' }),
  fixture('04-delay', 3, 'live', '2nd', '6:12', [7, 3], [0, 7], { interruption: 'Delayed' }),
  fixture('05-final', 4, 'final', '4th', '0:00', [7, 14, 7, 7], [3, 7, 0, 7], { start_time: '2026-09-18T23:00:00Z', game_date: '2026-09-18T23:00:00Z' }),
  fixture('06-upcoming', 5, 'scheduled', null, null, [], []),
  fixture('07-q1', 6, 'live', '1st', '12:08', [7], [0], { spread: 0 }),
  fixture('08-end-q1', 7, 'live', '1st', '0:00', [7], [3]),
  fixture('09-q4', 8, 'live', '4th', '0:28', [7, 7, 7, 7], [7, 7, 7, 10], { spread: 3.5 }),
  fixture('10-3ot', 9, 'live', '3OT', '', [7, 7, 7, 7, 7, 8, 0], [7, 7, 7, 7, 7, 8, 0]),
  fixture('11-final-ot', 10, 'final', '2OT', '0:00', [7, 7, 7, 7, 7, 6], [7, 7, 7, 7, 7, 8]),
  fixture('12-push', 11, 'final', '4th', '0:00', [7, 7, 7, 7], [7, 7, 7, 0], { spread: -7, total_points: 49 }),
  fixture('13-no-odds', 12, 'scheduled', null, null, [], [], { spread: null, total_points: null, home_moneyline: null, away_moneyline: null }),
  fixture('14-pregame-delay', 13, 'scheduled', null, null, [], [], { interruption: 'Delayed' }),
  fixture('15-suspended', 14, 'live', '3rd', '5:21', [7, 3, 0], [0, 7, 0], { interruption: 'Suspended' }),
  fixture('16-no-periods', 15, 'final', '4th', '0:00', [17], [24], { home_team_period_scores: null, away_team_period_scores: null }),
];
export function gamesForDemo(scenario: DemoScenario): Game[] {
  return demoGames.filter(game => {
    switch (scenario) {
      case 'Upcoming': return game.status === 'scheduled' && !game.interruption;
      case 'In progress': return game.status === 'live' && !game.interruption;
      case 'Completed': return game.status === 'final';
      case 'Overtime': return game.quarter?.endsWith('OT');
      case 'Delayed': return !!game.interruption;
      default: return true;
    }
  });
}
// Each entry describes the latest scoring sequence, not a quarter-end recap.
// Period is when that score occurred (or the final period for completed games).
const narrativeCopy: Record<string, { period: number; headline: string; detail: string }> = {
  'demo:01-q3': {
    period: 3,
    headline: 'Tech hangs another seven on Georgia. It’s 49–0 in Athens.',
    detail: 'Georgia Tech just punched in its seventh touchdown and added the extra point, stretching a 42–0 halftime lead to 49–0 with 8:42 left in the third. No. 3 Georgia still has no answer. The Jackets are covering comfortably as underdogs and have cleared the 48.5 total all by themselves.',
  },
  'demo:02-half': {
    period: 2,
    headline: 'Michigan punches back to pull even at the half',
    detail: 'Michigan finished a late touchdown drive with the tying extra point, erasing Ohio State’s 14–7 lead. The Wolverines put up both of their touchdowns in the second quarter, sending this one to halftime locked at 14–14.',
  },
  'demo:03-ot': {
    period: 4,
    headline: 'Texas A&M’s last-gasp touchdown sends it to overtime',
    detail: 'Texas A&M found the end zone late in the fourth and hit the extra point to tie Texas 28–28. That answer wiped out a seven-point deficit; the first overtime possession is next, with the total already over 48.5.',
  },
  'demo:04-delay': {
    period: 2,
    headline: 'Oregon retakes the lead before weather stops play',
    detail: 'Oregon answered Washington’s tying touchdown with a field goal to move ahead 10–7. A weather delay has frozen the game with 6:12 left in the second quarter, leaving the Ducks a half-point shy of covering.',
  },
  'demo:05-final': {
    period: 4,
    headline: 'Florida scores late, but Florida State closes out a rout',
    detail: 'Florida’s final touchdown trimmed the deficit to 35–17, but the late answer never threatened Florida State’s lead. It did push the combined score to 52, clearing the 48.5 total as the Seminoles finished with a comfortable cover.',
  },
  'demo:07-q1': {
    period: 1,
    headline: 'Penn State strikes first with an opening-drive touchdown',
    detail: 'Penn State marched straight into the end zone and added the extra point for a 7–0 lead with 12:08 still left in the first quarter. Auburn now gets its first chance to answer in a game that opened as a pick’em.',
  },
  'demo:08-end-q1': {
    period: 1,
    headline: 'Oklahoma gets on the board, Tennessee’s lead shrinks to four',
    detail: 'Oklahoma salvaged a field goal from its latest drive to cut Tennessee’s lead to 7–3 at the end of the first quarter. The Volunteers still hold the edge, but their 3.5-point cover now rests on just half a point.',
  },
  'demo:09-q4': {
    period: 4,
    headline: 'USC nails the go-ahead kick with 28 seconds left',
    detail: 'USC broke a 28–28 tie with a field goal, putting LSU behind 31–28 with almost no time to respond. The Tigers are still covering as 3.5-point underdogs, while the combined 59 points have sailed over 48.5.',
  },
  'demo:10-3ot': {
    period: 6,
    headline: 'Purdue answers with two to force a third overtime',
    detail: 'Purdue matched Notre Dame’s touchdown and converted the required two-point try to make it 43–43. Neither offense blinked in the second overtime; now the game moves to alternating two-point attempts.',
  },
  'demo:11-final-ot': {
    period: 6,
    headline: 'BYU wins it with a two-point dagger in double OT',
    detail: 'After Utah scored but missed its two-point try, BYU answered with a touchdown and the winning conversion to finish 43–41. The Cougars turned a six-point deficit into an outright win as underdogs, capping an 84-point shootout.',
  },
  'demo:12-push': {
    period: 4,
    headline: 'Kansas State’s winning touchdown lands both bets on the number',
    detail: 'Kansas State broke a 21–21 tie with a fourth-quarter touchdown and extra point, then held Kansas off to win 28–21. The seven-point margin pushes the spread, and the combined 49 points land exactly on the total.',
  },
  'demo:15-suspended': {
    period: 2,
    headline: 'Duke’s go-ahead field goal holds up as play is suspended',
    detail: 'Duke answered North Carolina’s tying touchdown with a field goal before halftime to take a 10–7 lead. Neither team added points in the third before play was suspended with 5:21 remaining in the quarter.',
  },
  'demo:16-no-periods': {
    period: 4,
    headline: 'Pittsburgh delivers the final blow to take down Louisville',
    detail: 'Pittsburgh’s late touchdown and extra point snapped a 17–17 tie, and the Panthers protected that 24–17 lead to the finish. The road underdogs win outright, while the 41-point total stays below 48.5.',
  },
};
export const demoNarratives = new Map<string, GameNarrative>(demoGames.filter(game => game.status !== 'scheduled').map(game => [game.id, {
  id: `${game.id}:narrative`, game_id: game.id, ...narrativeCopy[game.id], is_final: game.status === 'final',
  created_at: game.updated_at, updated_at: game.updated_at,
}]));
export const demoDetails = { location: 'Demo Stadium · Atlanta, GA', channels: ['ABC', 'ESPN+'] };
