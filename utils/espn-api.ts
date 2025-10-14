import { GameData } from '@/components/game-card';

interface ESPNGame {
  id: string;
  date: string;
  status: {
    clock: number;
    displayClock: string;
    period: number;
    type: {
      id: string;
      name: string;
      state: string;
      completed: boolean;
      description: string;
      detail: string;
      shortDetail: string;
    };
  };
  competitors: Array<{
    id: string;
    homeAway: 'home' | 'away';
    team: {
      id: string;
      abbreviation: string;
      displayName: string;
      shortDisplayName: string;
      logo: string;
    };
    score: string;
  }>;
  odds?: Array<{
    provider: {
      id: string;
      name: string;
    };
    details: string;
    overUnder: number;
    spread: number;
    homeTeamOdds: {
      moneyLine: number;
    };
    awayTeamOdds: {
      moneyLine: number;
    };
  }>;
}

interface ESPNResponse {
  events: ESPNGame[];
}

export async function fetchESPNGames(): Promise<GameData[]> {
  try {
    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80');
    const data: ESPNResponse = await response.json();
    
    return data.events.map(transformESPNGame);
  } catch (error) {
    console.error('Failed to fetch ESPN games:', error);
    return [];
  }
}

function transformESPNGame(espnGame: ESPNGame): GameData {
  // Find home and away teams
  const homeTeam = espnGame.competitors.find(c => c.homeAway === 'home');
  const awayTeam = espnGame.competitors.find(c => c.homeAway === 'away');
  
  if (!homeTeam || !awayTeam) {
    throw new Error('Missing home or away team data');
  }

  // Determine game status
  let status: 'scheduled' | 'live' | 'final';
  if (espnGame.status.type.completed) {
    status = 'final';
  } else if (espnGame.status.type.state === 'in') {
    status = 'live';
  } else {
    status = 'scheduled';
  }

  // Format start time
  const startTime = new Date(espnGame.date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  });

  // Get betting odds (use first provider if available)
  const odds = espnGame.odds?.[0];
  
  // Format current game time for live games
  let currentGameTime: string | undefined;
  let quarter: string | undefined;
  
  if (status === 'live') {
    currentGameTime = espnGame.status.displayClock;
    quarter = `${getOrdinal(espnGame.status.period)}`;
  }

  return {
    id: espnGame.id,
    homeTeam: {
      name: homeTeam.team.displayName,
      abbreviation: homeTeam.team.abbreviation,
      score: parseInt(homeTeam.score) || 0,
      logo: homeTeam.team.logo,
    },
    awayTeam: {
      name: awayTeam.team.displayName,
      abbreviation: awayTeam.team.abbreviation,
      score: parseInt(awayTeam.score) || 0,
      logo: awayTeam.team.logo,
    },
    status,
    startTime,
    currentGameTime,
    quarter,
    spread: odds?.spread,
    moneyLineHome: odds?.homeTeamOdds?.moneyLine,
    moneyLineAway: odds?.awayTeamOdds?.moneyLine,
    totalPoints: odds?.overUnder,
  };
}

function getOrdinal(period: number): string {
  if (period === 1) return '1st';
  if (period === 2) return '2nd';
  if (period === 3) return '3rd';
  if (period === 4) return '4th';
  if (period > 4) return `${period - 4}OT`;
  return `${period}`;
}

// Sample transformation for testing
export function createSampleESPNGame(): GameData {
  return {
    id: 'sample-1',
    homeTeam: {
      name: 'Georgia Bulldogs',
      abbreviation: 'UGA',
      score: 28,
      logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/61.png',
    },
    awayTeam: {
      name: 'Alabama Crimson Tide',
      abbreviation: 'ALA',
      score: 24,
      logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/333.png',
    },
    status: 'final',
    startTime: '3:30 PM',
    spread: -3.5,
    moneyLineHome: -150,
    moneyLineAway: +130,
    totalPoints: 52.5,
  };
}