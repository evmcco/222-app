import { useGameDetails, type GameDetails } from '@/hooks/game-details';
import { colors, radius, spacing, type } from '@/constants/theme';
import { GameNarrative } from '@/components/game-narrative';
import type { Game } from '@/hooks/games';
import type { GameNarrative as Narrative } from '@/hooks/narratives';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Panel covers roughly half the screen, per the review request. */
const DRAWER_HEIGHT_RATIO = 0.55;

interface GameInfoDrawerProps {
  game: Game;
  narrative?: Narrative;
  onClose: () => void;
}

type InfoRow = { label: string; value: string };

/**
 * The spread travels with the home team (negative = home favored), matching
 * the card's convention. Null at runtime when the book has no line posted.
 */
function formatSpreadLine(game: Game): string | null {
  if (game.spread == null) return null;
  if (game.spread === 0) return "Pick'em";
  const favored = game.spread < 0 ? game.home_team : game.away_team;
  return `${favored.abbreviation} -${Math.abs(game.spread)}`;
}

/** American-odds text, e.g. "+130"; null when the moneyline column is empty. */
function formatMoneyline(moneyline: number | null): string | null {
  if (moneyline == null) return null;
  return moneyline > 0 ? `+${moneyline}` : `${moneyline}`;
}

/** Broadcast-style state line, mirroring the card's live-display rules. */
function formatStatusLine(game: Game): string {
  if (game.interruption) return game.interruption;
  if (game.status === 'live') {
    if (game.current_game_time === '0:00') {
      return game.quarter === '2nd' ? 'Halftime' : `End of ${game.quarter ?? 'quarter'}`;
    }
    return [game.quarter, game.current_game_time].filter(Boolean).join(' · ');
  }
  if (game.status === 'final') return 'Final';
  return 'Upcoming';
}

function getGameInfoRows(game: Game, details: GameDetails | undefined, loading: boolean): InfoRow[] {
  const kickoff = [game.date_display, game.start_time].filter(Boolean).join(' · ');
  return [
    { label: 'Kickoff', value: kickoff },
    { label: 'Location', value: details?.location || (loading ? 'Loading…' : 'Unavailable') },
    { label: 'TV', value: details?.channels.join(', ') || (loading ? 'Loading…' : 'Unavailable') },
    { label: 'Week', value: `Week ${game.week_number} · ${game.season_year} Season` },
  ];
}

/** Only rows backed by live data — empty moneylines simply don't render. */
function getBettingRows(game: Game): InfoRow[] {
  const rows: InfoRow[] = [];

  const line = formatSpreadLine(game);
  if (line) rows.push({ label: 'Line', value: line });

  if (game.total_points != null) {
    rows.push({ label: 'Total', value: `O/U ${game.total_points}` });
  }

  const awayMoneyline = formatMoneyline(game.away_moneyline);
  if (awayMoneyline) {
    rows.push({ label: `${game.away_team.abbreviation} ML`, value: awayMoneyline });
  }
  const homeMoneyline = formatMoneyline(game.home_moneyline);
  if (homeMoneyline) {
    rows.push({ label: `${game.home_team.abbreviation} ML`, value: homeMoneyline });
  }

  return rows;
}

function DrawerTeamRow({
  logo,
  name,
  abbreviation,
  ranking,
  score,
  showScore,
}: {
  logo?: string;
  name: string;
  abbreviation: string;
  ranking: number | null;
  score: number;
  showScore: boolean;
}) {
  return (
    <View style={styles.teamRow}>
      {logo ? <Image source={{ uri: logo }} style={styles.teamLogo} contentFit="contain" /> : null}
      <View style={styles.teamIdentity}>
        <Text style={[type.body, styles.teamName]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[type.small, styles.teamAbbr]}>{abbreviation}</Text>
      </View>
      {ranking != null && ranking <= 25 && (
        <View style={styles.rankChip}>
          <Text style={[type.chip, styles.rankText]}>#{ranking}</Text>
        </View>
      )}
      {showScore ? (
        <Text style={[type.headline, styles.teamScore]}>{score}</Text>
      ) : null}
    </View>
  );
}

function InfoRowView({ label, value }: InfoRow) {
  return (
    <View style={styles.infoRow}>
      <Text style={[type.small, styles.infoLabel]}>{label}</Text>
      <Text style={[type.body, styles.infoValue]}>{value}</Text>
    </View>
  );
}

