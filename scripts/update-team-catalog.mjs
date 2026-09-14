// Refresh before each season: node scripts/update-team-catalog.mjs 2026
// ESPN season-specific FBS memberships and home-campus states, keyed by ESPN team ID.
import { writeFile } from 'node:fs/promises';
const season = Number(process.argv[2]);
if (!Number.isInteger(season) || season < 2020) throw new Error('Pass a season year');
const base = `https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/${season}`;
async function read(url) {
  const response = await fetch(url.replace(/^http:/, 'https:'), { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response.json();
}
const groups = await read(`${base}/types/2/groups/80/children?limit=100`);
const teams = {};
const fbsStates = new Set();
const conferences = [];
for (const ref of groups.items) {
  const group = await read(ref.$ref);
  const members = await read(`${base}/types/2/groups/${group.id}/teams?limit=200`);
  conferences.push({ id: group.id, name: group.name, abbreviation: group.abbreviation });
  // Small batches to respect the source API.
  for (let i = 0; i < members.items.length; i += 8) {
    const batch = await Promise.all(members.items.slice(i, i + 8).map(t => read(t.$ref)));
    for (const team of batch) {
      const state = team.venue?.address?.state;
      if (!state) throw new Error(`Missing home state: ${team.displayName}`);
      if (teams[team.id]) throw new Error(`Duplicate membership: ${team.id}`);
      teams[team.id] = { name: team.displayName, conference: group.id, state };
      fbsStates.add(state);
    }
  }
}
if (Object.keys(teams).length < 130 || conferences.length !== 11) throw new Error('Incomplete FBS catalog');
// Include FCS opponents for state matching; dropdown states still come only from FBS schools.
const fcs = await read(`${base}/types/2/groups/81/teams?limit=200`);
for (let i = 0; i < fcs.items.length; i += 8) {
  const batch = await Promise.all(fcs.items.slice(i, i + 8).map(t => read(t.$ref)));
  for (const team of batch) {
    if (teams[team.id] || team.displayName === 'TBA') continue;
    const state = team.venue?.address?.state;
    if (!state) throw new Error(`Missing home state: ${team.displayName}`);
    teams[team.id] = { name: team.displayName, conference: 'fcs', state };
  }
}
await writeFile(new URL(`../constants/fbs-teams-${season}.json`, import.meta.url), JSON.stringify({ season, source: base, conferences, fbsStates: [...fbsStates].sort(), teams }, null, 2) + '\n');
console.log(`${season}: ${Object.keys(teams).length} teams across ${conferences.length} groups`);
