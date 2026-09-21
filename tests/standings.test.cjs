const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const target = { exports: {} }; cache.set(file, target.exports);
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', output)(name => name.startsWith('@/') ? load(`${name.slice(2)}.ts`) : name.startsWith('.') ? load(`${path.posix.join(path.posix.dirname(file), name)}.ts`) : require(name), target, target.exports);
  return target.exports;
}
const { createStandingsDemo } = load('lib/standings-demo.ts');
const { selectStandings } = load('lib/standings-data.ts');
const { teamSchedule, gameResult, recordLabel, currentRank } = load('lib/standings.ts');
test('all-season schedule stays chronological and includes new postseason games without a length cap', () => {
  const data = createStandingsDemo(); const team = data.games[0].home_team_id;
  const regular = teamSchedule(data.games, team, false);
  const postseason = { ...regular[0], id: 'demo:bowl', season_type: 3, game_date: '2026-12-28T19:00:00Z', start_time: '2:00 PM', conference_competition: false };
  const result = teamSchedule([postseason, ...data.games].reverse(), team, false);
  assert.equal(result.length, 13); assert.equal(result.at(-1).id, 'demo:bowl');
  assert.equal(teamSchedule([postseason], team, true).length, 0);
});
test('conference strips require explicit true, never team membership or unknown metadata', () => {
  const game = createStandingsDemo().games[0];
  const schedule = teamSchedule([true, false, null, undefined].map((flag, i) => ({ ...game, id: `${i}`, conference_competition: flag })), game.home_team_id, true);
  assert.deepEqual(schedule.map(game => game.id), ['0']);
});
test('W/L belongs to the expanded team and is absent until final', () => {
  const game = { ...createStandingsDemo().games[0], home_team_score: 21, away_team_score: 14, status: 'final' };
  assert.equal(gameResult(game, game.home_team_id), 'W'); assert.equal(gameResult(game, game.away_team_id), 'L');
  for (const status of ['scheduled', 'live']) assert.equal(gameResult({ ...game, status }, game.home_team_id), null);
  assert.equal(gameResult({ ...game, home_team_score: null }, game.home_team_id), null);
  assert.equal(gameResult({ ...game, interruption: 'Cancelled' }, game.home_team_id), null);
});
test('badges use the selected current poll; conferences always use AP, regardless of game rank', () => {
  const data = createStandingsDemo(); const team = data.rankings.ap.entries[0].team_id;
  const ap = selectStandings(data, 'top25', 'ap', '8');
  const coaches = selectStandings(data, 'top25', 'usa', '8');
  const conference = selectStandings(data, 'conferences', 'usa', '8');
  assert.equal(currentRank(ap.ranks, team), 1); assert.notEqual(currentRank(coaches.ranks, team), 1);
  assert.equal(currentRank(conference.ranks, team), 1);
  assert.equal(currentRank(new Map([[team, 26]]), team), undefined);
});
test('records hide when unverified, including conference-only readiness; provider evidence is never displayed', () => {
  const data = createStandingsDemo(); const team = data.standings[0].entries[0].team_id;
  data.standings[0].entries[0].overall_wins = 99;
  let rows = selectStandings(data, 'conferences', 'ap', data.standings[0].conference_id).rows;
  assert.equal(recordLabel(rows.find(row => row.team.id === team).record), `${data.records[team].wins}–${data.records[team].losses}`);
  data.records[team].overall_ready = false;
  rows = selectStandings(data, 'conferences', 'ap', data.standings[0].conference_id).rows;
  assert.equal(recordLabel(rows.find(row => row.team.id === team).record), '—');
  assert.equal(recordLabel({ ...data.records[team], conference_ready: false }, true), '—');
  assert.equal(recordLabel(undefined), '—');
});
test('conference standings sort by wins descending, losses ascending, then name, ignoring provider order', () => {
  const data = createStandingsDemo(); const conference = data.standings[0];
  conference.entries = conference.entries.slice(0, 4);
  const [alpha, beta, zulu, charlie] = conference.entries.map(entry => entry.team_id);
  for (const [id, name, wins, losses] of [[alpha, 'Alpha', 1, 3], [beta, 'Beta', 1, 0], [zulu, 'Zulu', 2, 2], [charlie, 'Charlie', 1, 0]]) {
    data.teams[id] = { ...data.teams[id], name };
    data.records[id] = { ...data.records[id], overall_ready: true, conference_ready: true, conference_wins: wins, conference_losses: losses };
  }
  conference.entries.forEach(entry => { entry.position = 99; entry.conference_wins = 99; entry.group_name = 'Old division'; });
  const original = JSON.stringify(conference);
  const rows = selectStandings(data, 'conferences', 'ap', conference.conference_id).rows;
  assert.deepEqual(rows.map(row => row.team.id), [zulu, beta, charlie, alpha]);
  assert.deepEqual(rows.map(row => row.position), [1, 2, 3, 4]);
  assert.ok(rows.every(row => row.group === undefined));
  assert.equal(JSON.stringify(conference), original);
});
test('background refresh and failures retain records, ranks, and schedules from one cached snapshot', () => {
  const { acceptCompetitionSnapshot } = load('lib/competition-data.ts');
  const snapshot = createStandingsDemo();
  const current = acceptCompetitionSnapshot(undefined, snapshot);
  const expected = selectStandings(current.snapshot, 'top25', 'ap', '8');
  for (const error of [null, 'Offline']) {
    const refreshing = { ...current, isCurrent: false, error };
    assert.deepEqual(selectStandings(refreshing.snapshot, 'top25', 'ap', '8'), expected);
  }
});
test('fixture records match completed schedules and CFP remains honestly unavailable', () => {
  const data = createStandingsDemo();
  for (const [id, record] of Object.entries(data.records)) {
    const schedule = teamSchedule(data.games, id, false);
    assert.equal(schedule.length, 12);
    assert.equal(record.wins, schedule.filter(game => gameResult(game, id) === 'W').length);
    assert.equal(record.losses, schedule.filter(game => gameResult(game, id) === 'L').length);
    assert.ok(schedule.every(game => game.id.startsWith('demo:')));
  }
  assert.equal(selectStandings(data, 'top25', 'cfp', '8').rows.length, 0);
});
test('unverified conference records sort after verified zero-win teams', () => {
  const data = createStandingsDemo(); const conference = data.standings[0];
  conference.entries = conference.entries.slice(0, 3);
  const [unknown, zero, unverified] = conference.entries.map(entry => entry.team_id);
  for (const [id, name] of [[unknown, 'Alpha'], [zero, 'Zulu'], [unverified, 'Beta']]) {
    data.teams[id] = { ...data.teams[id], name };
    data.records[id] = { ...data.records[id], conference_wins: 0, conference_losses: 0, overall_ready: true, conference_ready: true };
  }
  data.records[unknown].conference_ready = false;
  data.records[unverified].overall_ready = false;
  conference.records_match = false;
  const rows = selectStandings(data, 'conferences', 'ap', conference.conference_id).rows;
  assert.deepEqual(rows.map(row => row.team.id), [zero, unknown, unverified]);
  assert.deepEqual(rows.map(row => recordLabel(row.record, true)), ['0–0', '—', '—']);
});

