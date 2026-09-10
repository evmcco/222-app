import { WeekSwipeArea } from '@/components/week-swipe-area';
import { WeekSelector } from '@/components/week-selector';
import { GameCard } from '@/components/game-card';
import { GameInfoDrawer } from '@/components/game-info-drawer';
import { LiveDot } from '@/components/live-dot';
import { SkeletonCard } from '@/components/skeleton-card';
import { colors, radius, spacing, type } from '@/constants/theme';
import { Game, useGames } from '@/hooks/games';
import { useNarratives } from '@/hooks/narratives';
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

type GameSection = {
  key: 'live' | 'delayed' | 'scheduled' | 'final';
  title: string;
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

function SectionHeader({ section }: { section: GameSection }) {
  const isLive = section.key === 'live';
  return (
    <View style={styles.sectionHeader}>
      {isLive && <LiveDot size={8} />}
      <Text
        style={[
          type.sectionHeader,
          styles.sectionTitle,
          isLive && styles.sectionTitleLive,
          section.key === 'final' && styles.sectionTitleFinal,
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
  const { games, loading, error, refetch, week, weeks, selectWeek } = useGames();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const gameIds = useMemo(() => games.map((game) => game.id).sort(), [games]);
  const { narrativesByGameId, refetch: refetchNarratives } = useNarratives(gameIds);
  const selectedGame = selectedGameId
    ? games.find((game) => game.id === selectedGameId) ?? null
    : null;

  const sections = useMemo<GameSection[]>(() => {
    const grouped: GameSection[] = [
      { key: 'live', title: 'Live', data: games.filter((g) => g.status === 'live' && !g.interruption) },
      { key: 'delayed', title: 'Delayed', data: games.filter((g) => !!g.interruption) },
      { key: 'scheduled', title: 'Upcoming', data: games.filter((g) => g.status === 'scheduled' && !g.interruption) },
      { key: 'final', title: 'Final', data: games.filter((g) => g.status === 'final') },
    ];
    return grouped.filter((section) => section.data.length > 0);
  }, [games]);

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
      await Promise.allSettled([refetch(), refetchNarratives()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetry = () => {
    void refetch();
  };

  const noData = games.length === 0;
  const showSkeletons = noData && loading && !error;
  const showError = noData && !!error && !loading;
  const showEmpty = noData && !loading && !error;

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Image
            source={require('../assets/images/222-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>
        <Text style={[type.dateLine, styles.dateLine]}>{todayLine}</Text>
      </View>

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

      {!noData && (
        <SectionList
          key={`${week?.season_year}-${week?.week_number}`}
          sections={sections}
          keyExtractor={(game) => game.id}
          renderItem={({ item, index }) => (
            <CardEntrance index={index} reduceMotion={reduceMotion}>
              <GameCard
                game={item}
                narrative={narrativesByGameId.get(item.id)}
                onPress={() => setSelectedGameId(item.id)}
              />
            </CardEntrance>
          )}
          ItemSeparatorComponent={CardSeparator}
          renderSectionHeader={(info) => (
            <SectionHeader section={info.section as GameSection} />
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
            games.length > 0 ? (
              <Text style={[type.sectionHeader, styles.footer]}>
                Week {games[0].week_number} · {games[0].season_year} ·{' '}
                {games.length} games
              </Text>
            ) : null
          }
        />
      )}

      </WeekSwipeArea>

      {selectedGame && (
        <GameInfoDrawer
          game={selectedGame}
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