export function GameInfoDrawer({ game, narrative, onClose }: GameInfoDrawerProps) {
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const drawerHeight = Math.round(windowHeight * DRAWER_HEIGHT_RATIO);

  useEffect(() => {
    if (reduceMotion) return undefined;

    progress.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    return () => {
      cancelAnimation(progress);
    };
  }, [progress, reduceMotion]);

  const handleClose = () => {
    if (reduceMotion) {
      onClose();
      return;
    }
    progress.value = withTiming(
      0,
      { duration: 220, easing: Easing.in(Easing.quad) },
      (finished) => {
        if (finished) runOnJS(onClose)();
      },
    );
  };

  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [drawerHeight, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const details = useGameDetails(game.id);
  const infoRows = getGameInfoRows(game, details.data, details.isPending);
  const bettingRows = getBettingRows(game);
  const isScheduled = game.status === 'scheduled';
  const statusLine = formatStatusLine(game);
  const isLive = game.status === 'live' && !game.interruption;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        <Pressable
          style={styles.scrim}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close game details"
        />
      </Animated.View>

      <Animated.View
        style={[styles.panel, { height: drawerHeight, paddingBottom: insets.bottom + spacing.lg }, panelStyle]}
        accessibilityViewIsModal
      >
        <View style={styles.grabHandle} />

        <ScrollView contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.statusChip,
                !!game.interruption && styles.statusChipDelayed,
                isLive && styles.statusChipLive,
                game.status === 'final' && styles.statusChipFinal,
              ]}
            >
              <Ionicons
                name={game.interruption ? 'pause-circle-outline' : isLive ? 'radio-outline' : game.status === 'final' ? 'checkmark-circle-outline' : 'time-outline'}
                size={14}
                color={
                  game.interruption ? colors.odds : isLive
                    ? colors.liveBright
                    : game.status === 'final'
                      ? colors.textTertiary
                      : colors.textSecondary
                }
              />
              <Text
                style={[
                  type.chip,
                  game.interruption ? styles.statusTextDelayed : isLive
                    ? styles.statusTextLive
                    : game.status === 'final'
                      ? styles.statusTextFinal
                      : styles.statusTextScheduled,
                ]}
              >
                {statusLine}
              </Text>
            </View>
            <Text style={[type.small, styles.dateLabel]}>{game.date_display}</Text>
          </View>

          <Text style={[type.small, styles.matchupMeta]}>
            {game.away_team.abbreviation} @ {game.home_team.abbreviation}
          </Text>

          <View style={styles.teamsBlock}>
            <DrawerTeamRow
              logo={game.away_team.logo}
              name={game.away_team.name}
              abbreviation={game.away_team.abbreviation}
              ranking={game.away_team_ranking}
              score={game.away_team_score}
              showScore={!isScheduled}
            />
            <DrawerTeamRow
              logo={game.home_team.logo}
              name={game.home_team.name}
              abbreviation={game.home_team.abbreviation}
              ranking={game.home_team_ranking}
              score={game.home_team_score}
              showScore={!isScheduled}
            />
          </View>

          {narrative && (
            <>
              <View style={styles.divider} />
              <GameNarrative narrative={narrative} />
            </>
          )}

          {bettingRows.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={[type.sectionHeader, styles.sectionTitle]}>Betting</Text>
              {bettingRows.map((row) => (
                <InfoRowView key={row.label} label={row.label} value={row.value} />
              ))}
            </>
          )}

          <View style={styles.divider} />
          <Text style={[type.sectionHeader, styles.sectionTitle]}>Game Info</Text>
          {infoRows.map((row) => (
            <InfoRowView key={row.label} label={row.label} value={row.value} />
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
  },
  panel: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  grabHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.textTertiary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  panelContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  statusChipDelayed: { backgroundColor: colors.oddsDim },
  statusTextDelayed: { color: colors.odds },
  statusChipLive: {
    backgroundColor: colors.liveDim,
  },
  statusChipFinal: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statusTextScheduled: {
    color: colors.textSecondary,
  },
  statusTextLive: {
    color: colors.liveBright,
  },
  statusTextFinal: {
    color: colors.textTertiary,
  },
  dateLabel: {
    color: colors.textTertiary,
  },
  matchupMeta: {
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  teamsBlock: {
    gap: spacing.xs,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  teamLogo: {
    width: 28,
    height: 28,
  },
  teamIdentity: {
    flex: 1,
    gap: 2,
  },
  teamName: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  teamAbbr: {
    color: colors.textTertiary,
  },
  rankChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 26,
    alignItems: 'center',
  },
  rankText: {
    color: colors.textSecondary,
    textTransform: 'none',
  },
  teamScore: {
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.lg,
  },
  infoLabel: {
    color: colors.textTertiary,
  },
  infoValue: {
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
});
