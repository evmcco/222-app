const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/week-navigation.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const helpers = {};
new Function('exports', code)(helpers);
const { weekAfterSwipe } = helpers;

test('left advances and right returns, including Week 0', () => {
  assert.equal(weekAfterSwipe([0, 1, 2], 0, -80, 5), 1);
  assert.equal(weekAfterSwipe([0, 1, 2], 1, 80, 5), 0);
});
test('bounds, taps, vertical and diagonal scrolling do not change weeks', () => {
  assert.equal(weekAfterSwipe([0, 1, 2], 0, 80, 0), null);
  assert.equal(weekAfterSwipe([0, 1, 2], 2, -80, 0), null);
  assert.equal(weekAfterSwipe([0, 1, 2], 1, 10, 0), null);
  assert.equal(weekAfterSwipe([0, 1, 2], 1, 30, 100), null);
  assert.equal(weekAfterSwipe([0, 1, 2], 1, 70, 70), null);
  assert.equal(weekAfterSwipe([0, 1, 2], null, -80, 0), null);
});
