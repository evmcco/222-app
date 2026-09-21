import { DemoController, type DemoControls } from '@/components/demo-controller';
import { demoCatalog, demoDetails, demoWeek, gamesForDemo, narrativesForDemo, nowForDemo, pinsForDemo } from '@/lib/demo-games';
import type { GameFilter } from '@/lib/game-filters';
import { WeekSwipeArea } from '@/components/week-swipe-area';
import { WeekSelector } from '@/components/week-selector';
import { GameCard } from '@/components/game-card';
import { GameInfoDrawer } from '@/components/game-info-drawer';
import { SkeletonCard } from '@/components/skeleton-card';
import { colors, radius, spacing, type } from '@/constants/theme';
import { useGames } from '@/hooks/games';
import { GameFilterDropdown } from '@/components/game-filter-dropdown';
import { useGamePreferences } from '@/hooks/use-game-preferences';
import { useTeamMetadata } from '@/hooks/use-team-metadata';
import { matchesGameFilter, getFilterOptions } from '@/lib/game-filters';
import { buildDatedGameSections } from '@/lib/game-date-sections';
import { useNarratives } from '@/hooks/narratives';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useLocalDay } from '@/hooks/use-local-day';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Staggered fade/slide-up card entrance; static under reduce-motion. */
function CardEntrance({
  index,
  reduceMotion,
  children,
}: {
  index: number;
  reduceMotion: boolean;
  children: React.ReactNode;
}) {
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion ? 0 : 14);

  useEffect(() => {
    if (reduceMotion) return undefined;

    const delay = Math.min(index * 70, 420);
    opacity.value = withDelay(delay, withTiming(1, { duration: 340 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 340 }));

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [index, opacity, reduceMotion, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

/** Vertical breathing room between game cards, from the spacing scale. */
function CardSeparator(): React.JSX.Element {
  return <View style={styles.cardSeparator} />;
}

export default function HomeScreen() {
  return __DEV__ ? <DemoController>{controls => controls.scenario
    ? <DemoHome key={controls.scenario} controls={controls} />
    : <LiveHome controls={controls} />}</DemoController> : <LiveHome />;
}

function LiveHome({ controls }: { controls?: DemoControls }) {
  const source = useGames();
  const preferences = useGamePreferences();
  const metadata = useTeamMetadata(source.week?.season_year ?? null);
  const gameIds = useMemo(() => source.games.map(game => game.id).sort(), [source.games]);
  const narratives = useNarratives(gameIds);
  return <HomeView source={source} preferences={preferences} metadata={metadata} narratives={narratives} controls={controls} />;
}

function DemoHome({ controls }: { controls: DemoControls }) {
  const [filter, setFilter] = useState<GameFilter>('all');
  const [pins, setPins] = useState<string[]>(() => pinsForDemo(controls.scenario!));
  const games = useMemo(() => gamesForDemo(controls.scenario!), [controls.scenario]);
  const demoNow = useMemo(() => nowForDemo(controls.scenario!), [controls.scenario]);
  const demoNarratives = useMemo(() => narrativesForDemo(games), [games]);
  return <HomeView controls={controls} sortingDate={demoNow}
    source={{ games, week: demoWeek, weeks: [demoWeek.week_number], loading: false, error: null, refetch: async () => [], selectWeek: () => {} }}
    preferences={{ filter, pins, ready: true, setFilter, togglePin: id => setPins(current => current.includes(id) ? current.filter(pin => pin !== id) : [...current, id]) }}
    metadata={{ catalog: demoCatalog, loading: false }}
    narratives={{ narrativesByGameId: demoNarratives, refetch: async () => [] }} />;
}

function HomeView({ source, preferences, metadata, narratives, controls, sortingDate }: {
  source: Omit<ReturnType<typeof useGames>, 'refetch'> & { refetch: () => Promise<unknown> };
  preferences: ReturnType<typeof useGamePreferences>;
  metadata: Pick<ReturnType<typeof useTeamMetadata>, 'catalog' | 'loading'> & { retry?: () => unknown };
  narratives: Pick<ReturnType<typeof useNarratives>, 'narrativesByGameId'> & { refetch: () => Promise<unknown> };
  controls?: DemoControls;
  sortingDate?: Date;
}) {
  const { games, loading, error, refetch, week, weeks, selectWeek } = source;
  const { filter, pins, ready, setFilter, togglePin } = preferences;
  const lastLogoTap = useRef<number | null>(null);
  const onLogoPress = () => {
    const now = Date.now();
    if (lastLogoTap.current !== null && now - lastLogoTap.current < 350) {
      lastLogoTap.current = null;
      controls?.openMenu();
    } else lastLogoTap.current = now;
  };
  const filterOptions = useMemo(() => getFilterOptions(metadata.catalog), [metadata.catalog]);
  const needsMetadata = filter !== 'all' && filter !== 'ranked';
  const metadataUnavailable = needsMetadata && !metadata.catalog;
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const localDay = useLocalDay();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const { narrativesByGameId, refetch: refetchNarratives } = narratives;
  const selectedGame = selectedGameId
    ? games.find((game) => game.id === selectedGameId) ?? null
    : null;

  const datedSections = useMemo(() => buildDatedGameSections(
    games.filter(game => matchesGameFilter(game, filter, metadata.catalog)),
    pins,
    sortingDate ?? localDay,
  ), [games, filter, metadata.catalog, pins, localDay, sortingDate]);
  const visibleCount = datedSections.reduce((count, section) => count + section.data.length, 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refetch(), refetchNarratives()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetry = () => {
    void refetch();
  };

  const noData = games.length === 0;
  const showSkeletons = !ready || (noData && loading && !error);
  const showError = noData && !!error && !loading;
  const showEmpty = ready && noData && !loading && !error;

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable disabled={!__DEV__} onPress={onLogoPress} accessibilityRole={__DEV__ ? "button" : undefined} accessibilityLabel={__DEV__ ? "222 logo. Double tap to open developer menu" : "222"} hitSlop={8}>
          <Image
            source={require('../assets/images/222-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          </Pressable>
          <GameFilterDropdown options={filterOptions} value={filter} onChange={setFilter} disabled={!ready} />
        </View>
      </View>

      {controls?.scenario && !controls.hideBadge && <Pressable accessibilityRole="button" onPress={controls.openMenu} style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Text style={[type.small, { color: colors.odds }]}>DEMO · {controls.scenario}</Text>
      </Pressable>}

      {!metadata.catalog && <View style={styles.metadataNotice}>
        <Text style={[type.small, styles.sectionTitle]}>
          {metadata.loading ? 'Loading conference and state filters…' : 'Conference and state filters unavailable'}
        </Text>
        {!metadata.loading && <Pressable accessibilityRole="button" onPress={() => { void metadata.retry?.(); }} style={styles.clearFilter}>
          <Text style={[type.small, styles.sectionTitleLive]}>Retry</Text>
        </Pressable>}
      </View>}

      <WeekSelector
        week={week?.week_number ?? null}
        weeks={weeks}
        onChange={(value) => { setSelectedGameId(null); selectWeek(value); }}
      />

      <WeekSwipeArea
        week={week?.week_number ?? null}
        weeks={weeks}
        onChange={(value) => { setSelectedGameId(null); selectWeek(value); }}
      >
      {showError && <ErrorState message={error} onRetry={handleRetry} />}

      {showSkeletons && (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <SkeletonCard key={row} animate={!reduceMotion} />
          ))}
        </View>
      )}

      {showEmpty && <EmptyState />}

      {ready && !noData && (
        <SectionList
          key={`${week?.season_year}-${week?.week_number}-${filter}`}
          sections={datedSections}
          keyExtractor={(game) => game.id}
          renderItem={({ item, index }) => (
            <CardEntrance index={index} reduceMotion={reduceMotion}>
              <GameCard
                game={item}
                pinned={pins.includes(item.id)}
                narrative={narrativesByGameId.get(item.id)}
                onPress={() => setSelectedGameId(item.id)}
              />
            </CardEntrance>
          )}
          ItemSeparatorComponent={CardSeparator}
          renderSectionHeader={(info) => (
            <>
              <View style={styles.dateDivider}>
                <View style={styles.dateRule} />
                <Text accessibilityRole="header" style={[type.small, styles.dateTitle, info.section.key === 'pinned' && { color: colors.odds }]}>
                  {info.section.dateLabel}
                </Text>
                <View style={styles.dateRule} />
              </View>
            </>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.textSecondary}
              colors={[colors.live]}
              progressBackgroundColor={colors.surface}
            />
          }
          ListEmptyComponent={
            <View style={styles.stateContainer}>
              <Text style={[type.body, styles.sectionTitle]}>{metadataUnavailable ? (metadata.loading ? 'Loading your saved filter…' : 'Unable to load your saved filter') : 'No matching games this week'}</Text>
              <Pressable accessibilityRole="button" onPress={() => setFilter('all')} style={styles.clearFilter}>
                <Text style={[type.body, styles.sectionTitleLive]}>Clear filter</Text>
              </Pressable>
            </View>
          }
          ListFooterComponent={
            visibleCount > 0 ? (
              <Text style={[type.sectionHeader, styles.footer]}>
                Week {games[0].week_number} · {games[0].season_year} ·{' '}
                {visibleCount} games
              </Text>
            ) : null
          }
        />
      )}

      </WeekSwipeArea>

      {selectedGame && (
        <GameInfoDrawer
          game={selectedGame}
          detailsOverride={controls?.scenario ? demoDetails : undefined}
          pinned={pins.includes(selectedGame.id)}
          onTogglePin={() => togglePin(selectedGame.id)}
          narrative={narrativesByGameId.get(selectedGame.id)}
          onClose={() => setSelectedGameId(null)}
        />
      )}
    </View>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <View style={styles.stateContainer}>
      <View style={styles.errorIconWrap}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
      </View>
      <Text style={[type.headline, styles.stateHeadline]}>
        Couldn&apos;t load the scores
      </Text>
      <Text style={[type.body, styles.stateBody]}>
        {message ?? 'Something went wrong.'}
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading games"
        style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
      >
        <Text style={[type.chip, styles.retryText]}>Retry</Text>
      </Pressable>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.stateContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="calendar-outline" size={28} color={colors.textSecondary} />
      </View>
      <Text style={[type.headline, styles.stateHeadline]}>No games this week</Text>
      <Text style={[type.body, styles.stateBody]}>
        The slate is quiet right now — check back closer to kickoff.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 72,
    height: 36,
  },
  metadataNotice: { paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearFilter: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg },
  sectionTitlePinned: { color: colors.odds },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textSecondary,
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  dateRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dateTitle: {
    flexShrink: 1,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  sectionTitleLive: {
    color: colors.live,
  },
  sectionTitleFinal: {
    color: colors.textTertiary,
  },
  sectionCount: {
    color: colors.textTertiary,
  },
  footer: {
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  cardSeparator: {
    height: spacing.md,
  },
  skeletons: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xxl,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerDim,
    marginBottom: spacing.xs,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.xs,
  },
  stateHeadline: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateBody: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.live,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  retryText: {
    color: colors.onAccent,
  },
  pressed: {
    opacity: 0.7,
  },
});
