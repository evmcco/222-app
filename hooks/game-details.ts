import { useQuery } from '@tanstack/react-query';
import { fetch } from 'expo/fetch';

export interface GameDetails {
  location: string | null;
  channels: string[];
}

interface ESPNSummary {
  gameInfo?: {
    venue?: {
      fullName?: string;
      address?: { city?: string; state?: string; country?: string };
    };
  };
  header?: {
    competitions?: {
      broadcasts?: {
        type?: { shortName?: string };
        media?: { shortName?: string };
      }[];
    }[];
  };
}

export function parseGameDetails(summary: ESPNSummary): GameDetails {
  const venue = summary.gameInfo?.venue;
  const address = venue?.address;
  const city = [address?.city, address?.state, address?.country !== 'USA' ? address?.country : null]
    .filter(Boolean).join(', ');
  const location = [venue?.fullName, city].filter(Boolean).join(' · ') || null;
  const channels = [...new Set(
    (summary.header?.competitions?.[0]?.broadcasts ?? [])
      .filter(broadcast => broadcast.type?.shortName !== 'Radio')
      .map(broadcast => broadcast.media?.shortName?.trim())
      .filter((name): name is string => Boolean(name)),
  )];
  return { location, channels };
}

export function useGameDetails(gameId: string) {
  return useQuery({
    queryKey: ['game-details', gameId],
    queryFn: async ({ signal }): Promise<GameDetails> => {
      const response = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=${encodeURIComponent(gameId)}`,
        { signal },
      );
      if (!response.ok) throw new Error(`Game details unavailable (${response.status})`);
      return parseGameDetails(await response.json());
    },
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
}
