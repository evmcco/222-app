const fs = require('fs');
const path = require('path');

// Read the raw ESPN data
const rawDataPath = path.join(__dirname, '../data/espn-raw.json');
const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));

function getOrdinal(period) {
  if (period === 1) return '1st';
  if (period === 2) return '2nd';
  if (period === 3) return '3rd';
  if (period === 4) return '4th';
  if (period > 4) return `${period - 4}OT`;
  return `${period}`;
}

function transformESPNGame(espnGame) {
  // Find home and away teams
  const homeTeam = espnGame.competitions[0].competitors.find(c => c.homeAway === 'home');
  const awayTeam = espnGame.competitions[0].competitors.find(c => c.homeAway === 'away');
  
  if (!homeTeam || !awayTeam) {
    console.warn('Missing home or away team data for game:', espnGame.id);
    return null;
  }

  // Determine game status
  let status;
  if (espnGame.status.type.completed) {
    status = 'final';
  } else if (espnGame.status.type.state === 'in') {
    status = 'live';
  } else {
    status = 'scheduled';
  }

  // Format date and start time
  const gameDate = new Date(espnGame.date);
  const date = gameDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    timeZone: 'America/New_York'
  });
  const startTime = gameDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  });

  // Get betting odds (use first provider if available)
  const odds = espnGame.competitions[0].odds?.[0];
  
  // Format current game time for live games
  let currentGameTime;
  let quarter;
  
  if (status === 'live') {
    currentGameTime = espnGame.status.displayClock;
    quarter = getOrdinal(espnGame.status.period);
  }

  return {
    id: espnGame.id,
    homeTeam: {
      name: homeTeam.team.displayName,
      abbreviation: homeTeam.team.abbreviation,
      score: parseInt(homeTeam.score) || 0,
      logo: homeTeam.team.logo,
      ranking: homeTeam.curatedRank?.current || null,
    },
    awayTeam: {
      name: awayTeam.team.displayName,
      abbreviation: awayTeam.team.abbreviation,
      score: parseInt(awayTeam.score) || 0,
      logo: awayTeam.team.logo,
      ranking: awayTeam.curatedRank?.current || null,
    },
    status,
    date,
    startTime,
    currentGameTime,
    quarter,
    spread: odds?.spread,
    moneyLineHome: odds?.homeTeamOdds?.moneyLine,
    moneyLineAway: odds?.awayTeamOdds?.moneyLine,
    totalPoints: odds?.overUnder,
  };
}

// Transform the games
const transformedGames = rawData.events
  .map(transformESPNGame)
  .filter(game => game !== null); // Remove any null games

// Save transformed data
const outputPath = path.join(__dirname, '../data/games.json');
fs.writeFileSync(outputPath, JSON.stringify(transformedGames, null, 2));

console.log(`Transformed ${transformedGames.length} games and saved to ${outputPath}`);