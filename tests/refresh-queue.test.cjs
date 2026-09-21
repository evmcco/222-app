const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(require.resolve('../lib/refresh-queue.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports_ = {};
new Function('exports', code)(exports_);
const { createRefreshQueue } = exports_;
const tick = () => new Promise(resolve => setImmediate(resolve));

test('concurrent refreshes serialize and callers await updates that arrive during the request', async () => {
  const completions = [];
  let calls = 0;
  const refresh = createRefreshQueue(() => {
    calls++;
    return new Promise(resolve => completions.push(resolve));
  });
  let finished = false;
  const first = refresh();
  // Simultaneous tab focus and mount checks share one request.
  assert.equal(refresh(), first);
  void first.then(() => { finished = true; });
  await tick();
  assert.equal(calls, 1);
  // A realtime revision and a pull gesture during that request require one
  // trailing check, and neither caller may resolve before it finishes.
  assert.equal(refresh(), first);
  assert.equal(refresh(), first);
  completions.shift()();
  await tick();
  assert.equal(calls, 2);
  assert.equal(finished, false);
  completions.shift()();
  await first;
  assert.equal(finished, true);
  const next = refresh();
  await tick();
  assert.equal(calls, 3);
  completions.shift()();
  await next;
});

test('a failed request releases the queue for a later retry', async () => {
  let calls = 0;
  const refresh = createRefreshQueue(async () => {
    if (++calls === 1) throw new Error('offline');
  });
  await assert.rejects(refresh(), /offline/);
  await refresh();
  assert.equal(calls, 2);
});
