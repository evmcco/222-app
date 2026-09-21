const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(require.resolve(file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function('exports', 'require', code)(exports, name => dependencies[name] ?? require(name));
  return exports;
}
const helper = load('../lib/team-logo.ts');
const original = 'https://a.espncdn.com/i/teamlogos/ncaa/500/2294.png';
const dark = 'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/2294.png';

test('ESPN NCAA images prefer dark artwork, preserving image query parameters', () => {
  assert.equal(helper.darkTeamLogo(original), dark);
  assert.equal(helper.darkTeamLogo(`${original}?w=64&h=64`), `${dark}?w=64&h=64`);
  assert.equal(helper.darkTeamLogo(original.replace('/500/', '/200/')), dark);
  assert.equal(helper.darkTeamLogo(dark), dark);
});

test('custom, unrelated, and malformed image URLs remain untouched', () => {
  for (const logo of ['', 'team.png', 'https://example.com/i/teamlogos/ncaa/500/2294.png',
    'https://a.espncdn.com/i/teamlogos/nfl/500/1.png', 'https://a.espncdn.com/guid/custom/logo.png']) {
    assert.equal(helper.darkTeamLogo(logo), logo);
  }
});

test('a missing dark variant falls back once and another team still gets its dark variant', () => {
  let state;
  const { TeamLogo } = load('../components/team-logo.tsx', {
    '@/lib/team-logo': helper,
    'expo-image': { Image: 'Image' },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    react: { useState: () => [state, next => { state = next; }] },
  });
  const errors = [];
  const props = { logo: original, onError: error => errors.push(error), style: { width: 32 }, contentFit: 'contain' };
  const first = TeamLogo(props);
  assert.equal(first.props.source.uri, dark);
  assert.deepEqual(first.props.style, props.style);
  first.props.onError({ error: '404' });
  const fallback = TeamLogo(props);
  assert.equal(fallback.props.source.uri, original);
  assert.deepEqual(errors, []);
  fallback.props.onError({ error: 'offline' });
  assert.equal(TeamLogo(props).props.source.uri, original);
  assert.deepEqual(errors, [{ error: 'offline' }]);
  assert.equal(TeamLogo({ logo: original.replace('2294', '2132') }).props.source.uri, dark.replace('2294', '2132'));
  assert.equal(TeamLogo({ logo: '' }), null);
});
