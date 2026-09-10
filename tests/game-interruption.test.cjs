const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/game-interruption.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const helper = {};
new Function('exports', code)(helper);
const { getGameInterruption } = helper;
test('SMU–FSU delay is identified despite ESPN marking state as in progress', () => {
  assert.deepEqual(getGameInterruption({ period: 0, type: { name: 'STATUS_DELAYED', state: 'in', completed: false } }), { label: 'Delayed', beforeKickoff: true });
});
test('midgame delay preserves started-game behavior', () => {
  assert.deepEqual(getGameInterruption({ period: 3, type: { name: 'STATUS_DELAYED' } }), { label: 'Delayed', beforeKickoff: false });
});
test('resuming play or finishing clears interruption', () => {
  assert.equal(getGameInterruption({ period: 1, type: { name: 'STATUS_IN_PROGRESS' } }), null);
  assert.equal(getGameInterruption({ type: { name: 'STATUS_FINAL', completed: true } }), null);
  assert.equal(getGameInterruption(), null);
});
