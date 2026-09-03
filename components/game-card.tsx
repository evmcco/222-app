import { LiveDot } from '@/components/live-dot';
import { colors, radius, spacing, type } from '@/constants/theme';
import { Game } from '@/hooks/games';
import { useGameNotifications } from '@/hooks/use-game-notifications';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GameCardTeamRow } from './game-card-team-row';


interface GameCardProps {
  game: Game;
  /** Opens the game-info drawer; omit for a non-interactive card. */
  onPress?: () => void;
}

export function GameCard({ game, onPress }: GameCardProps) {
  const { isNotificationEnabled, toggleNotification } = useGameNotifications();
  const { enableGameNotification, disableGameNotification } = usePushNotifications();
  const reduceMotion = useReduceMotion();

  const getStatusDisplay = () => {
    if (game.status === 'scheduled') {
      return game.start_time;
    } else if (game.status === 'live') {
      if (game.current_game_time === '0:00') {
        if (game.quarter === '2nd')
          return 'Halftime'
        return `End of ${game.quarter}`;
      }
      return `${game.quarter} ${game.current_game_time}`;
    } else {
      return 'FINAL';
    }
  };

  const handleBellPress = async () => {
    if (isNotificationEnabled(game.id)) {
      // Disable notification
      const success = await disableGameNotification(game.id);
      if (success) {
        toggleNotification(game.id);
      }
    } else {
      // Enable notification
      const success = await enableGameNotification(game.id);
      if (success) {
        toggleNotification(game.id);
      }
    }
  };

  const showNotificationBell = game.status !== 'final';

  const homeWon = game.home_team_score > game.away_team_score;
  const awayWon = game.away_team_score > game.home_team_score;

  // Calculate spread coverage
  const getSpreadInfo = () => {
    if (game.spread === undefined) {
      return { homeIsCovering: false, awayIsCovering: false, spreadText: '', favoredTeam: '' };
    }

    // Determine favored team and create spread text
    // The spread is the HOME TEAM SPREAD
    const favoredTeam = game.spread < 0 ? game.home_team.abbreviation : game.away_team.abbreviation;
    const spreadValue = Math.abs(game.spread);
    const scoreDifference = game.home_team_score - game.away_team_score;

    // Calculate if home team is covering
    let homeIsCovering;
    let awayIsCovering;
    // TODO handle games with spread of 0, means its a pickem
    if (game.spread < 0) {
      // Home team is favored, needs to win by more than the spread
      homeIsCovering = scoreDifference > spreadValue;
      awayIsCovering = scoreDifference < spreadValue
    } else {
      // Away team is favored, home team covers if they lose by less than spread or win
      homeIsCovering = scoreDifference > -spreadValue;
      awayIsCovering = scoreDifference < -spreadValue
    }

    const coveringTeam = homeIsCovering ? game.home_team.abbreviation : awayIsCovering ? game.away_team.abbreviation : 'PUSH'
    const spreadText = coveringTeam === 'PUSH' ? 'PUSH'
      : game.status === 'scheduled' ? `${favoredTeam} -${spreadValue}`
        : `${coveringTeam} ${(favoredTeam === coveringTeam ? '-' : '+')}${spreadValue}`;


    if (game.status === 'scheduled') {
      return { homeIsCovering: false, awayIsCovering: false, spreadText, favoredTeam };
    }
    return {
      // homeIsCovering,
      // awayIsCovering,
      spreadText,
      // favoredTeam
    };
  };

  // Calculate over/under status
  const getOverUnderInfo = () => {
    if (game.total_points === undefined) return { status: '', isOver: false };

    const currentTotal = game.home_team_score + game.away_team_score;

    if (game.status === 'scheduled') {
      return { status: `O/U ${game.total_points}`, isOver: false };
    } else if (game.status === 'live') {
      return {
        status: `O/U ${game.total_points} TOT ${currentTotal}`,
        isOver: currentTotal > game.total_points
      };
    } else {
      return {
        status: currentTotal > game.total_points ? `O ${game.total_points} | TOT ${currentTotal}` : `U ${game.total_points} | TOT ${currentTotal}`,
        isOver: currentTotal > game.total_points
      };
    }
  };

  const spreadInfo = getSpreadInfo();
  const overUnderInfo = getOverUnderInfo();

  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const isScheduled = game.status === 'scheduled';
  const notificationEnabled = isNotificationEnabled(game.id);

  // Scores take the stage once the game starts; only decided finals dim the loser.
  const awayScoreMuted = isScheduled || (isFinal && !awayWon && homeWon);
  const homeScoreMuted = isScheduled || (isFinal && !homeWon && awayWon);

  const chipTone = isLive ? styles.chipLive : isFinal ? styles.chipFinal : styles.chipScheduled;
  const chipTextTone = isLive
    ? styles.chipTextLive
    : isFinal
      ? styles.chipTextFinal
      : styles.chipTextScheduled;

  const spreadTone = isScheduled
    ? styles.oddsNeutral
    : isLive
      ? styles.oddsLive
      : styles.oddsFinal;
  const totalTone =
    !isScheduled && overUnderInfo.isOver
      ? styles.oddsLive
      : !isScheduled && !overUnderInfo.isOver
        ? styles.oddsUnder
        : styles.oddsNeutral;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        onPress
          ? `Show game details for ${game.away_team.abbreviation} at ${game.home_team.abbreviation}`
          : undefined
      }
      style={({ pressed }) => [
        styles.card,
        isLive && styles.cardLive,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.statusRow}>
        <View style={styles.bellSlot}>
          {showNotificationBell && (
            <TouchableOpacity
              onPress={handleBellPress}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={
                notificationEnabled
                  ? `Disable notifications for ${game.away_team.abbreviation} at ${game.home_team.abbreviation}`
                  : `Enable notifications for ${game.away_team.abbreviation} at ${game.home_team.abbreviation}`
              }
            >
              <Ionicons
                name={notificationEnabled ? 'notifications' : 'notifications-outline'}
                size={20}
                color={notificationEnabled ? colors.live : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.chipSlot}>
          <View style={[styles.chip, chipTone]}>
            {isLive && <LiveDot size={7} animate={!reduceMotion} />}
            <Text style={[type.chip, chipTextTone]}>{getStatusDisplay()}</Text>
          </View>
        </View>
        <Text style={[type.small, styles.dateLabel]}>{game.date_display}</Text>
      </View>

      <View style={styles.teamsContainer}>
        {/* Away Team */}
        <GameCardTeamRow
          teamWon={awayWon}
          abbr={game.away_team.abbreviation}
          score={game.away_team_score}
          logo={game.away_team.logo}
          ranking={game.away_team_ranking}
          muted={awayScoreMuted}
        />
        {/* Home Team */}
        <GameCardTeamRow
          teamWon={homeWon}
          abbr={game.home_team.abbreviation}
          score={game.home_team_score}
          logo={game.home_team.logo}
          ranking={game.home_team_ranking}
          muted={homeScoreMuted}
        />
      </View>

      {/* Betting Information */}
      {(game.spread !== undefined || game.total_points !== undefined) && (
        <View style={styles.bettingInfo}>
          {game.spread !== undefined && spreadInfo.spreadText && (
            <Text style={[type.odds, spreadTone]}>
              {spreadInfo.spreadText}
            </Text>
          )}
          {overUnderInfo.status && (
            <Text style={[type.odds, totalTone]}>
              {overUnderInfo.status}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cardLive: {
    borderColor: colors.live,
    borderWidth: 1.5,
    shadowColor: colors.live,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  cardPressed: {
    opacity: 0.85,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bellSlot: {
    minWidth: 24,
    alignItems: 'flex-start',
  },
  chipSlot: {
    flex: 1,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipScheduled: {
    backgroundColor: colors.surfaceElevated,
  },
  chipLive: {
    backgroundColor: colors.liveDim,
  },
  chipFinal: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipTextScheduled: {
    color: colors.textSecondary,
  },
  chipTextLive: {
    color: colors.liveBright,
  },
  chipTextFinal: {
    color: colors.textTertiary,
  },
  dateLabel: {
    minWidth: 24,
    textAlign: 'right',
    color: colors.textTertiary,
  },
  teamsContainer: {
    gap: spacing.xs,
  },
  bettingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  oddsNeutral: {
    color: colors.textSecondary,
  },
  oddsLive: {
    color: colors.live,
  },
  oddsFinal: {
    color: colors.odds,
  },
  oddsUnder: {
    color: colors.danger,
  },
});
