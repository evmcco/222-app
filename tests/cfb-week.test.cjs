const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Load the pure TypeScript helper with the project's existing compiler.
const compiled = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../lib/cfb-week.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;
const helper = { exports: {} };
new Function('exports', compiled)(helper.exports);
const { resolveCfbWeek, isInCfbWeek } = helper.exports;

// Boundaries from ESPN's 2026 regular-season calendar.
const calendar = {
  season: { year: 2026, type: 2 },
  week: { number: 1 },
  leagues: [{ calendar: [{ value: '2', entries: [
    { value: '1', startDate: '2026-08-22T07:00Z', endDate: '2026-09-08T06:59Z' },
    { value: '2', startDate: '2026-09-08T07:00Z', endDate: '2026-09-14T06:59Z' },
  ] }] }],
};

test('Saturday, Sunday and Labor Day Monday stay in 2026 Week 1', () => {
  for (const date of ['2026-09-05T18:00Z', '2026-09-06T18:00Z', '2026-09-07T23:30Z', '2026-09-08T06:59:59Z']) {
    assert.deepEqual(resolveCfbWeek(calendar, new Date(date)), { season_year: 2026, week_number: 1 });
  }
});

test('cached calendar advances at the exact Week 2 boundary', () => {
  assert.deepEqual(resolveCfbWeek(calendar, new Date('2026-09-08T07:00Z')), { season_year: 2026, week_number: 2 });
});

test('uses supplied season year instead of the device calendar year', () => {
  assert.deepEqual(resolveCfbWeek({ season: { year: 2026 }, week: { number: 1 } }, new Date('2027-01-05')), { season_year: 2026, week_number: 1 });
});

test('validates metadata and accepts Week 0', () => {
  assert.equal(resolveCfbWeek({}), null);
  assert.equal(resolveCfbWeek({ season: { year: 2026 }, week: { number: -1 } }), null);
  assert.deepEqual(resolveCfbWeek({ season: { year: 2026 }, week: { number: 0 } }), { season_year: 2026, week_number: 0 });
});

test('realtime membership requires both season and week', () => {
  const week = { season_year: 2026, week_number: 1 };
  assert.equal(isInCfbWeek({ ...week, game_date: '2026-09-05' }, week), true);
  assert.equal(isInCfbWeek({ ...week, week_number: 2 }, week), false);
  assert.equal(isInCfbWeek({ ...week, season_year: 2025 }, week), false);
});

test('separates ESPN combined Week 1 into Week 0 and Week 1', () => {
  const { matchesSelectedWeek } = helper.exports;
  const game = { season_year: 2026, week_number: 1, game_date: '2026-08-29T16:00:00' };
  assert.equal(matchesSelectedWeek(game, { season_year: 2026, week_number: 0 }, true), true);
  assert.equal(matchesSelectedWeek(game, { season_year: 2026, week_number: 1 }, true), false);
  assert.equal(matchesSelectedWeek({ ...game, game_date: '2026-09-07T23:30:00' }, game, true), true);
  assert.equal(matchesSelectedWeek(game, game, false), true);
});
