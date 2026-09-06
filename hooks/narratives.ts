import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { supabase } from '@/lib/supabase';

export interface GameNarrative {
  id: string;
  game_id: string;
  period: number;
  is_final: boolean;
  headline: string;
  detail: string;
  created_at: string;
  updated_at: string;
}

const NARRATIVE_COLUMNS =
  'id, game_id, period, is_final, headline, detail, created_at, updated_at';

async function fetchNarratives(gameIds: string[]): Promise<GameNarrative[]> {
  if (gameIds.length === 0) return [];

  const { data, error } = await supabase
    .from('narratives')
    .select(NARRATIVE_COLUMNS)
    .in('game_id', gameIds);

  if (error) throw error;

  return (data ?? []).filter(
    (narrative): narrative is GameNarrative =>
      typeof narrative.id === 'string' &&
      typeof narrative.game_id === 'string' &&
      Number.isInteger(narrative.period) &&
      typeof narrative.is_final === 'boolean' &&
      typeof narrative.headline === 'string' &&
      narrative.headline.trim().length > 0 &&
      typeof narrative.detail === 'string' &&
      narrative.detail.trim().length > 0,
  );
}

function isNewerNarrative(candidate: GameNarrative, current: GameNarrative): boolean {
  if (candidate.is_final !== current.is_final) return candidate.is_final;
  if (candidate.period !== current.period) return candidate.period > current.period;
  return Date.parse(candidate.updated_at) > Date.parse(current.updated_at);
}

export function useNarratives(gameIds: string[]) {
  const queryClient = useQueryClient();
  const gameIdsKey = gameIds.join(',');

  const query = useQuery({
    queryKey: ['narratives', gameIds],
    queryFn: () => fetchNarratives(gameIds),
    enabled: gameIds.length > 0,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });

  useEffect(() => {
    if (gameIds.length === 0) return undefined;

    const currentGameIds = new Set(gameIds);
    const channel = supabase
      .channel('narratives-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'narratives' },
        (payload) => {
          const changed = {
            ...(payload.old as Partial<GameNarrative>),
            ...(payload.new as Partial<GameNarrative>),
          };

          if (!changed.game_id || currentGameIds.has(changed.game_id)) {
            void queryClient.invalidateQueries({ queryKey: ['narratives'] });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameIdsKey, queryClient]);

  const narrativesByGameId = useMemo(() => {
    const latest = new Map<string, GameNarrative>();

    for (const narrative of query.data ?? []) {
      const current = latest.get(narrative.game_id);
      if (!current || isNewerNarrative(narrative, current)) {
        latest.set(narrative.game_id, narrative);
      }
    }

    return latest;
  }, [query.data]);

  return {
    narrativesByGameId,
    refetch: query.refetch,
  };
}
