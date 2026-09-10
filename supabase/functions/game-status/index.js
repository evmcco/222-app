/* global Deno */
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    const { season, week } = await req.json();
    if (!Number.isInteger(season) || season < 2000 || season > 2100 || !Number.isInteger(week) || week < 0 || week > 30) {
      return new Response(JSON.stringify({ error: 'Invalid season or week' }), { status: 400, headers });
    }
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=1000&year=${season}&week=${week}&seasontype=2`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Scoreboard unavailable');
    const data = await response.json();
    if (!Array.isArray(data.events)) throw new Error('Missing scoreboard events');
    const events = data.events.map(event => ({ id: event.id, status: event.status }));
    return new Response(JSON.stringify({ events }), { headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Game status temporarily unavailable' }), { status: 502, headers });
  }
});
