import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GameCardTeamRow } from './game-card-team-row';

export interface GameData {
  id: string;
  homeTeam: {
    name: string;
    abbreviation: string;
    score: number;
    logo?: string;
    ranking?: number | null;
  };
  awayTeam: {
    name: string;
    abbreviation: string;
    score: number;
    logo?: string;
    ranking?: number | null;
  };
  status: 'scheduled' | 'live' | 'final';
  date: string;
  startTime: string;
  currentGameTime?: string;
  quarter?: string;
  spread?: number;
  moneyLineHome?: number;
  moneyLineAway?: number;
  totalPoints?: number;
}

interface GameCardProps {
  game: GameData;
}

export function GameCard({ game }: GameCardProps) {
  const getStatusDisplay = () => {
    if (game.status === 'scheduled') {
      return game.startTime;
    } else if (game.status === 'live') {
      return `${game.quarter} ${game.currentGameTime}`;
    } else {
      return 'FINAL';
    }
  };

  const homeWon = game.homeTeam.score > game.awayTeam.score;
  const awayWon = game.awayTeam.score > game.homeTeam.score;

  // Calculate spread coverage
  const getSpreadInfo = () => {
    if (game.spread === undefined) {
      return { homeIsCovering: false, awayIsCovering: false, spreadText: '', favoredTeam: '' };
    }

    // Determine favored team and create spread text
    const isHomeFavored = game.spread < 0;
    const favoredTeam = isHomeFavored ? game.homeTeam.abbreviation : game.awayTeam.abbreviation;
    const spreadValue = Math.abs(game.spread);
    const spreadText = `${favoredTeam} -${spreadValue}`;

    if (game.status === 'scheduled') {
      return { homeIsCovering: false, awayIsCovering: false, spreadText, favoredTeam };
    }

    const scoreDifference = game.homeTeam.score - game.awayTeam.score;

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
    if (game.totalPoints === undefined) return { status: '', isOver: false };

    const currentTotal = game.homeTeam.score + game.awayTeam.score;

    if (game.status === 'scheduled') {
      return { status: `O/U ${game.totalPoints}`, isOver: false };
    } else if (game.status === 'live') {
      return {
        status: `O/U ${game.totalPoints} TOT ${currentTotal}`,
        isOver: currentTotal > game.totalPoints
      };
    } else {
      return {
        status: currentTotal > game.totalPoints ? `O ${game.totalPoints} TOT ${currentTotal}` : `U ${game.totalPoints} TOT ${currentTotal}`,
        isOver: currentTotal > game.totalPoints
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
          {game.date}
        </ThemedText>
        <ThemedText style={[styles.statusText, styles.lightText]}>
          {getStatusDisplay()}
        </ThemedText>
      </View>
      <View style={styles.teamsContainer}>
        {/* Away Team */}
        <GameCardTeamRow 
          teamWon={awayWon} 
          abbr={game.awayTeam.abbreviation} 
          isCovering={spreadInfo.awayIsCovering} 
          score={game.awayTeam.score}
          logo={game.awayTeam.logo}
          ranking={game.awayTeam.ranking}
        />
        {/* Home Team */}
        <GameCardTeamRow 
          teamWon={homeWon} 
          abbr={game.homeTeam.abbreviation} 
          isCovering={spreadInfo.homeIsCovering} 
          score={game.homeTeam.score}
          logo={game.homeTeam.logo}
          ranking={game.homeTeam.ranking}
        />
      </View>

      {/* Betting Information */}
      {(game.spread !== undefined || game.totalPoints !== undefined) && (
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