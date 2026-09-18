import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { supabase } from '@/lib/supabase';

export interface GameNarrative {
  id: string;
  game_id: string;
  headline: string;
  // Older key-play records have no detail; never substitute a quarter recap.
  detail: string | null;
  period: number;
  is_final: boolean;
  event_order: number;
  home_score: number;
  away_score: number;
  updated_at: string;
}

export function useNarratives(gameIds: string[]) {
  const queryClient = useQueryClient();
  const gameIdsKey = gameIds.join(',');

  const query = useQuery({
    queryKey: ['key-play-narratives', gameIds],
    queryFn: async (): Promise<GameNarrative[]> => {
      const { data, error } = await supabase.from('latest_game_headlines')
        .select('id,game_id,headline,detail,period,is_final,event_order,home_score,away_score,updated_at').in('game_id', gameIds);
      if (error) throw error;
      return (data ?? []).filter(row => typeof row.headline === 'string' && row.headline.trim());
    },
    enabled: gameIds.length > 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 2,
  });

  useEffect(() => {
    if (!gameIdsKey) return undefined;

    const currentGameIds = new Set(gameIdsKey.split(','));
    const channel = supabase
      .channel('key-play-narratives-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_headlines' }, payload => {
        const changed = { ...payload.old, ...payload.new } as Partial<GameNarrative>;
        if (!changed.game_id || currentGameIds.has(changed.game_id)) {
          void queryClient.invalidateQueries({ queryKey: ['key-play-narratives'] });
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameIdsKey, queryClient]);

  const narrativesByGameId = useMemo(
    () => new Map((query.data ?? []).map(narrative => [narrative.game_id, narrative])),
    [query.data],
  );

  return { narrativesByGameId, refetch: query.refetch };
}
