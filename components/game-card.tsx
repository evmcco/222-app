import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Game } from '@/hooks/games';
import { useGameNotifications } from '@/hooks/use-game-notifications';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { GameCardTeamRow } from './game-card-team-row';


interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const { isNotificationEnabled, toggleNotification } = useGameNotifications();
  const { enableGameNotification, disableGameNotification, loading } = usePushNotifications();

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

  return (
    <ThemedView style={[styles.container, styles.darkCard, { borderColor: '#333333' }]}>
      <View style={styles.statusContainer}>
        <View style={styles.statusLeftContainer}>
          {showNotificationBell && (
            <TouchableOpacity
              onPress={handleBellPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isNotificationEnabled(game.id) ? 'notifications' : 'notifications-outline'}
                size={18}
                color={isNotificationEnabled(game.id) ? '#fbbf24' : '#ffffff'}
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.statusCenterContainer}>
          <ThemedText style={[styles.statusText, styles.lightText]}>
            {game.date_display}
          </ThemedText>
          <ThemedText style={[styles.statusText, styles.lightText]}>
            {getStatusDisplay()}
          </ThemedText>
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
        />
        {/* Home Team */}
        <GameCardTeamRow
          teamWon={homeWon}
          abbr={game.home_team.abbreviation}
          score={game.home_team_score}
          logo={game.home_team.logo}
          ranking={game.home_team_ranking}
        />
      </View>

      {/* Betting Information */}
      {(game.spread !== undefined || game.total_points !== undefined) && (
        <View style={[styles.bettingInfo, { borderTopColor: '#333333' }]}>
          {game.spread !== undefined && spreadInfo.spreadText && (
            <ThemedText style={[styles.bettingText, game.status === 'scheduled' ? styles.lightText : game.status === 'live' ? styles.greenText : styles.yellowText]}>
              {spreadInfo.spreadText}
            </ThemedText>
          )}
          {overUnderInfo.status && (
            <ThemedText style={[
              styles.bettingText,
              game.status !== 'scheduled' && overUnderInfo.isOver ? styles.greenText : game.status !== 'scheduled' && !overUnderInfo.isOver ? styles.redText : styles.lightText
            ]}>
              {overUnderInfo.status}
            </ThemedText>
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  darkCard: {
    backgroundColor: '#2a2a2a',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
    marginBottom: 6,
    position: 'relative',
    // borderColor: 'white',
    // borderWidth: 1,
    // borderStyle: 'solid',
  },
  statusLeftContainer: {
    marginRight: 'auto',
  },
  statusRightContainer: {
    marginLeft: 'auto',
  },
  statusCenterContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  lightText: {
    color: '#ffffff',
  },
  greenText: {
    color: '#22c55e',
  },
  redText: {
    color: '#ef4444'
  },
  yellowText: {
    color: '#c39a33'
  },
  teamsContainer: {
    gap: 6,
  },
  bettingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginTop: 6,
    borderTopWidth: 1,
  },
  bettingText: {
    fontSize: 12,
    fontWeight: '500',
  },
});