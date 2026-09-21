const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

test('local day refreshes at midnight and on resume, handles DST and cleans up', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    let now = Date.parse('2026-03-07T23:59:59-05:00');
    class Clock extends Date {
      constructor(...args) { super(...(args.length ? args : [now])); }
    }
    let state, effect, listener, removed = false;
    let nextId = 0;
    const timers = new Map();
    const mocks = {
      react: {
        useState: init => { state = init(); return [state, value => { state = value; }]; },
        useEffect: run => { effect = run; },
      },
      'react-native': {
        AppState: { addEventListener: (event, handler) => {
          assert.equal(event, 'change');
          listener = handler;
          return { remove: () => { removed = true; } };
        } },
      },
    };
    const code = ts.transpileModule(fs.readFileSync(require.resolve('../hooks/use-local-day.ts'), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    new Function('exports', 'require', 'Date', 'setTimeout', 'clearTimeout', code)(
      exports, name => mocks[name], Clock,
      (run, delay) => { const id = ++nextId; timers.set(id, { run, delay }); return id; },
      id => timers.delete(id),
    );
    exports.useLocalDay();
    const cleanup = effect();
    assert.equal(state.getDate(), 7);
    assert.equal([...timers.values()][0].delay, 1000);
    now += 1000;
    [...timers.values()][0].run();
    assert.equal(state.getDate(), 8);
    assert.equal(timers.size, 1);
    assert.equal([...timers.values()][0].delay, 23 * 60 * 60 * 1000);

    now = Date.parse('2026-03-10T12:00:00-04:00');
    listener('background');
    assert.equal(state.getDate(), 8);
    listener('active');
    assert.equal(state.getDate(), 10);
    assert.equal(timers.size, 1);
    assert.equal([...timers.values()][0].delay, 12 * 60 * 60 * 1000);
    cleanup();
    assert.equal(timers.size, 0);
    assert.equal(removed, true);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
