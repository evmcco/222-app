const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const code = ts.transpileModule(fs.readFileSync(require.resolve(`../lib/${name}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('exports', 'require', code)(exports, dependency => dependency.startsWith('@/constants/')
    ? require(dependency.replace('@/constants/', '../constants/')) : load(dependency.replace('./', '')));
  modules.set(name, exports);
  return exports;
}
const { compareGames, compareKickoff } = load('game-sort');
const { buildDatedGameSections: build } = load('game-date-sections');
const { matchesGameFilter } = load('game-filters');
const { gamesForDemo, nowForDemo, pinsForDemo, narrativesForDemo, demoCatalog, demoGames, demoScenarios } = load('demo-games');
const today = new Date(2026, 8, 19, 18);
const kickoff = new Date(2026, 8, 19, 12).toISOString();
const game = (id, extra = {}) => ({ id, game_date: kickoff, status: 'live', quarter: '4th', current_game_time: '1:00', ...extra });
const ids = groups => groups.flatMap(s => s.data.map(g => g.id));
const saturdayOrder = ['01-q3', '13-no-odds', '10-3ot', '03-ot', '09-q4', '02-half', '08-end-q1', '07-q1', '04-delay', '14-pregame-delay', '11-final-ot', '12-push', '06-upcoming', '15-suspended', '16-no-periods', '05-final'].map(id => `demo:${id}`);
const midnightOrder = ['01-q3', '13-no-odds', '10-3ot', '03-ot', '09-q4', '02-half', '08-end-q1', '07-q1', '04-delay', '14-pregame-delay', '06-upcoming', '15-suspended', '16-no-periods', '05-final', '11-final-ot', '12-push'].map(id => `demo:${id}`);

function inZone(zone, run) {
  const previous = process.env.TZ;
  process.env.TZ = zone;
  try { run(); } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
}

for (const zone of ['America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Pacific/Kiritimati', 'Pacific/Honolulu']) {
  test(`manual sorting demos preserve exact expected order in ${zone}`, () => inZone(zone, () => {
    for (const [scenario, expected] of [['Sorting · Saturday', saturdayOrder], ['Sorting · after midnight', midnightOrder]]) {
      assert.ok(demoScenarios.includes(scenario));
      const games = gamesForDemo(scenario);
      const sections = build(games, pinsForDemo(scenario), nowForDemo(scenario));
      assert.deepEqual(ids(sections), expected);
      assert.equal(new Set(ids(sections)).size, games.length);
      assert.equal(new Set(sections.map(s => s.key)).size, sections.length);
      assert.equal(nowForDemo(scenario).getDate(), scenario.endsWith('Saturday') ? 19 : 20);
    }
  }));
}

test('demo resets return clean fixtures, pins, scores and narratives without touching the original slate', () => {
  const original = JSON.stringify(demoGames);
  const games = gamesForDemo('Sorting · Saturday');
  const narratives = narrativesForDemo(games);
  for (const row of games) {
    assert.ok(row.id.startsWith('demo:'));
    assert.equal(row.season_year, 2026);
    assert.equal(row.week_number, 3);
    assert.equal(row.status === 'scheduled', !narratives.has(row.id));
    for (const side of ['home', 'away']) {
      assert.ok(demoCatalog.teams[row[`${side}_team_id`]]);
      const scores = row[`${side}_team_period_scores`];
      if (scores) assert.equal(scores.reduce((a, b) => a + b, 0), row[`${side}_team_score`]);
    }
    if (narratives.has(row.id)) {
      assert.equal(narratives.get(row.id).is_final, row.status === 'final');
      assert.equal(narratives.get(row.id).updated_at, row.updated_at);
    }
  }
  games[0].status = 'final';
  pinsForDemo('Sorting · Saturday').pop();
  assert.equal(gamesForDemo('Sorting · Saturday')[0].status, 'live');
  assert.equal(pinsForDemo('Sorting · Saturday').length, 2);
  assert.equal(JSON.stringify(demoGames), original);
  assert.equal(nowForDemo('Saturday · 2 PM').toISOString(), '2026-09-19T18:00:00.000Z');
});

test('pins ignore status priority, survive score updates and restore natural order when unpinned', () => {
  const games = gamesForDemo('Sorting · Saturday');
  const now = nowForDemo('Sorting · Saturday');
  const pins = pinsForDemo('Sorting · Saturday');
  const pinnedFinal = games.map(row => row.id === 'demo:01-q3' ? { ...row, status: 'final', completed_at: now.toISOString() } : row);
  assert.deepEqual(ids(build(pinnedFinal, pins, now)), saturdayOrder);
  const unpinned = ids(build(games, [], now));
  assert.ok(unpinned.indexOf('demo:09-q4') < unpinned.indexOf('demo:01-q3'));
  assert.ok(unpinned.indexOf('demo:01-q3') < unpinned.indexOf('demo:02-half'));
  assert.ok(unpinned.indexOf('demo:06-upcoming') < unpinned.indexOf('demo:13-no-odds'));
  assert.ok(unpinned.indexOf('demo:13-no-odds') < unpinned.indexOf('demo:15-suspended'));
});

test('filters preserve visible sorting and never resurrect hidden pins', () => {
  const scenario = 'Sorting · Saturday';
  for (const filter of ['all', 'ranked', 'state:FL', 'conference:8']) {
    const games = gamesForDemo(scenario).filter(row => matchesGameFilter(row, filter, demoCatalog));
    const visibleIds = new Set(games.map(row => row.id));
    assert.deepEqual(ids(build(games, [...pinsForDemo(scenario), 'demo:other-week'], nowForDemo(scenario))),
      saturdayOrder.filter(id => visibleIds.has(id)));
  }
});

test('scoreboard ingestion order cannot change ordering or ties', () => {
  const scenario = 'Sorting · Saturday';
  const games = gamesForDemo(scenario);
  // Different rotations and reversals represent provider snapshots arriving in arbitrary order.
  for (let i = 0; i < games.length; i++) {
    const shuffled = [...games.slice(i), ...games.slice(0, i)];
    for (const order of [shuffled, [...shuffled].reverse()]) {
      assert.deepEqual(ids(build(order, pinsForDemo(scenario), nowForDemo(scenario))), saturdayOrder);
    }
  }
  const tied = [game('c'), game('a'), game('b')];
  assert.deepEqual(ids(build(tied, [], today)), ['a', 'b', 'c']);
  assert.deepEqual(ids(build(tied, ['b', 'c', 'a'], today)), ['a', 'b', 'c']);
});

test('delay, resume and completion transitions move a game to the appropriate group', () => {
  const nearEnd = game('near-end');
  const earlier = game('earlier', { current_game_time: '4:00' });
  const final = game('final', { status: 'final', completed_at: new Date(2026, 8, 19, 17).toISOString() });
  const sort = row => ids(build([earlier, final, row], [], today));
  assert.deepEqual(sort(nearEnd), ['near-end', 'earlier', 'final']);
  assert.deepEqual(sort({ ...nearEnd, interruption: 'Suspended' }), ['earlier', 'near-end', 'final']);
  assert.deepEqual(sort({ ...nearEnd, interruption: undefined }), ['near-end', 'earlier', 'final']);
  assert.deepEqual(sort({ ...nearEnd, status: 'final', interruption: 'Delayed', completed_at: today.toISOString() }), ['earlier', 'near-end', 'final']);
});

test('equivalent clock formats, halftime and quarter boundaries use the same remaining time', () => {
  for (const [quarter, clock] of [['4th', '01:00'], ['Q4', '1:00'], ['4', '1:00'], [' 4TH ', ' 1:00 ']]) {
    assert.equal(compareGames(game('same'), game('same', { quarter, current_game_time: clock }), today), 0);
  }
  for (const [quarter, clock] of [['2nd', '0:00'], ['HALFTIME', ''], ['2nd', 'Halftime'], ['3rd', '15:00']]) {
    assert.equal(compareGames(game('same', { quarter: '2nd', current_game_time: '0:00' }), game('same', { quarter, current_game_time: clock }), today), 0);
  }
  assert.equal(compareGames(game('same', { quarter: '1st', current_game_time: '0:00' }), game('same', { quarter: '2nd', current_game_time: '15:00' }), today), 0);
});

test('bad clocks remain behind known live clocks, but ahead of delayed and upcoming games', () => {
  const malformed = [null, '', 'TBD', 'garbage', '1:60', '-1:00', '15:01', '99:00'];
  for (const clock of malformed) {
    const rows = [game('unknown', { current_game_time: clock }), game('known', { quarter: '1st', current_game_time: '15:00' }), game('delayed', { interruption: 'Delayed' }), game('upcoming', { status: 'scheduled' })];
    assert.deepEqual(ids(build(rows, [], today)), ['known', 'unknown', 'delayed', 'upcoming']);
  }
});

test('completion ties, missing timestamps and invalid timestamps have deterministic fallbacks', () => {
  const rows = [
    game('missing', { status: 'final', completed_at: null }),
    game('invalid', { status: 'final', completed_at: 'bad-date' }),
    game('b', { status: 'final', completed_at: today.toISOString() }),
    game('a', { status: 'final', completed_at: today.toISOString() }),
  ];
  assert.deepEqual(ids(build(rows, [], today)), ['a', 'b', 'invalid', 'missing']);
  assert.deepEqual([game('bad', { game_date: 'invalid' }), game('valid')].sort(compareKickoff).map(row => row.id), ['valid', 'bad']);
});

test('comparator stays reflexive, antisymmetric and transitive across mixed statuses and bad data', () => {
  const scenario = 'Sorting · Saturday';
  const now = nowForDemo(scenario);
  const rows = [...gamesForDemo(scenario), game('no-clock', { current_game_time: null }), game('bad-date', { game_date: '' })];
  const compare = (a, b) => compareGames(a, b, now);
  for (const a of rows) {
    assert.equal(compare(a, a), 0);
    for (const b of rows) {
      assert.equal(Math.sign(compare(a, b)) + Math.sign(compare(b, a)), 0);
      for (const c of rows) {
        if (compare(a, b) <= 0 && compare(b, c) <= 0) assert.ok(compare(a, c) <= 0);
      }
    }
  }
});
