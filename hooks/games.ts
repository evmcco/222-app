import { createClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { dummyGames } from './dummy-games';

const supabaseUrl = 'https://npxtybkyglwntsnjeszq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHR5Ymt5Z2x3bnRzbmplc3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1Mzg5MjcsImV4cCI6MjA3NjExNDkyN30.bjtWnjp3vegGGgbVpfHeQVPpFGCcEo_Pm2ayeY2QE0Q'

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
}

export interface Game {
  id: string;
  home_team_id: string;
  home_team_score: number;
  home_team_ranking: number | null;
  home_moneyline: number | null;
  away_team_id: string;
  away_team_score: number;
  away_team_ranking: number | null;
  away_moneyline: number | null;
  status: 'scheduled' | 'live' | 'final';
  date_display: string;
  start_time: string;
  current_game_time: string | null;
  quarter: string | null;
  spread: number;
  total_points: number;
  week_number: number;
  home_team: Team;
  away_team: Team;
}

function getCurrentWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { start: monday, end: sunday };
}

async function fetchGames(): Promise<Game[]> {
  // TOGGLE: Comment out this line to use production API data
  // const USE_DUMMY_DATA = true;
  const USE_DUMMY_DATA = false;

  if (USE_DUMMY_DATA) {
    console.log("Using dummy data for App Store screenshots");
    return dummyGames;
  }

  const { start, end } = getCurrentWeekRange();
  console.log(`Fetching games from ${start.toISOString()} to ${end.toISOString()}`);
  
  const { data, error: fetchError } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!home_team_id(id, name, abbreviation, logo),
      away_team:teams!away_team_id(id, name, abbreviation, logo)
    `)
    .gte('game_date', start.toISOString())
    .lte('game_date', end.toISOString())
    .order('game_date', { ascending: true });

  if (fetchError) throw fetchError;

  const sortedGames = (data || []).sort((a, b) => {
    if (a.status === 'final' && b.status !== 'final') return 1;
    if (a.status !== 'final' && b.status === 'final') return -1;
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  return sortedGames;
}

export function useGames() {
  const query = useQuery({
    queryKey: ['games'],
    queryFn: fetchGames,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    games: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}