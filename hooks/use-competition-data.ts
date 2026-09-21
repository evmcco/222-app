import { skipToken, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { acceptCompetitionSnapshot, currentTeamRecord, type CompetitionSnapshot, type CompetitionState } from '@/lib/competition-data';
import { createRefreshQueue } from '@/lib/refresh-queue';
export const competitionKey = (season: number) => ['competition-snapshot', season] as const;
// One subscription/request coordinator per season/client, regardless of expanded rows.
const coordinators = new WeakMap<QueryClient, Map<number, { users: number; refresh(): Promise<void>; stop(): void }>>();
function subscribe(client: QueryClient, season: number) {
  let map = coordinators.get(client);
  if (!map) { map = new Map(); coordinators.set(client, map); }
  const existing = map.get(season);
  if (existing) { existing.users++; return () => release(); }
  let disposed = false, minimumRevision = 0, generation = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let channel: ReturnType<typeof supabase.channel> | undefined;
  const key = competitionKey(season);
  const markUncertain = () => client.setQueryData<CompetitionState>(key, old => ({ ...old, isCurrent: false, error: old?.error ?? null, checkedAt: old?.checkedAt ?? 0 }));
  const refresh = createRefreshQueue(async () => {
    if (disposed || AppState.currentState === 'background') return;
    const requestGeneration = generation;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const cached = client.getQueryData<CompetitionState>(key);
      if (cached?.snapshot && minimumRevision <= cached.snapshot.revision) {
        // Most fallback polls have no changes. Confirm the tiny revision row before
        // transferring the full season, while still recovering missed notifications.
        const { data: revision, error: revisionError } = await supabase.from('competition_revisions')
          .select('revision').eq('id', 1).abortSignal(controller.signal).single();
        if (revisionError) throw revisionError;
        if (!Number.isSafeInteger(revision?.revision)) throw new Error('Invalid competition revision');
        if (disposed || requestGeneration !== generation) return;
        minimumRevision = Math.max(minimumRevision, revision.revision);
        if (revision.revision === cached.snapshot.revision && minimumRevision <= revision.revision) {
          client.setQueryData<CompetitionState>(key, old => old && ({ ...old, isCurrent: true, error: null, checkedAt: Date.now() }));
          return;
        }
      }
      const { data, error } = await supabase.rpc('get_competition_snapshot', { p_season: season }).abortSignal(controller.signal);
      if (error) throw error;
      if (disposed || requestGeneration !== generation) return;
      if (data?.season_year !== season) throw new Error('Wrong competition season');
      client.setQueryData<CompetitionState>(key, old => acceptCompetitionSnapshot(old, data as CompetitionSnapshot, minimumRevision));
    } catch (e) {
      if (!disposed && requestGeneration === generation) client.setQueryData<CompetitionState>(key, old => ({ ...old, isCurrent: false, checkedAt: old?.checkedAt ?? 0, error: e instanceof Error ? e.message : String((e as { message?: string })?.message ?? 'Unable to refresh standings') }));
    } finally {
      clearTimeout(timeout);
    }
  });
  function connect() {
    if (disposed) return;
    const connected = supabase.channel(`competition:${season}`);
    channel = connected;
    connected
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'competition_revisions' }, payload => {
        minimumRevision = Math.max(minimumRevision, Number(payload.new.revision) || 0);
        markUncertain(); void refresh();
      }).subscribe(status => {
        if (disposed || channel !== connected) return;
        if (status === 'SUBSCRIBED') { markUncertain(); void refresh(); }
        else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
          markUncertain();
          if (!retry) retry = setTimeout(() => { retry = undefined; const old = channel; channel = undefined; if(old) void supabase.removeChannel(old); connect(); }, 5000);
        }
      });
  }
  connect(); markUncertain(); void refresh();
  const interval = setInterval(() => { void refresh(); }, 30_000);
  const appState = AppState.addEventListener('change', state => {
    generation++; markUncertain();
    if (state === 'active') void refresh();
  });
  // Explicit UI refresh shares the same coordinator, with no competing queryFn.
  const cacheListener = client.getQueryCache().subscribe(event => {
    if (event.type === 'updated' && event.query.queryKey[0] === key[0] && event.query.queryKey[1] === season && event.action.type === 'invalidate') {
      markUncertain(); void refresh();
    }
  });
  map.set(season, { users: 1, refresh, stop() { markUncertain(); disposed = true; clearInterval(interval); clearTimeout(retry); appState.remove(); cacheListener(); if(channel) void supabase.removeChannel(channel); } });
  return () => release();
  function release() { const current = map!.get(season); if (current && --current.users === 0) { current.stop(); map!.delete(season); } }
}
export function useCompetitionData(seasonYear: number | null) {
  const client = useQueryClient();
  const key = competitionKey(seasonYear ?? 0);
  const query = useQuery<CompetitionState>({ queryKey: key, queryFn: skipToken, staleTime: Infinity });
  useEffect(() => seasonYear === null ? undefined : subscribe(client, seasonYear), [client, seasonYear]);
  // queryFn is disabled: invalidation alone resolves before the coordinator's
  // network work. Return its actual promise so the refresh control stays active.
  const refetch = useCallback(() => seasonYear === null ? Promise.resolve()
    : coordinators.get(client)?.get(seasonYear)?.refresh() ?? Promise.resolve(), [client, seasonYear]);
  return { data: query.data?.snapshot, isCurrent: !!query.data?.isCurrent && Date.now() - query.data.checkedAt < 45_000,
    isLoading: seasonYear !== null && !query.data?.snapshot && !query.data?.error,
    error: query.data?.error ?? null,
    refetch };
}
export function useCurrentTeamRecord(seasonYear: number | null, teamId: string) {
  const query = useCompetitionData(seasonYear);
  return currentTeamRecord(query.data, teamId, query.isCurrent);
}
