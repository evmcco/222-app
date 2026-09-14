const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(require.resolve('../lib/game-filters.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const helpers = {};
new Function('exports', 'require', code)(helpers, name => require(name.replace('@/constants/', '../constants/')));
const { matchesGameFilter, buildGameSections, filterOptions, isGameFilter } = helpers;
function game(id, overrides = {}) {
  return { id, home_team_id: '52', away_team_id: '61', home_team_ranking: null, away_team_ranking: null, status: 'scheduled', game_date: '2026-09-19T16:00:00', ...overrides };
}
test('ranked includes either top-25 team and excludes unranked sentinels', () => {
  assert.equal(matchesGameFilter(game('a', { away_team_ranking: 25 }), 'ranked'), true);
  assert.equal(matchesGameFilter(game('a', { home_team_ranking: 1 }), 'ranked'), true);
  for (const rank of [null, 0, 26, 99]) assert.equal(matchesGameFilter(game('a', { home_team_ranking: rank }), 'ranked'), false);
});
test('conference and school state match either side, including cross-conference games', () => {
  for (const filter of ['conference:1', 'conference:8', 'state:FL', 'state:GA']) assert.equal(matchesGameFilter(game('a'), filter), true);
  assert.equal(matchesGameFilter(game('a'), 'state:TX'), false);
  assert.equal(matchesGameFilter(game('a', { home_team_id: 'unknown', away_team_id: 'missing' }), 'conference:18'), false);
});
test('pins respect filters, appear once and sort by kickoff regardless of status', () => {
  const games = [game('later'), game('earlier', { status: 'final', game_date: '2026-09-18T16:00:00Z' }), game('live', { status: 'live' }), game('hidden', { home_team_id: 'missing', away_team_id: 'unknown' })];
  const sections = buildGameSections(games, 'state:FL', ['later', 'earlier', 'hidden', 'another-week']);
  assert.deepEqual(sections.map(s => [s.key, s.data.map(g => g.id)]), [['pinned', ['earlier', 'later']], ['live', ['live']]]);
  assert.deepEqual(buildGameSections(games, 'ranked', ['later']), []);
});
test('unpin restores normal grouping and interrupted finals do not duplicate', () => {
  const sections = buildGameSections([game('a', { status: 'final', interruption: 'Delayed' }), game('b', { interruption: 'Delayed' }), game('c')], 'all', []);
  assert.deepEqual(sections.map(s => [s.key, s.data.map(g => g.id)]), [['delayed', ['b']], ['scheduled', ['c']], ['final', ['a']]]);
});
test('menu order, single values and states are valid', () => {
  assert.deepEqual(filterOptions.slice(0, 13).map(o => o.label), ['All games', 'Ranked', 'ACC', 'Big 12', 'Big Ten', 'SEC', 'American', 'Conference USA', 'Mid-American', 'Mountain West', 'Pac-12', 'Sun Belt', 'Independents']);
  const states = filterOptions.slice(13).map(o => o.label);
  assert.deepEqual(states, [...states].sort((a, b) => a.localeCompare(b)));
  assert(!states.includes('Alaska'));
  assert.equal(new Set(filterOptions.map(o => o.value)).size, filterOptions.length);
  assert.equal(isGameFilter('conference:8'), true);
  assert.equal(isGameFilter(['ranked', 'state:FL']), false);
});

test('state matches an FCS opponent but the menu offers only FBS states', () => {
  const catalog = require('../constants/fbs-teams-2026.json');
  const fcsGeorgia = Object.entries(catalog.teams).find(([, t]) => t.conference === 'fcs' && t.state === 'GA');
  assert(fcsGeorgia);
  assert.equal(matchesGameFilter(game('fcs', { home_team_id: 'unknown', away_team_id: fcsGeorgia[0] }), 'state:GA'), true);
  assert.equal(filterOptions.some(o => o.value === 'state:MT'), false);
  assert.equal(Object.values(catalog.teams).filter(t => t.conference !== 'fcs').length, 138);
});
