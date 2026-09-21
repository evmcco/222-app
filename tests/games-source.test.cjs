const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(require.resolve('../lib/games-source.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exportsObject = {};
new Function('exports', code)(exportsObject);
const { shouldUseLegacyGames } = exportsObject;
const missingRpc = 'Could not find the function public.get_competition_snapshot(p_season) in the schema cache';
test('Games stays live before the standings RPC exists and switches atomically once a snapshot arrives', () => {
  assert.equal(shouldUseLegacyGames(false, missingRpc), true);
  assert.equal(shouldUseLegacyGames(true, missingRpc), false);
  assert.equal(shouldUseLegacyGames(true, null), false);
});
test('transient network errors and unrelated missing functions do not replace shared data with legacy games', () => {
  for (const error of [null, 'Network request failed', 'Timeout', 'Could not find the function public.other_function(p_season) in the schema cache']) {
    assert.equal(shouldUseLegacyGames(false, error), false);
  }
});
