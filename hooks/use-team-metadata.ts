import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { makeTeamCatalog, type TeamCatalog } from '@/lib/game-filters';
import { supabase } from '@/lib/supabase';

export function useTeamMetadata(season: number | null) {
  const [cache, setCache] = useState<{ season: number; catalog?: TeamCatalog }>();
  const key = `222:team-metadata:v1:${season}`;
  useEffect(() => {
    if (season === null) return;
    let active = true;
    AsyncStorage.getItem(key).then(raw => {
      const catalog = raw ? makeTeamCatalog(JSON.parse(raw), season) : undefined;
      if (active) setCache({ season, catalog });
    }).catch(() => { if (active) setCache({ season }); });
    return () => { active = false; };
  }, [key, season]);
  const query = useQuery({
    queryKey: ['team-metadata', season],
    enabled: season !== null && cache?.season === season,
    queryFn: async () => {
      const { data, error } = await supabase.from('team_filter_metadata')
        .select('season_year,team_id,name,state,division,conference_id,conference_name,conference_tier')
        .eq('season_year', season!).order('team_id').limit(500);
      if (error) throw error;
      return makeTeamCatalog(data, season!);
    },
    staleTime: 6 * 60 * 60 * 1000,
    refetchInterval: 6 * 60 * 60 * 1000,
    retry: 1,
  });
  useEffect(() => {
    if (query.data?.season !== season) return;
    AsyncStorage.setItem(key, JSON.stringify(query.data.rows)).catch(error => console.warn('Could not cache team metadata:', error));
  }, [key, query.data, season]);
  return {
    catalog: query.data ?? (cache?.season === season ? cache.catalog : undefined),
    loading: season === null || cache?.season !== season || query.isLoading,
    error: query.error,
    retry: query.refetch,
  };
}
