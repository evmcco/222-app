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

test('date sections preserve status priority without mutating input', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  try {
    const games = [game('later', '2026-09-18T07:00:00Z'), game('final', '2026-09-18T01:00:00', 'final'), game('live', '2026-09-18T06:59:00Z', 'live')];
    const groups = build(games, [], new Date('2026-09-19T12:00:00Z'));
    assert.deepEqual(groups.map(s => [s.dateLabel, s.data.map(g => g.id)]), [
      ['Thursday Sep 17', ['live']], ['Friday Sep 18', ['later']], ['Thursday Sep 17', ['final']],
    ]);
    assert.equal(new Set(groups.map(s => s.key)).size, groups.length);
    assert.equal(games[0].id, 'later');
    assert.deepEqual(localGameTime(games[1]), { date: 'Thursday Sep 17', time: '6:00 PM' });
    assert.equal(localGameTime({ ...games[1], start_time: 'TBD' }).time, 'TBD');
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('Saturday displays all seven priorities, with pinned kickoff order and Thursday finals before Friday', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const fixture = (id, day, hour, status, extra = {}) => ({
      ...game(id, `2026-09-${day}T${hour}:00:00Z`, status), ...extra,
    });
    const games = [
      fixture('friday-final', '18', '20', 'final'),
      fixture('saturday-upcoming-later', '19', '23', 'scheduled'),
      fixture('saturday-final-earlier', '19', '14', 'final', { completed_at: '2026-09-19T17:00:00Z' }),
      fixture('pin-later', '20', '18', 'scheduled'),
      fixture('thursday-final', '17', '20', 'final'),
      fixture('live-q3', '19', '16', 'live', { quarter: '3rd', current_game_time: '1:00' }),
      fixture('sunday-upcoming', '20', '18', 'scheduled'),
      fixture('sunday-postponed', '20', '19', 'scheduled', { interruption: 'Delayed' }),
      fixture('saturday-delay', '19', '15', 'live', { interruption: 'Delayed' }),
      fixture('saturday-final-latest', '19', '13', 'final', { completed_at: '2026-09-19T18:00:00Z', interruption: 'Delayed' }),
      fixture('pin-earlier', '18', '18', 'final'),
      fixture('live-q4', '19', '17', 'live', { quarter: '4th', current_game_time: '2:00' }),
      fixture('saturday-upcoming', '19', '22', 'scheduled'),
    ];
    const before = JSON.stringify(games);
    const groups = build(games, ['pin-later', 'pin-earlier', 'not-visible'], new Date('2026-09-19T19:00:00Z'));
    assert.deepEqual(groups.flatMap(s => s.data.map(g => g.id)), [
      'pin-earlier', 'pin-later', 'live-q4', 'live-q3', 'saturday-delay',
      'saturday-final-latest', 'saturday-final-earlier', 'saturday-upcoming',
      'saturday-upcoming-later', 'sunday-upcoming', 'sunday-postponed', 'thursday-final', 'friday-final',
    ]);
    assert.equal(JSON.stringify(games), before);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('live clock ordering survives interleaved kickoff dates after midnight', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const games = [
      { ...game('today-q4', '2026-09-20T04:00:00Z', 'live'), quarter: '4th', current_game_time: '1:00' },
      { ...game('yesterday-ot', '2026-09-20T01:00:00Z', 'live'), quarter: '1OT', current_game_time: '' },
      { ...game('yesterday-q3', '2026-09-20T02:00:00Z', 'live'), quarter: '3rd', current_game_time: '3:00' },
      game('today-upcoming', '2026-09-20T18:00:00Z'),
      game('yesterday-final', '2026-09-20T00:00:00Z', 'final'),
    ];
    const groups = build(games, [], new Date('2026-09-20T05:00:00Z'));
    assert.deepEqual(groups.flatMap(s => s.data.map(g => g.id)), [
      'yesterday-ot', 'today-q4', 'yesterday-q3', 'today-upcoming', 'yesterday-final',
    ]);
    assert.equal(new Set(groups.map(s => s.key)).size, groups.length);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('live time uses quarter plus clock, handles overtime, halftime and unknown clocks', () => {
  const fixtures = [
    ['unknown', null, null], ['q1', '1st', '1:00'], ['q3', '3rd', '12:00'],
    ['half', '2nd', '0:00'], ['ot', '1OT', ''], ['q4-late', '4th', '0:12'],
    ['q4-early', '4th', '10:00'], ['3ot', '3OT', ''], ['invalid', '4th', '99:99'],
    ['q4-end', '4th', '0:00'], ['q1-end', '1st', '0:00'],
  ].map(([id, quarter, current_game_time]) => ({ ...game(id, '2026-09-19T16:00:00Z', 'live'), quarter, current_game_time }));
  assert.deepEqual(build(fixtures, [], new Date('2026-09-19T20:00:00Z')).flatMap(s => s.data.map(g => g.id)), [
    '3ot', 'ot', 'q4-end', 'q4-late', 'q4-early', 'q3', 'half', 'q1-end', 'q1', 'invalid', 'unknown',
  ]);
});

test('today is local, rolls over at midnight, and historical finals fall back to kickoff', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  try {
    const games = [
      game('early-final', '2026-09-19T16:00:00', 'final'),
      game('late-final', '2026-09-20T01:00:00Z', 'final'),
      game('next-day', '2026-09-20T19:00:00Z'),
    ];
    const ids = now => build(games, [], new Date(now)).flatMap(s => s.data.map(g => g.id));
    assert.deepEqual(ids('2026-09-20T06:59:59Z'), ['late-final', 'early-final', 'next-day']);
    assert.deepEqual(ids('2026-09-20T07:00:00Z'), ['next-day', 'early-final', 'late-final']);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('clock and final updates immediately change the displayed order', () => {
  const now = new Date('2026-09-19T20:00:00Z');
  const a = { ...game('a', '2026-09-19T16:00:00Z', 'live'), quarter: '4th', current_game_time: '3:00' };
  const b = { ...a, id: 'b', current_game_time: '4:00' };
  const ids = games => build(games, [], now).flatMap(s => s.data.map(g => g.id));
  assert.deepEqual(ids([b, a]), ['a', 'b']);
  assert.deepEqual(ids([a, { ...b, current_game_time: '2:00' }]), ['b', 'a']);
  assert.deepEqual(ids([{ ...a, status: 'final', completed_at: now.toISOString() }, b]), ['b', 'a']);
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
