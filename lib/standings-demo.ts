import { demoCatalog, demoGames } from '@/lib/demo-games';
import type { CompetitionSnapshot, Poll, TeamSeasonRecord } from '@/lib/competition-data';
import type { ScheduleGame } from '@/lib/standings';

// Explicitly fictional and used only by the development demo controller.
export function createStandingsDemo(): CompetitionSnapshot {
  const teams = demoGames.flatMap(game => [game.home_team, game.away_team]);
  const games: ScheduleGame[] = [];
  const records: Record<string, TeamSeasonRecord> = Object.fromEntries(teams.map(team => [team.id, {
    team_id: team.id, season_year: 2026, wins: 0, losses: 0, ties: 0,
    conference_wins: 0, conference_losses: 0, conference_ties: 0,
    overall_ready: true, conference_ready: true, updated_at: '2026-09-20T12:00:00Z',
  }]));
  // A round-robin rotation gives each team one game per week, with consistent outcomes.
  const rotation = [...teams];
  for (let week = 1; week <= 12; week++) {
    for (let i = 0; i < teams.length / 2; i++) {
      const home = rotation[i], away = rotation[teams.length - 1 - i];
      const conference = demoCatalog.teams[home.id].conference_id === demoCatalog.teams[away.id].conference_id;
      const date = new Date(Date.UTC(2026, 8, 5 + (week - 1) * 7, 19)).toISOString();
      const homeScore = (i + week) % 3 ? 28 : 17;
      const awayScore = 21;
      const game: ScheduleGame = { ...demoGames[0], id: `demo:standings:${week}:${i}`, home_team: home, away_team: away,
        home_team_id: home.id, away_team_id: away.id, conference_competition: conference,
        home_team_score: week <= 3 ? homeScore : 0, away_team_score: week <= 3 ? awayScore : 0,
        home_team_period_scores: null, away_team_period_scores: null, home_team_ranking: null, away_team_ranking: null,
        status: week <= 3 ? 'final' : 'scheduled', interruption: undefined, quarter: week <= 3 ? '4th' : null, current_game_time: null,
        start_time: date, game_date: date, week_number: week, date_display: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      };
      games.push(game);
      if (week <= 3) {
        const winner = homeScore > awayScore ? home.id : away.id;
        const loser = homeScore > awayScore ? away.id : home.id;
        records[winner].wins++; records[loser].losses++;
        if (conference) { records[winner].conference_wins++; records[loser].conference_losses++; }
      }
    }
    rotation.splice(1, 0, rotation.pop()!);
  }
  const rankingTeams = [...teams].sort((a, b) => records[b.id].wins - records[a.id].wins || a.name.localeCompare(b.name));
  const release = (poll: Poll) => ({ id: `demo:${poll}`, season_year: 2026, poll, season_type: 2, week_number: 3,
    published_at: '2026-09-20T16:00:00Z', fetched_at: '2026-09-20T16:00:00Z',
    others_receiving_votes: (poll === 'ap' ? rankingTeams : [...rankingTeams.slice(2), ...rankingTeams.slice(0, 2)]).slice(25).map((team, i) => ({ team_id: team.id, points: 42 - i * 6 })),
    entries: (poll === 'ap' ? rankingTeams : [...rankingTeams.slice(2), ...rankingTeams.slice(0, 2)]).slice(0, 25).map((team, i) => ({ team_id: team.id, rank: i + 1, previous_rank: i === 24 ? null : i === 0 ? 2 : i === 1 ? 1 : i + 1, points: null, first_place_votes: null })) });
  const conferences = [...new Map(demoCatalog.rows.filter(row => row.conference_tier !== 'independent').map(row => [row.conference_id, row.conference_name])).entries()];
  return { season_year: 2026, revision: 1, fetched_at: '2026-09-20T16:00:00Z', games, records, teams: Object.fromEntries(teams.map(team => [team.id, team])),
    rankings: { ap: release('ap'), usa: release('usa') },
    standings: conferences.map(([id, name]) => ({ season_year: 2026, conference_id: id!, conference_name: name!, fetched_at: '2026-09-20T16:00:00Z',
      entries: teams.filter(team => demoCatalog.teams[team.id].conference_id === id).sort((a, b) => records[b.id].conference_wins - records[a.id].conference_wins || records[a.id].conference_losses - records[b.id].conference_losses).map((team, index) => ({
        team_id: team.id, group_id: id!, group_name: name!, position: index + 1, source_order: index,
        overall_wins: records[team.id].wins, overall_losses: records[team.id].losses, overall_ties: 0,
        conference_wins: records[team.id].conference_wins, conference_losses: records[team.id].conference_losses, conference_ties: 0,
      })),
    })),
  };
}