test('production display-time strings cannot reorder the schedule instead of UTC game_date', () => {
  const game = createStandingsDemo().games[0];
  const scheduled = [
    { ...game, id: 'a-later', start_time: '12:00 PM', game_date: '2026-10-03T16:00:00' },
    { ...game, id: 'z-earlier', start_time: '7:00 PM', game_date: '2026-09-26T23:00:00' },
    { ...game, id: 'unknown', start_time: 'TBD', game_date: 'invalid' },
  ];
  assert.deepEqual(teamSchedule(scheduled, game.home_team_id, false).map(game => game.id), ['z-earlier', 'a-later', 'unknown']);
});
test('conference choices reuse the Games labels, grouping, and ordering', () => {
  const { getStandingsConferences } = load('lib/standings-data.ts');
  const { makeTeamCatalog, getFilterOptions } = load('lib/game-filters.ts');
  const catalog = makeTeamCatalog(require('./team-metadata-2026.json'), 2026);
  const options = getFilterOptions(catalog).filter(option => option.value.startsWith('conference:'));
  const data = createStandingsDemo();
  data.standings = options.map(option => ({ conference_id: option.value.slice(11), conference_name: 'Long provider name', entries: [] })).reverse();
  assert.deepEqual(getStandingsConferences(data, catalog), options.map(option => ({ id: option.value.slice(11), name: option.label, group: option.group })));
  assert.deepEqual(getStandingsConferences(data, { ...catalog, season: 2025 }), []);
});
test('CFP is absent before publication, becomes the default on release, and respects later choices', () => {
  const { availablePolls, resolvePollSelection } = load('lib/standings-data.ts');
  const data = createStandingsDemo();
  assert.deepEqual(availablePolls(data), ['ap', 'usa']);
  assert.equal(resolvePollSelection(data, null), 'ap');
  const coachesBeforeCfp = { season: 2026, cfpAvailable: false, poll: 'usa' };
  assert.equal(resolvePollSelection(data, coachesBeforeCfp), 'usa');
  data.rankings.cfp = { ...data.rankings.ap, poll: 'cfp', entries: [] };
  assert.deepEqual(availablePolls(data), ['ap', 'usa']);
  data.rankings.cfp.entries = data.rankings.ap.entries;
  assert.deepEqual(availablePolls(data), ['cfp', 'ap', 'usa']);
  assert.equal(resolvePollSelection(data, coachesBeforeCfp), 'cfp');
  assert.equal(resolvePollSelection(data, { season: 2026, cfpAvailable: true, poll: 'ap' }), 'ap');
  assert.equal(resolvePollSelection(data, { season: 2025, cfpAvailable: true, poll: 'ap' }), 'cfp');
});
test('ranked teams use the current season conference abbreviation, with snapshot membership as fallback', () => {
  const { makeTeamCatalog } = load('lib/game-filters.ts');
  const catalog = makeTeamCatalog(require('./team-metadata-2026.json'), 2026);
  const team = catalog.rows.find(team => team.conference_name === 'Conference USA');
  const data = createStandingsDemo();
  data.rankings.ap.entries = [{ ...data.rankings.ap.entries[0], team_id: team.team_id }];
  data.standings = [];
  const select = metadata => selectStandings(data, 'top25', 'ap', '8', metadata).rows[0];
  assert.equal(select(catalog).conferenceAbbreviation, 'CUSA');
  assert.equal(select({ ...catalog, season: 2025 }).conferenceAbbreviation, undefined);
  data.standings = [{ conference_id: team.conference_id, conference_name: 'Conference USA', entries: [{ team_id: team.team_id }] }];
  assert.equal(select(undefined).conferenceAbbreviation, 'CUSA');
});

test('others receiving votes follow the selected poll and never receive rank badges', () => {
  const data = createStandingsDemo();
  for (const poll of ['ap', 'usa']) {
    data.rankings[poll].others_receiving_votes.reverse();
    const selected = selectStandings(data, 'top25', poll, '8');
    assert.equal(selected.rows.length, 25);
    assert.deepEqual(selected.othersReceivingVotes.map(row => row.points), [42, 36, 30, 24, 18, 12, 6]);
    for (const row of selected.othersReceivingVotes) {
      assert.equal(selected.ranks.has(row.team.id), false);
      assert.equal(row.team.name, data.teams[row.team.id].name);
    }
  }
  assert.deepEqual(selectStandings(data, 'conferences', 'ap', '8').othersReceivingVotes, []);
  assert.deepEqual(selectStandings(data, 'top25', 'cfp', '8').othersReceivingVotes, []);
  for (const others of [undefined, null, []]) {
    data.rankings.ap.others_receiving_votes = others;
    assert.deepEqual(selectStandings(data, 'top25', 'ap', '8').othersReceivingVotes, []);
  }
});
