const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/demo-games.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const fixture = {};
new Function('exports', code)(fixture);
const { demoGames, gamesForDemo, demoCatalog, demoNarratives } = fixture;
test('demo fixtures have isolated IDs, matching metadata and consistent period totals', () => {
  assert.equal(new Set(demoGames.map(game => game.id)).size, demoGames.length);
  for (const game of demoGames) {
    assert.ok(game.id.startsWith('demo:'));
    for (const side of ['home', 'away']) {
      assert.ok(demoCatalog.teams[game[`${side}_team_id`]]);
      const scores = game[`${side}_team_period_scores`];
      if (scores) assert.equal(scores.reduce((a, b) => a + b, 0), game[`${side}_team_score`]);
    }
    assert.ok(Number.isFinite(Date.parse(game.game_date)));
  }
});
test('Saturday snapshot and focused scenarios cover all requested states', () => {
  assert.equal(gamesForDemo('Saturday · 2 PM').length, 16);
  for (const scenario of ['Upcoming', 'In progress', 'Completed', 'Overtime', 'Delayed']) {
    assert.ok(gamesForDemo(scenario).length > 0);
  }
  assert.ok(gamesForDemo('Upcoming').every(game => game.status === 'scheduled' && !game.interruption));
  assert.ok(gamesForDemo('Completed').every(game => game.status === 'final'));
  assert.ok(gamesForDemo('Delayed').some(game => game.status === 'scheduled'));
  assert.ok(gamesForDemo('Delayed').some(game => game.status === 'live'));
  assert.ok(gamesForDemo('Overtime').some(game => game.quarter === '3OT'));
  assert.ok(gamesForDemo('In progress').some(game => game.quarter === '2nd' && game.current_game_time === '0:00'));
  assert.ok(demoGames.some(game => game.spread === null && game.total_points === null));
  assert.ok(demoGames.some(game => game.status === 'final' && game.home_team_score - game.away_team_score + game.spread === 0));
  for (const id of demoNarratives.keys()) assert.ok(demoGames.some(game => game.id === id));
});
test('every started game has a scoring update and upcoming games have none', () => {
  for (const game of demoGames) {
    const narrative = demoNarratives.get(game.id);
    if (game.status === 'scheduled') {
      assert.equal(narrative, undefined, game.id);
      continue;
    }
    assert.ok(narrative?.headline?.trim(), `${game.id} needs a headline`);
    assert.ok(narrative?.detail?.trim(), `${game.id} needs scoring context`);
    assert.equal(narrative.is_final, game.status === 'final');
    assert.ok(narrative.period >= 1);
    assert.ok(game.home_team_score + game.away_team_score > 0);
    assert.match(narrative.detail, /touchdown|field goal|extra point|two-point/i);
  }
  assert.equal(demoNarratives.get('demo:03-ot').period, 4);
  assert.equal(demoNarratives.get('demo:10-3ot').period, 6);
  assert.equal(demoNarratives.get('demo:11-final-ot').period, 6);
});
test('each team and ranking appears at most once in the demo week', () => {
  const teams = new Set();
  const ranks = new Set();
  for (const game of demoGames) {
    for (const side of ['home', 'away']) {
      const team = game[`${side}_team_id`];
      const rank = game[`${side}_team_ranking`];
      assert.ok(!teams.has(team), `Team ${team} plays twice`);
      teams.add(team);
      if (rank !== null) {
        assert.ok(Number.isInteger(rank) && rank >= 1 && rank <= 25);
        assert.ok(!ranks.has(rank), `Ranking #${rank} is assigned twice`);
        ranks.add(rank);
      }
    }
  }
});
test('featured game is pinned with Georgia Tech blowing out Georgia', () => {
  const game = demoGames.find(game => game.id === fixture.demoDefaultPins[0]);
  assert.equal(game.home_team.abbreviation, 'UGA');
  assert.equal(game.away_team.abbreviation, 'GT');
  assert.equal(game.status, 'live');
  assert.equal(game.home_team_score, 0);
  assert.equal(game.away_team_score, 49);
  assert.equal(demoNarratives.get(game.id).period, 3);
});
