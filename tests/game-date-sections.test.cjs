const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
function load(name) {
  const code = ts.transpileModule(fs.readFileSync(require.resolve(`../lib/${name}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('exports', 'require', code)(exports, name => load(name.replace('./', '')));
  return exports;
}
const { buildDatedGameSections: build } = load('game-date-sections');
const { localGameTime } = load('game-local-time');
const game = (id, game_date, status = 'scheduled') => ({ id, game_date, status, start_time: '7:00 PM' });

test('groups all statuses by local day, in chronological order, without mutating input', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  try {
    const games = [game('later', '2026-09-18T07:00:00Z'), game('final', '2026-09-18T01:00:00', 'final'), game('live', '2026-09-18T06:59:00Z', 'live')];
    const groups = build(games);
    assert.deepEqual(groups.map(s => [s.dateLabel, s.data.map(g => g.id)]), [
      ['Thursday Sep 17', ['final', 'live']], ['Friday Sep 18', ['later']],
    ]);
    assert.equal(games[0].id, 'later');
    assert.deepEqual(localGameTime(games[1]), { date: 'Thursday Sep 17', time: '6:00 PM' });
    assert.equal(localGameTime({ ...games[1], start_time: 'TBD' }).time, 'TBD');
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('uses device timezone for positive offsets and winter daylight-saving boundaries', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Tokyo';
    assert.deepEqual(localGameTime(game('a', '2026-09-17T23:00:00Z')), { date: 'Friday Sep 18', time: '8:00 AM' });
    process.env.TZ = 'America/Los_Angeles';
    assert.equal(localGameTime(game('a', '2026-01-02T07:59:00Z')).date, 'Thursday Jan 1');
    assert.equal(localGameTime(game('a', '2026-01-02T08:00:00Z')).date, 'Friday Jan 2');
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('empty and invalid dates are handled safely', () => {
  assert.deepEqual(build([]), []);
  const groups = build([game('b', ''), game('a', 'invalid')]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].dateLabel, 'Date TBD');
  assert.deepEqual(localGameTime(game('a', 'invalid')), { date: 'Date TBD', time: 'TBD' });
});


test('pins precede date groups regardless of status and appear exactly once', () => {
  const games = [game('later', '2026-09-19T16:00:00Z'), game('regular', '2026-09-17T16:00:00Z', 'live'), game('earlier', '2026-09-18T16:00:00Z', 'final')];
  const groups = build(games, ['later', 'earlier']);
  assert.equal(groups[0].key, 'pinned');
  assert.equal(groups[0].dateLabel, 'Pinned');
  assert.deepEqual(groups[0].data.map(g => g.id), ['earlier', 'later']);
  assert.deepEqual(groups.slice(1).flatMap(s => s.data.map(g => g.id)), ['regular']);
  assert.equal(groups.flatMap(s => s.data).length, games.length);
  assert.equal(games[0].id, 'later');
});

test('filtered-out and other-week pins do not create a section; unpin restores dates', () => {
  const visible = [game('visible', '2026-09-19T16:00:00Z')];
  assert.deepEqual(build(visible, ['filtered-out', 'other-week']), build(visible));
  assert.deepEqual(build([], ['pinned']), []);
  assert.equal(build(visible, ['visible'])[0].key, 'pinned');
  assert.notEqual(build(visible, [])[0].key, 'pinned');
});
