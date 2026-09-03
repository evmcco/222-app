import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Game } from '@/hooks/games';

/**
 * Season-wide game data for the week navigator. The frozen `useGames` hook
 * only covers the current calendar week, so browsing past weeks needs its
 * own query — same select shape, separate cache key so the realtime
 * subscription on ['games'] stays authoritative for live scores.
 */

/** One selectable week of the season, with the real date span of its games. */
export interface WeekInfo {
  weekNumber: number;
  seasonYear: number;
  firstGameDate: string;
  lastGameDate: string;
  gameCount: number;
}

/** One calendar-day group of games, rendered as a date divider section. */
export interface DateSection {
  key: string;
  title: string;
  isToday: boolean;
  data: Game[];
}

/** The most recent season that has games stored. */
export function latestSeason(games: Game[]): number | null {
  let latest: number | null = null;
  for (const g of games) {
    if (latest === null || g.season_year > latest) latest = g.season_year;
  }
  return latest;
}

/** Distinct weeks of one season, sorted ascending, with real date spans. */
export function buildWeekIndex(games: Game[], seasonYear: number): WeekInfo[] {
  const byWeek = new Map<number, WeekInfo>();
  for (const g of games) {
    if (g.season_year !== seasonYear) continue;
    const existing = byWeek.get(g.week_number);
    if (!existing) {
      byWeek.set(g.week_number, {
        weekNumber: g.week_number,
        seasonYear,
        firstGameDate: g.game_date,
        lastGameDate: g.game_date,
        gameCount: 1,
      });
    } else {
      existing.gameCount += 1;
      if (g.game_date < existing.firstGameDate) existing.firstGameDate = g.game_date;
      if (g.game_date > existing.lastGameDate) existing.lastGameDate = g.game_date;
    }
  }
  return [...byWeek.values()].sort((a, b) => a.weekNumber - b.weekNumber);
}

/**
 * The week to pre-select: the one whose slate contains today, else the next
 * week ahead, else the most recent one played.
 */
export function selectCurrentWeek(weeks: WeekInfo[], now: Date): number | null {
  if (weeks.length === 0) return null;

  const endOfDayOf = (iso: string) => {
    const end = new Date(iso);
    end.setHours(23, 59, 59, 999);
    return end.getTime();
  };
  const nowMs = now.getTime();

  for (const week of weeks) {
    if (
      new Date(week.firstGameDate).getTime() <= nowMs &&
      nowMs <= endOfDayOf(week.lastGameDate)
    ) {
      return week.weekNumber;
    }
  }
  const upcoming = weeks.find((w) => new Date(w.firstGameDate).getTime() >= nowMs);
  return (upcoming ?? weeks[weeks.length - 1]).weekNumber;
}

const dayKeyOf = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const dayLabelOf = (date: Date): string =>
  date
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase();

/** Group games into chronological calendar-day sections with divider labels. */
export function groupGamesByDate(games: Game[], now: Date): DateSection[] {
  const todayKey = dayKeyOf(now);
  const byDay = new Map<string, DateSection>();

  for (const game of games) {
    const at = new Date(game.game_date);
    const key = dayKeyOf(at);
    let section = byDay.get(key);
    if (!section) {
      section = {
        key,
        title: key === todayKey ? `TODAY · ${dayLabelOf(at)}` : dayLabelOf(at),
        isToday: key === todayKey,
        data: [],
      };
      byDay.set(key, section);
    }
    section.data.push(game);
  }

  for (const section of byDay.values()) {
    section.data.sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );
  }
  return [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key));
}

async function fetchSeasonGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select(
      `*,
      home_team:teams!home_team_id(id, name, abbreviation, logo),
      away_team:teams!away_team_id(id, name, abbreviation, logo)`,
    )
    .order('game_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export function useSeasonGames() {
  const query = useQuery({
    queryKey: ['season-games'],
    queryFn: fetchSeasonGames,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const allGames = query.data || [];
  const season = useMemo(() => latestSeason(allGames), [allGames]);
  const games = useMemo(
    () => (season === null ? [] : allGames.filter((g) => g.season_year === season)),
    [allGames, season],
  );
  const weeks = useMemo(
    () => (season === null ? [] : buildWeekIndex(games, season)),
    [games, season],
  );

  return {
    games,
    weeks,
    seasonYear: season,
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}
