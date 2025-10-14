import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface GameData {
  id: string;
  homeTeam: {
    name: string;
    abbreviation: string;
    score: number;
    color: string;
  };
  awayTeam: {
    name: string;
    abbreviation: string;
    score: number;
    color: string;
  };
  status: 'scheduled' | 'live' | 'final';
  time: string;
  quarter?: string;
  spread?: number;
  totalPoints?: number;
}

interface GameCardProps {
  game: GameData;
}

export function GameCard({ game }: GameCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getStatusDisplay = () => {
    if (game.status === 'scheduled') {
      return game.time;
    } else if (game.status === 'live') {
      return `${game.quarter} " ${game.time}`;
    } else {
      return 'FINAL';
    }
  };

  const isGameComplete = game.status === 'final';
  const homeWon = isGameComplete && game.homeTeam.score > game.awayTeam.score;
  const awayWon = isGameComplete && game.awayTeam.score > game.homeTeam.score;

  return (
    <ThemedView style={[styles.container, { borderColor: colors.icon }]}>
      {/* Game Status */}
      <View style={styles.statusContainer}>
        <ThemedText style={[styles.statusText, { color: colors.icon }]}>
          {getStatusDisplay()}
        </ThemedText>
        {game.status === 'live' && (
          <View style={[styles.liveIndicator, { backgroundColor: '#ff4444' }]} />
        )}
      </View>

      {/* Away Team */}
      <View style={styles.teamContainer}>
        <View style={styles.teamInfo}>
          <View style={styles.teamNameContainer}>
            <ThemedText style={[styles.teamAbbr, awayWon && styles.winnerText]}>
              {game.awayTeam.abbreviation}
            </ThemedText>
            <ThemedText style={[styles.teamName, { color: colors.icon }]}>
              {game.awayTeam.name}
            </ThemedText>
          </View>
          <ThemedText style={[styles.score, awayWon && styles.winnerText]}>
            {game.awayTeam.score}
          </ThemedText>
        </View>
      </View>

      {/* Home Team */}
      <View style={styles.teamContainer}>
        <View style={styles.teamInfo}>
          <View style={styles.teamNameContainer}>
            <ThemedText style={[styles.teamAbbr, homeWon && styles.winnerText]}>
              {game.homeTeam.abbreviation}
            </ThemedText>
            <ThemedText style={[styles.teamName, { color: colors.icon }]}>
              {game.homeTeam.name}
            </ThemedText>
          </View>
          <ThemedText style={[styles.score, homeWon && styles.winnerText]}>
            {game.homeTeam.score}
          </ThemedText>
        </View>
      </View>

      {/* Betting Information */}
      {(game.spread !== undefined || game.totalPoints !== undefined) && (
        <View style={[styles.bettingInfo, { borderTopColor: colors.icon }]}>
          {game.spread !== undefined && (
            <ThemedText style={[styles.bettingText, { color: colors.icon }]}>
              Spread: {game.spread > 0 ? '+' : ''}{game.spread}
            </ThemedText>
          )}
          {game.totalPoints !== undefined && (
            <ThemedText style={[styles.bettingText, { color: colors.icon }]}>
              O/U: {game.totalPoints}
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
    padding: 16,
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teamContainer: {
    marginBottom: 8,
  },
  teamInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamNameContainer: {
    flex: 1,
  },
  teamAbbr: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  teamName: {
    fontSize: 14,
    marginTop: 2,
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'right',
  },
  winnerText: {
    fontWeight: '800',
  },
  bettingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  bettingText: {
    fontSize: 12,
    fontWeight: '500',
  },
});