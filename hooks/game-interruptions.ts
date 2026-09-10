import { useQuery } from '@tanstack/react-query';
import { fetch } from 'expo/fetch';
import { getGameInterruption, type FeedGameStatus } from '@/lib/game-interruption';

export function useGameInterruptions(season: number | null, week: number | null) {
  return useQuery({
    queryKey: ['game-interruptions', season, week],
    enabled: season !== null && week !== null,
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=1000&year=${season}&week=${week}&seasontype=2`,
        { signal },
      );
      if (!response.ok) throw new Error(`Game status unavailable (${response.status})`);
      const data: { events?: { id: string; status?: FeedGameStatus }[] } = await response.json();
      if (!Array.isArray(data?.events)) throw new Error('Game status feed is missing events');
      return Object.fromEntries(data.events.map(event => [event.id, getGameInterruption(event.status)]));
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
  });
}
