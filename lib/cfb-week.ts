export interface CfbWeek {
  season_year: number;
  week_number: number;
}

export interface CfbCalendar {
  season?: { year?: number; type?: number };
  week?: { number?: number };
  leagues?: {
    calendar?: {
      value?: string;
      entries?: { value?: string; startDate?: string; endDate?: string }[];
    }[];
  }[];
}

/** ESPN's season calendar includes extended opening weeks and holiday Mondays. */
export function resolveCfbWeek(calendar: CfbCalendar, now = new Date()): CfbWeek | null {
  const year = calendar.season?.year;
  if (!Number.isInteger(year) || !year || year < 2000) return null;
  const season = calendar.leagues?.[0]?.calendar?.find(
    season => Number(season.value) === calendar.season?.type,
  );
  const entry = season?.entries?.find(entry => {
    const start = Date.parse(entry.startDate ?? '');
    // ESPN end dates include the entire final minute (e.g. 06:59Z).
    const end = Date.parse(entry.endDate ?? '') + 60_000;
    return now.getTime() >= start && now.getTime() < end;
  });
  const week = entry ? Number(entry.value) : calendar.week?.number;
  if (!Number.isInteger(week) || week == null || week < 0) return null;
  return { season_year: year, week_number: week };
}

export function isInCfbWeek(game: CfbWeek, week: CfbWeek): boolean {
  return game.season_year === week.season_year && game.week_number === week.week_number;
}

/** Week 1 starts the Monday before Labor Day; the earlier kickoff slate is Week 0. */
export function openingWeekStart(seasonYear: number): number {
  const september = new Date(Date.UTC(seasonYear, 8, 1));
  const laborDay = 1 + (8 - september.getUTCDay()) % 7;
  // Midnight Eastern; this August/September boundary is always in daylight time.
  return Date.UTC(seasonYear, 8, laborDay - 7, 4);
}

export function matchesSelectedWeek(
  game: CfbWeek & { game_date: string }, week: CfbWeek, splitWeekZero: boolean,
): boolean {
  if (game.season_year !== week.season_year) return false;
  if (splitWeekZero && game.week_number === 1 && week.week_number <= 1) {
    const date = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(game.game_date) ? game.game_date : `${game.game_date}Z`;
    const isWeekZero = Date.parse(date) < openingWeekStart(week.season_year);
    return week.week_number === (isWeekZero ? 0 : 1);
  }
  return isInCfbWeek(game, week);
}
