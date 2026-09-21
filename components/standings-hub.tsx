import { gameDate } from '@/lib/game-local-time';
import { useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { TeamLogo } from '@/components/team-logo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, type } from '@/constants/theme';
import { FilterDropdown } from '@/components/filter-dropdown';
import { useDemoControls } from '@/components/demo-controller';
import { currentRank, gameResult, opponentFor, pollNames, recordLabel, teamSchedule, type Poll, type ScheduleGame, type StandingRow, type StandingsView } from '@/lib/standings';

export type HubData = {
  rows: StandingRow[];
  games: ScheduleGame[];
  ranks: ReadonlyMap<string, number>;
  conferences: { id: string; name: string; group?: string }[];
  polls: Poll[];
  loading: boolean;
  error: boolean;
};
type Props = {
  data: HubData;
  view: StandingsView;
  poll: Poll;
  conference: string;
  onView: (view: StandingsView) => void;
  onPoll: (poll: Poll) => void;
  onConference: (id: string) => void;
  onGame: (id: string) => void;
  onRefresh: () => Promise<unknown>;
};

function TeamSchedule({ games, row, ranks, conferenceOnly, onGame }: { games: ScheduleGame[]; row: StandingRow; ranks: ReadonlyMap<string, number>; conferenceOnly: boolean; onGame: Props['onGame'] }) {
  const schedule = teamSchedule(games, row.team.id, conferenceOnly);
  if (!schedule.length) return <Text style={[type.small, styles.secondary, styles.noSchedule]}>{conferenceOnly ? 'Conference schedule not available yet.' : 'Schedule not available yet.'}</Text>;
  return <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled contentContainerStyle={styles.schedule} accessibilityLabel={`${row.team.name} ${conferenceOnly ? 'conference ' : ''}schedule`}>
    {schedule.map(game => {
      const opponent = opponentFor(game, row.team.id);
      const result = gameResult(game, row.team.id);
      const rank = currentRank(ranks, opponent.id);
      const kickoff = gameDate(game.game_date);
      const when = Number.isFinite(kickoff.getTime()) ? kickoff.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Date to be announced';
      return <Pressable key={game.id} onPress={() => onGame(game.id)} accessibilityRole="button"
        accessibilityLabel={`${game.home_team_id === row.team.id ? 'Versus' : 'At'} ${opponent.name}${rank ? `, current rank ${rank}` : ''}, ${when}, ${result === 'W' ? 'win' : result === 'L' ? 'loss' : result === 'T' ? 'tie' : game.interruption ?? game.status}. Open game details`}
        style={styles.opponent}>
        <View style={styles.opponentLogo}>
          <TeamLogo logo={opponent.logo} style={styles.smallLogo} contentFit="contain" />
          {rank && <View style={styles.rankBadge}><Text style={styles.rankText}>{rank}</Text></View>}
        </View>
        <Text style={[styles.result, { color: result === 'W' ? colors.live : result === 'L' ? colors.danger : colors.textSecondary }]}>{result ?? ' '}</Text>
      </Pressable>;
    })}
  </ScrollView>;
}

export function StandingsHub({ data, view, poll, conference, onView, onPoll, onConference, onGame, onRefresh }: Props) {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const controls = useDemoControls();
  const lastTap = useRef(0);
  // Keep independent sets per view/poll/conference and retain them when switching bottom tabs.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [refreshing, setRefreshing] = useState(false);
  const conferenceOnly = view === 'conferences';
  const context = `${view}:${conferenceOnly ? conference : poll}`;
  const refresh = async () => { setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } };
  const hasRows = data.rows.length > 0;
  return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <View style={styles.header}>
      <Pressable accessibilityLabel={__DEV__ ? '222 logo. Double tap to open developer menu' : '222'} accessibilityRole={__DEV__ ? 'button' : undefined} disabled={!__DEV__}
        onPress={() => { const now = Date.now(); if (now - lastTap.current < 350) { controls?.openMenu(); lastTap.current = 0; } else lastTap.current = now; }}>
        <Image testID="standings-brand" source={require('../assets/images/222-logo.png')} contentFit="contain" style={styles.brand} />
      </Pressable>
      {controls?.scenario && !controls.hideBadge && <Pressable accessibilityRole="button" onPress={controls.openMenu}><Text style={[type.small, { color: colors.odds }]}>DEMO</Text></Pressable>}
    </View>
    <View style={styles.segments}>
      {(['top25', 'conferences'] as const).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: item === view }} onPress={() => onView(item)} style={[styles.segment, view === item && styles.segmentSelected]}>
        <Text style={[type.body, { color: view === item ? colors.textPrimary : colors.textSecondary, fontWeight: '700' }]}>{item === 'top25' ? 'Top 25' : 'Conferences'}</Text>
      </Pressable>)}
    </View>
    <View style={styles.toolbar}>
      {conferenceOnly ? <FilterDropdown label="Choose conference" align="start" value={conference}
        options={data.conferences.map(item => ({ value: item.id, label: item.name, group: item.group }))}
        onChange={onConference} disabled={!data.conferences.length} fallbackLabel="Conferences unavailable" />
        : <FilterDropdown label="Choose poll" align="start" value={poll}
          options={data.polls.map(value => ({ value, label: pollNames[value] }))} onChange={onPoll} />}
    </View>
    {hasRows && data.error && <Pressable accessibilityRole="button" onPress={() => { void refresh(); }} style={styles.notice}><Text style={[type.small, { color: colors.odds }]}>Unable to refresh. Showing saved data · Retry</Text></Pressable>}
    <FlatList key={context} data={data.rows} keyExtractor={row => row.team.id} extraData={expanded}
      contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void refresh(); }} tintColor={colors.live} colors={[colors.live]} />}
      renderItem={({ item: row }) => {
        const key = `${context}:${row.team.id}`;
        const open = expanded.has(key);
        const movement = row.rank && row.previousRank ? row.previousRank - row.rank : 0;
        return <>
          <View style={styles.card}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${row.rank ? `Rank ${row.rank}, ` : ''}${row.team.name}, ${recordLabel(row.record, conferenceOnly)}${conferenceOnly ? ` conference, ${recordLabel(row.record)} overall` : ' overall'}. ${open ? 'Collapse' : 'Expand'} schedule${!conferenceOnly && row.conferenceAbbreviation ? `. ${row.conferenceAbbreviation}` : ''}`}
              onPress={() => setExpanded(current => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; })} style={[styles.teamRow, fontScale >= 1.5 && styles.largeTextRow]}>
              {conferenceOnly
                ? <Text numberOfLines={1} style={[styles.rowText, styles.position, { minWidth: 28 * fontScale }]}>{row.position ?? '—'}</Text>
                : <Text numberOfLines={1} style={[styles.rowText, styles.ranking, { minWidth: 28 * fontScale }]}>{row.rank}</Text>}
              {!conferenceOnly && <View style={[styles.trend, { width: 32 * fontScale }]}>
                {(row.previousRank == null || movement !== 0) && <Text numberOfLines={1} style={[type.small, styles.rowText, styles.stat, { color: movement > 0 ? colors.live : movement < 0 ? colors.danger : colors.textSecondary }]}>{row.previousRank == null ? 'NEW' : movement > 0 ? `↑ ${movement}` : `↓ ${Math.abs(movement)}`}</Text>}
              </View>}
              <TeamLogo logo={row.team.logo} contentFit="contain" style={styles.teamLogo} />
              <View style={styles.identity}>
                <Text numberOfLines={1} style={[type.body, styles.rowText, styles.teamName]}>{row.team.abbreviation}</Text>
              </View>
              <View style={styles.trailingStats}>
                {conferenceOnly ? <>
                  <Text numberOfLines={1} style={[type.small, styles.rowText, styles.secondary, styles.stat]}>({recordLabel(row.record)})</Text>
                  <Text numberOfLines={1} style={[styles.rowText, styles.recordPrimary]}>{recordLabel(row.record, true)}</Text>
                </> : <>
                  <Text numberOfLines={1} style={[styles.rowText, styles.rankingRecord]}>{recordLabel(row.record)}</Text>
                  {row.conferenceAbbreviation && <Text numberOfLines={1} style={[styles.rowText, styles.conference]}>{row.conferenceAbbreviation}</Text>}
                </>}
              </View>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
            </Pressable>
            {open && <TeamSchedule row={row} games={data.games} ranks={data.ranks} conferenceOnly={conferenceOnly} onGame={onGame} />}
          </View>
        </>;
      }}
      ListFooterComponent={conferenceOnly && hasRows ? <Text style={[type.small, styles.secondary, styles.footer]}>Sorted by conference wins, then fewest conference losses, then team name (A–Z). Tiebreakers are hard. We’ll add them when they start to matter.</Text> : null}
      ListEmptyComponent={data.loading ? <StandingsSkeleton /> : <View style={styles.empty}>
        <Ionicons name={data.error ? 'cloud-offline-outline' : 'podium-outline'} size={32} color={colors.textTertiary} />
        <Text style={[type.headline, styles.primary]}>{data.error ? 'Standings unavailable' : !conferenceOnly && poll === 'cfp' ? 'CFP rankings aren’t out yet' : conferenceOnly ? 'Standings are on the way' : 'This poll isn’t available yet'}</Text>
        <Text style={[type.body, styles.secondary, { textAlign: 'center' }]}>{data.error ? 'We couldn’t load the latest season data. Try again in a moment.' : !conferenceOnly && poll === 'cfp' ? 'Check AP or Coaches while we wait for the first committee release.' : 'Published standings will appear here when available.'}</Text>
        {!data.loading && <Pressable accessibilityRole="button" onPress={() => { void refresh(); }} style={styles.select}><Text style={[type.body, { color: colors.live }]}>Refresh</Text></Pressable>}
      </View>} />
  </View>;
}
function StandingsSkeleton() {
  return <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading standings" accessibilityState={{ busy: true }} testID="standings-loading">
    {Array.from({ length: 7 }, (_, index) => <View key={index} style={styles.card}>
      <View style={styles.teamRow}>
        <View style={[styles.skeleton, { width: 40, height: 18 }]} />
        <View style={[styles.skeleton, styles.teamLogo]} />
        <View style={styles.identity}>
          <View style={[styles.skeleton, { width: 64, height: 16 }]} />
        </View>
        <View style={[styles.skeleton, { width: 42, height: 22 }]} />
      </View>
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  skeleton: { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm },
  screen: { flex: 1, backgroundColor: colors.background },
  primary: { color: colors.textPrimary }, secondary: { color: colors.textSecondary },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { width: 66, height: 32 },
  segments: { flexDirection: 'row', padding: spacing.xs, backgroundColor: colors.surfaceElevated, borderRadius: radius.md, marginHorizontal: spacing.xl, gap: spacing.xs },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  segmentSelected: { backgroundColor: colors.surface },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginHorizontal: spacing.xl, marginVertical: spacing.md },
  select: { minHeight: 44, maxWidth: '75%', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginBottom: spacing.xs, overflow: 'hidden' },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm, minHeight: 56 },
  largeTextRow: { gap: spacing.xs },
  position: { flexShrink: 0, textAlign: 'center', color: colors.textSecondary, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  rowText: { includeFontPadding: false, textAlignVertical: 'center' },
  rankingRecord: { flexShrink: 0, color: colors.textSecondary, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  teamLogo: { width: 32, height: 32 },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamName: { color: colors.textPrimary, fontWeight: '700', flexShrink: 1 },
  conference: { color: colors.textSecondary, flexShrink: 0, fontSize: 11, lineHeight: 16, fontWeight: '500' },
  trend: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  trailingStats: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, gap: spacing.sm },
  stat: { flexShrink: 0, fontVariant: ['tabular-nums'] },
  ranking: { flexShrink: 0, textAlign: 'center', color: colors.textPrimary, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  recordPrimary: { flexShrink: 0, color: colors.textPrimary, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  schedule: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: 0 },
  opponent: { width: 44, minHeight: 60, alignItems: 'center', gap: spacing.xs },
  opponentLogo: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  smallLogo: { width: 26, height: 26 },
  rankBadge: { position: 'absolute', right: -4, top: -8, backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1, borderRadius: 4, minWidth: 17, paddingHorizontal: 2, alignItems: 'center' },
  rankText: { fontSize: 9, lineHeight: 13, fontWeight: '800', color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  result: { fontSize: 11, lineHeight: 16, fontWeight: '800' },
  noSchedule: { padding: spacing.lg, paddingTop: 0 },
  footer: { paddingHorizontal: spacing.sm, paddingTop: spacing.md, lineHeight: 20 },
  notice: { marginHorizontal: spacing.xl, marginBottom: spacing.md, minHeight: 32, justifyContent: 'center' },
  empty: { paddingTop: spacing.xxxl, gap: spacing.md, alignItems: 'center' },
});
