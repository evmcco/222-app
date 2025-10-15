import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Game } from '@/hooks/games';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GameCardTeamRow } from './game-card-team-row';


interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const getStatusDisplay = () => {
    if (game.status === 'scheduled') {
      return game.start_time;
    } else if (game.status === 'live') {
      return `${game.quarter} ${game.current_game_time}`;
    } else {
      return 'FINAL';
    }
  };

  const homeWon = game.home_team_score > game.away_team_score;
  const awayWon = game.away_team_score > game.home_team_score;

  // Calculate spread coverage
  const getSpreadInfo = () => {
    if (game.spread === undefined) {
      return { homeIsCovering: false, awayIsCovering: false, spreadText: '', favoredTeam: '' };
    }

    // Determine favored team and create spread text
    const isHomeFavored = game.spread < 0;
    const favoredTeam = isHomeFavored ? game.home_team.abbreviation : game.away_team.abbreviation;
    const spreadValue = Math.abs(game.spread);
    const spreadText = `${favoredTeam} -${spreadValue}`;

    if (game.status === 'scheduled') {
      return { homeIsCovering: false, awayIsCovering: false, spreadText, favoredTeam };
    }

    const scoreDifference = game.home_team_score - game.away_team_score;

    // Calculate if home team is covering
    let homeIsCovering;
    let awayIsCovering;
    if (isHomeFavored) {
      // Home team is favored, needs to win by more than the spread
      homeIsCovering = scoreDifference > spreadValue;
      awayIsCovering = scoreDifference < spreadValue
    } else {
      // Away team is favored, home team covers if they lose by less than spread or win
      homeIsCovering = scoreDifference > -spreadValue;
      awayIsCovering = scoreDifference < -spreadValue
    }

    return {
      homeIsCovering,
      awayIsCovering,
      spreadText,
      favoredTeam
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
        status: currentTotal > game.total_points ? `O ${game.total_points} TOT ${currentTotal}` : `U ${game.total_points} TOT ${currentTotal}`,
        isOver: currentTotal > game.total_points
      };
    }
  };

  const spreadInfo = getSpreadInfo();
  const overUnderInfo = getOverUnderInfo();

  return (
    <ThemedView style={[styles.container, styles.darkCard, { borderColor: '#333333' }]}>
      {/* Game Status */}
      <View style={styles.statusContainer}>
        <ThemedText style={[styles.statusText, styles.lightText]}>
          {game.date_display}
        </ThemedText>
        <ThemedText style={[styles.statusText, styles.lightText]}>
          {getStatusDisplay()}
        </ThemedText>
      </View>
      <View style={styles.teamsContainer}>
        {/* Away Team */}
        <GameCardTeamRow
          teamWon={awayWon}
          abbr={game.away_team.abbreviation}
          isCovering={spreadInfo.awayIsCovering}
          score={game.away_team_score}
          logo={game.away_team.logo}
          ranking={game.away_team_ranking}
        />
        {/* Home Team */}
        <GameCardTeamRow
          teamWon={homeWon}
          abbr={game.home_team.abbreviation}
          isCovering={spreadInfo.homeIsCovering}
          score={game.home_team_score}
          logo={game.home_team.logo}
          ranking={game.home_team_ranking}
        />
      </View>

      {/* Betting Information */}
      {(game.spread !== undefined || game.total_points !== undefined) && (
        <View style={[styles.bettingInfo, { borderTopColor: '#333333' }]}>
          {game.spread !== undefined && spreadInfo.spreadText && (
            <ThemedText style={[styles.bettingText, styles.lightText]}>
              {spreadInfo.spreadText}
            </ThemedText>
          )}
          {overUnderInfo.status && (
            <ThemedText style={[
              styles.bettingText,
              { color: game.status !== 'scheduled' && overUnderInfo.isOver ? '#22c55e' : game.status !== 'scheduled' && !overUnderInfo.isOver ? '#ef4444' : '#cccccc' }
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
    justifyContent: 'center',
    marginBottom: 6,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  lightText: {
    color: '#ffffff',
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