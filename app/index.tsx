import { GameCard } from '@/components/game-card';
import { GameInfoDrawer } from '@/components/game-info-drawer';
import { LiveDot } from '@/components/live-dot';
import { SkeletonCard } from '@/components/skeleton-card';
import { WeekSelector } from '@/components/week-selector';
import { colors, radius, spacing, type } from '@/constants/theme';
import { Game, useGames } from '@/hooks/games';
import {
  groupGamesByDate,
  selectCurrentWeek,
  useSeasonGames,
} from '@/hooks/use-season-games';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
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

type ListSection = {
  key: string;
  title: string;
  isLive: boolean;
  isToday: boolean;
  data: Game[];
};

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

function SectionHeader({ section }: { section: ListSection }) {
  return (
    <View style={styles.sectionHeader}>
      {(section.isLive || section.isToday) && <LiveDot size={8} />}
      <Text
        style={[
          type.sectionHeader,
          styles.sectionTitle,
          section.isLive && styles.sectionTitleLive,
          section.isToday && !section.isLive && styles.sectionTitleToday,
        ]}
      >
        {section.title}
      </Text>
      <Text style={[type.sectionHeader, styles.sectionCount]}>
        {section.data.length}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { games: liveGames, loading, error, refetch } = useGames();
  const {
    games: seasonGames,
    weeks,
    seasonYear,
    loading: seasonLoading,
    error: seasonError,
    refetch: refetchSeason,
  } = useSeasonGames();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  // The clock only needs to be stable within a render pass.
  const now = useMemo(() => new Date(), []);
  const currentWeek = useMemo(() => selectCurrentWeek(weeks, now), [now, weeks]);

  // Pre-select the current week once the week index lands.
  useEffect(() => {
    if (selectedWeek === null && currentWeek !== null) setSelectedWeek(currentWeek);
  }, [currentWeek, selectedWeek]);

  // The current week streams live scores through the realtime-fed hook;
  // other weeks render from the season snapshot.
  const isCurrentWeekView = selectedWeek !== null && selectedWeek === currentWeek;

  const weekGames = useMemo(() => {
    if (selectedWeek === null) return [];
    if (isCurrentWeekView) return liveGames;
    return seasonGames.filter((g) => g.week_number === selectedWeek);
  }, [isCurrentWeekView, liveGames, seasonGames, selectedWeek]);

  // LIVE stays pinned at the top; the rest of the slate is date-divided.
  const sections = useMemo<ListSection[]>(() => {
    const live = isCurrentWeekView ? weekGames.filter((g) => g.status === 'live') : [];
    const dated = isCurrentWeekView ? weekGames.filter((g) => g.status !== 'live') : weekGames;
    const liveSections: ListSection[] =
      live.length > 0
        ? [{ key: 'live', title: 'Live', isLive: true, isToday: false, data: live }]
        : [];
    const dateSections: ListSection[] = groupGamesByDate(dated, now).map(
      (section): ListSection => ({ ...section, isLive: false }),
    );
    return [...liveSections, ...dateSections];
  }, [isCurrentWeekView, now, weekGames]);

  const todayLine = useMemo(
    () =>
      new Date()
        .toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
        .toUpperCase(),
    [],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchSeason()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetry = () => {
    void refetch();
    void refetchSeason();
  };

  const noData = weekGames.length === 0;
  // Waiting on the active view's data source, or on the pre-selection.
  const waiting =
    (isCurrentWeekView ? loading : seasonLoading) || (selectedWeek === null && weeks.length > 0);
  const failed = !!error || !!seasonError;
  const showSkeletons = noData && waiting && !failed;
  const showError = noData && !waiting && failed;
  const showEmpty = noData && !waiting && !failed;

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <Image
          source={require('../assets/images/222-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={[type.dateLine, styles.dateLine]}>{todayLine}</Text>
      </View>

      {weeks.length > 0 && (
        <WeekSelector
          weeks={weeks}
          selected={selectedWeek}
          currentWeek={currentWeek}
          onSelect={setSelectedWeek}
        />
      )}

      {showError && <ErrorState message={error ?? seasonError} onRetry={handleRetry} />}

      {showSkeletons && (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <SkeletonCard key={row} animate={!reduceMotion} />
          ))}
        </View>
      )}

      {showEmpty && <EmptyState />}

      {!noData && (
        <SectionList
          sections={sections}
          keyExtractor={(game) => game.id}
          renderItem={({ item, index }) => (
            <CardEntrance index={index} reduceMotion={reduceMotion}>
              <GameCard game={item} onPress={() => setSelectedGame(item)} />
            </CardEntrance>
          )}
          ItemSeparatorComponent={CardSeparator}
          renderSectionHeader={(info) => (
            <SectionHeader section={info.section as ListSection} />
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
          ListFooterComponent={
            weekGames.length > 0 && selectedWeek !== null ? (
              <Text style={[type.sectionHeader, styles.footer]}>
                Week {selectedWeek}
                {seasonYear !== null ? ` · ${seasonYear}` : ''} · {weekGames.length}{' '}
                games
              </Text>
            ) : null
          }
        />
      )}

      {selectedGame && (
        <GameInfoDrawer game={selectedGame} onClose={() => setSelectedGame(null)} />
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
  logo: {
    width: 72,
    height: 36,
  },
  dateLine: {
    color: colors.textTertiary,
  },
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
  sectionTitleLive: {
    color: colors.live,
  },
  sectionTitleToday: {
    color: colors.textPrimary,
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
