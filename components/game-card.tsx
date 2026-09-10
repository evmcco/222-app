import { LiveDot } from '@/components/live-dot';
import { GameNarrative } from '@/components/game-narrative';
import { colors, radius, spacing, type } from '@/constants/theme';
import { Game } from '@/hooks/games';
import type { GameNarrative as Narrative } from '@/hooks/narratives';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GameCardTeamRow } from './game-card-team-row';


interface GameCardProps {
  game: Game;
  narrative?: Narrative;
  /** Opens the game-info drawer; omit for a non-interactive card. */
  onPress?: () => void;
}

export function GameCard({ game, narrative, onPress }: GameCardProps) {
  const reduceMotion = useReduceMotion();

  const getStatusDisplay = () => {
    if (game.interruption) return game.interruption;
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

  const homeWon = game.home_team_score > game.away_team_score;
  const awayWon = game.away_team_score > game.home_team_score;

  // Calculate spread coverage
  const getSpreadInfo = () => {
    if (game.spread == null) {
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
        : `${coveringTeam}${game.status === 'live' ? ' COVERING' : ''} ${(favoredTeam === coveringTeam ? '-' : '+')}${spreadValue}`;


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
    if (game.total_points == null) return { status: '', isOver: false };

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
        status: currentTotal === game.total_points
          ? `PUSH ${game.total_points} | TOT ${currentTotal}`
          : `${currentTotal > game.total_points ? 'O' : 'U'} ${game.total_points} | TOT ${currentTotal}`,
        isOver: currentTotal > game.total_points
      };
    }
  };

  const spreadInfo = getSpreadInfo();
  const overUnderInfo = getOverUnderInfo();

  const isLive = game.status === 'live' && !game.interruption;
  const isFinal = game.status === 'final';
  const isScheduled = game.status === 'scheduled';
  const showBettingInfo = game.spread != null || game.total_points != null;

  // Scores take the stage once the game starts; only decided finals dim the loser.
  const awayScoreMuted = isScheduled || (isFinal && !awayWon && homeWon);
  const homeScoreMuted = isScheduled || (isFinal && !homeWon && awayWon);

  const chipTone = game.interruption ? styles.chipDelayed : isLive ? styles.chipLive : isFinal ? styles.chipFinal : styles.chipScheduled;
  const chipTextTone = game.interruption ? styles.chipTextDelayed : isLive
    ? styles.chipTextLive
    : isFinal
      ? styles.chipTextFinal
      : styles.chipTextScheduled;

  const spreadTone = isFinal ? styles.oddsFinal : styles.oddsNeutral;
  const isLateGame = isFinal || (isLive && (
    game.quarter === '4th' || /OT$/i.test(game.quarter ?? '')
  ));
  const currentTotal = game.home_team_score + game.away_team_score;
  // A total exactly on the line is a push, so neither direction applies.
  const showTotalArrow = isLateGame && game.total_points != null && currentTotal !== game.total_points;

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
        <View style={styles.chipSlot}>
          <View style={[styles.chip, chipTone]}>
            {isLive && <LiveDot size={7} animate={!reduceMotion} />}
            <Text style={[type.chip, chipTextTone]}>{getStatusDisplay()}</Text>
          </View>
        </View>
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

      {narrative && (
        <>
          <View style={styles.divider} />
          <GameNarrative narrative={narrative} compact />
        </>
      )}

      {/* Betting Information */}
      {showBettingInfo && (
        <>
          <View style={styles.divider} />
          <View style={styles.bettingInfo}>
            {game.spread != null && spreadInfo.spreadText && (
              <Text style={[type.odds, spreadTone]}>
                {spreadInfo.spreadText}
              </Text>
            )}
            {overUnderInfo.status && (
              <Text style={[type.odds, styles.oddsNeutral]}>
                {overUnderInfo.status}
                {showTotalArrow && (
                  <Text
                    style={overUnderInfo.isOver ? styles.oddsLive : styles.oddsUnder}
                    accessibilityLabel={overUnderInfo.isOver ? 'Over' : 'Under'}
                  >
                    {overUnderInfo.isOver ? ' ↑' : ' ↓'}
                  </Text>
                )}
              </Text>
            )}
          </View>
        </>
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
  chipDelayed: { backgroundColor: colors.oddsDim },
  chipTextDelayed: { color: colors.odds },
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
  teamsContainer: {
    gap: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.sm,
  },
  bettingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
    rowGap: spacing.xs,
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
