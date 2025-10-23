import { createClient, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
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

// Raw database row structure (what comes from real-time updates)
export interface GameRow {
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
  season_year: number;
  game_date: string;
  created_at: string;
  updated_at: string;
}

// Complete game object with team data (what we use in the UI)
export interface Game extends GameRow {
  home_team: Team;
  away_team: Team;
}

// Use Supabase's built-in payload type
export type GameRealtimePayload = RealtimePostgresChangesPayload<GameRow>;

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

const createGamesSubscription = (queryClient: any, retryCount = 0) => {
  const { start, end } = getCurrentWeekRange();

  const subscription = supabase
    .channel('games-changes')
    .on(
      'postgres_changes' as 'postgres_changes',
      {
        event: '*' as const, // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'games',
        filter: 'status=eq.live' // Only listen to live/ongoing games
        // filter: 'id=eq.401761634' // For debugging
      },
      (payload: GameRealtimePayload) => {
        console.log('Real-time update received:', payload.commit_timestamp);
        
        // Check if this change affects current week's games
        const gameDate = (payload.new as GameRow)?.game_date
        
        if (gameDate) {
          const gameDateTime = new Date(gameDate);
          const isInCurrentWeek = gameDateTime >= start && gameDateTime <= end;
          
          if (!isInCurrentWeek) {
            console.log('Ignoring update - game not in current week');
            return;
          }
        }
        
        // Update the cache directly with the real-time changes
        queryClient.setQueryData(['games'], (oldGames: Game[] | undefined) => {
          if (!oldGames) return oldGames;
          
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          switch (eventType) {
            case 'INSERT':
              // For INSERT, we need complete game data with teams, so just refetch
              // Real-time INSERT won't have the joined team data
              console.log('INSERT EVENT');
              queryClient.invalidateQueries({ queryKey: ['games'] });
              return oldGames;
              
            case 'UPDATE':
              console.log("UPDATE EVENT")
              // Log the specific changes between old and new records
              if (newRecord && oldGames) {
                const oldRecord = oldGames.find(g => g.id === newRecord.id)
                const changes: Record<string, { old: any; new: any }> = {};
                
                // Check each field in newRecord for changes
                Object.keys(newRecord).forEach(key => {
                  const oldValue = (oldRecord as any)[key];
                  const newValue = (newRecord as any)[key];
                  
                  if (oldValue !== newValue) {
                    changes[key] = { old: oldValue, new: newValue };
                  }
                });
                
                console.log('Changes:', {
                  gameId: newRecord.id,
                  homeTeam: oldRecord?.home_team.abbreviation,
                  awayTeam: oldRecord?.away_team.abbreviation,
                  changes
                });
              }
              
              // Update existing game with new data
              if (!newRecord) return undefined;
              
              return oldGames.map(oldGame => 
                oldGame.id === newRecord.id 
                  ? { 
                      ...oldGame, 
                      ...newRecord,
                      // Preserve team data since real-time updates don't include joins
                      home_team: oldGame.home_team,
                      away_team: oldGame.away_team
                    } as Game
                  : oldGame
              ).sort((a, b) => {
                if (a.status === 'final' && b.status !== 'final') return 1;
                if (a.status !== 'final' && b.status === 'final') return -1;
                return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
              });
              
            case 'DELETE':
              console.log("DELETE EVENT")
              // Remove deleted game
              if (!oldRecord?.id) return oldGames;
              return oldGames.filter(game => game.id !== oldRecord.id);
              
            default:
              return oldGames;
          }
        });
      }
    )
    .subscribe((status, err) => {
      console.log('🔄 Subscription status:', status);
      
      if (err) {        
        // Auto-retry with exponential backoff
        if (retryCount < 5) { // Max 5 retries
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30s delay
          console.log(`🔄 Retrying subscription in ${delay}ms (attempt ${retryCount + 1}/5)`);
          
          setTimeout(() => {
            subscription.unsubscribe();
            createGamesSubscription(queryClient, retryCount + 1);
          }, delay);
        } else {
          console.error('❌ Max retries reached, giving up on real-time subscription');
        }
      } else if (status === 'SUBSCRIBED') {
        console.log('✅ Real-time subscription established');
      } else if (status === 'CLOSED') {
        console.log('📡 Subscription closed, attempting to reconnect...');
        
        // Reconnect after a short delay
        setTimeout(() => {
          subscription.unsubscribe();
          createGamesSubscription(queryClient, 0); // Reset retry count
        }, 2000);
      }
    });

  return subscription;
};

export function useGames() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);
  
  const query = useQuery({
    queryKey: ['games'],
    queryFn: fetchGames,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set up real-time subscription with auto-reconnect
  useEffect(() => {
    
    console.log('🚀 Setting up real-time subscription with auto-reconnect');
    subscriptionRef.current = createGamesSubscription(queryClient);

    // Cleanup subscription on unmount
    return () => {
      console.log('🧹 Cleaning up real-time subscription');
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [queryClient]);

  return {
    games: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}