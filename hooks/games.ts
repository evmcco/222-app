import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

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

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGames();
  }, []);

  async function fetchGames() {
    try {
      setLoading(true);
      setError(null);
      console.log("fetching games")
      const { data, error: fetchError } = await supabase
        .from('games')
        .select(`
          *,
          home_team:teams!home_team_id(id, name, abbreviation, logo),
          away_team:teams!away_team_id(id, name, abbreviation, logo)
        `)
        .order('game_date', { ascending: true });

      if (fetchError) throw fetchError;

      setGames(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch games');
      console.error('Error fetching games:', err);
    } finally {
      setLoading(false);
    }
  }

  return { games, loading, error, refetch: fetchGames };
}