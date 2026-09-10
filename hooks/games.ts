import { useGameInterruptions } from '@/hooks/game-interruptions';
import { compareGames } from '@/lib/game-sort';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { fetch } from 'expo/fetch';
import { matchesSelectedWeek, openingWeekStart, resolveCfbWeek, type CfbCalendar, type CfbWeek } from '@/lib/cfb-week';
import { supabase } from '../lib/supabase';
import { dummyGames } from './dummy-games';

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
  completed_at?: string | null;
  interruption?: string;
}

// Complete game object with team data (what we use in the UI)
export interface Game extends GameRow {
  home_team: Team;
  away_team: Team;
}

// Use Supabase's built-in payload type
export type GameRealtimePayload = RealtimePostgresChangesPayload<GameRow>;

interface GamesResult {
  week: CfbWeek | null;
  games: Game[];
}

let lastCalendar: CfbCalendar | undefined;

async function fetchCurrentCfbWeek(): Promise<CfbWeek | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80',
      { signal: controller.signal },
    );
    if (!response.ok) throw new Error(`ESPN calendar unavailable (${response.status})`);
    const calendar: CfbCalendar = await response.json();
    const week = resolveCfbWeek(calendar);
    if (!week) throw new Error('ESPN calendar is missing season/week metadata');
    lastCalendar = calendar;
    return week;
  } catch (error) {
    console.warn('Using cached calendar or latest ingested CFB week:', error);
    if (lastCalendar) return resolveCfbWeek(lastCalendar);
  } finally {
    clearTimeout(timeout);
  }

  // Keep the app usable if ESPN is unavailable on a cold start. Ingestion
  // assigns the same ESPN season/week identifiers to every game in its poll.
  const { data, error } = await supabase.from('games')
    .select('season_year, week_number')
    .order('season_year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchGames(week: CfbWeek | null, splitWeekZero: boolean): Promise<GamesResult> {
  const USE_DUMMY_DATA = false;
  if (USE_DUMMY_DATA) {
    return { week: dummyGames[0] ?? null, games: [...dummyGames].sort(compareGames) };
  }

  if (!week) return { week: null, games: [] };
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!home_team_id(id, name, abbreviation, logo),
      away_team:teams!away_team_id(id, name, abbreviation, logo)
    `)
    .eq('season_year', week.season_year)
    .eq('week_number', splitWeekZero && week.week_number === 0 ? 1 : week.week_number)
    .order('game_date', { ascending: true });
  if (error) throw error;
  return { week, games: (data || []).filter(game => matchesSelectedWeek(game, week, splitWeekZero))
    .map(game => ({ ...game, week_number: week.week_number })).sort(compareGames) };
}

function createGamesSubscription(queryClient: QueryClient, queryKey: readonly (string | number | null)[], splitWeekZero: boolean) {
  let disposed = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retries = 0;
  let channel: ReturnType<typeof supabase.channel> | undefined;

  const connect = () => {
    if (disposed) return;
    const connectedChannel = supabase.channel('games-changes');
    channel = connectedChannel;
    connectedChannel.on('postgres_changes', {
        event: '*', schema: 'public', table: 'games',
      }, (payload: GameRealtimePayload) => {
        const current = queryClient.getQueryData<GamesResult>(queryKey);
        if (!current?.week) {
          void queryClient.invalidateQueries({ queryKey: queryKey });
          return;
        }
        const row = payload.new as GameRow;
        const id = payload.eventType === 'DELETE' ? payload.old.id : row.id;
        const existing = current.games.find(game => game.id === id);
        const belongs = payload.eventType !== 'DELETE' && matchesSelectedWeek(row, current.week, splitWeekZero);

        if (payload.eventType !== 'DELETE' && !existing && belongs) {
          // New games need joined team data from the normal query.
          void queryClient.invalidateQueries({ queryKey: queryKey });
          return;
        }
        if (!existing) return;
        queryClient.setQueryData<GamesResult>(queryKey, cached => {
          if (!cached?.week) return cached;
          const inWeek = payload.eventType !== 'DELETE' && matchesSelectedWeek(row, cached.week, splitWeekZero);
          return {
            ...cached,
            games: (inWeek
              ? cached.games.map(game => game.id === id
                ? { ...game, ...row, week_number: cached.week!.week_number, home_team: game.home_team, away_team: game.away_team }
                : game)
              : cached.games.filter(game => game.id !== id)
            ).sort(compareGames),
          };
        });
      })
      .subscribe(status => {
        if (disposed || channel !== connectedChannel) return;
        if (status === 'SUBSCRIBED') {
          retries = 0;
        } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status) && !retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = undefined;
            const previous = channel;
            channel = undefined;
            if (previous) void supabase.removeChannel(previous);
            connect();
          }, Math.min(1000 * 2 ** retries++, 30000));
        }
      });
  };
  connect();
  return () => {
    disposed = true;
    clearTimeout(retryTimer);
    if (channel) void supabase.removeChannel(channel);
  };
}

export function useGames() {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<CfbWeek | null>(null);
  const calendar = useQuery({
    queryKey: ['cfb-calendar', 'week-selector'],
    queryFn: async () => {
      let current = await fetchCurrentCfbWeek();
      const entries = lastCalendar?.leagues?.[0]?.calendar?.find(
        season => Number(season.value) === lastCalendar?.season?.type,
      )?.entries ?? [];
      const weeks = [...new Set(entries.map(entry => Number(entry.value))
        .filter(week => Number.isInteger(week) && week >= 0))];
      if (current && !weeks.includes(current.week_number)) weeks.push(current.week_number);
      const splitWeekZero = !weeks.includes(0);
      if (splitWeekZero) {
        weeks.push(0);
        if (current?.week_number === 1 && Date.now() < openingWeekStart(current.season_year)) {
          current = { ...current, week_number: 0 };
        }
      }
      return { current, weeks: weeks.sort((a, b) => a - b), splitWeekZero };
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
  const splitWeekZero = calendar.data?.splitWeekZero ?? false;
  const week = selection ?? calendar.data?.current ?? null;
  const seasonYear = week?.season_year ?? null;
  const weekNumber = week?.week_number ?? null;
  const interruptions = useGameInterruptions(seasonYear, splitWeekZero && weekNumber === 0 ? 1 : weekNumber);
  const queryKey = useMemo(() => ['games', 'cfb-week', seasonYear, weekNumber, splitWeekZero ? 'split-zero' : 'native-zero'], [seasonYear, weekNumber, splitWeekZero]);
  const query = useQuery({
    queryKey,
    queryFn: () => fetchGames(week, splitWeekZero),
    enabled: week !== null,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (weekNumber === null) return;
    return createGamesSubscription(queryClient, queryKey, splitWeekZero);
  }, [queryClient, queryKey, weekNumber, splitWeekZero]);

  const games = useMemo(() => (query.data?.games || []).map(game => {
      const interruption = game.status !== 'final' ? interruptions.data?.[game.id] : null;
      return interruption ? {
        ...game,
        interruption: interruption.label,
        status: interruption.beforeKickoff ? 'scheduled' as const : game.status,
      } : game;
    }), [query.data?.games, interruptions.data]);

  return {
    games,
    loading: calendar.isLoading || (week !== null && query.isLoading),
    error: calendar.error?.message || query.error?.message || null,
    refetch: () => Promise.all([calendar.refetch(), interruptions.refetch(), ...(week ? [query.refetch()] : [])]),
    week,
    weeks: calendar.data?.weeks ?? [],
    selectWeek: (weekNumber: number) => {
      if (!calendar.data?.current || !calendar.data.weeks.includes(weekNumber)) return;
      setSelection({ season_year: calendar.data.current.season_year, week_number: weekNumber });
    },
  };
}
