import { ThemedText } from '@/components/themed-text';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';

type GameCardTeamRowProps = {
  teamWon: boolean,
  abbr: string,
  score: number,
  logo?: string,
  ranking?: number | null,
}

export const GameCardTeamRow = ({ teamWon, abbr, score, logo, ranking }: GameCardTeamRowProps) => {
  return (
    <View style={styles.teamContainer}>
      <View style={styles.teamInfo}>
        <View style={styles.teamNameContainer}>
          {logo && (
            <Image
              source={{ uri: logo }}
              style={styles.logo}
              contentFit="contain"
            />
          )}
          {ranking && ranking <= 25 && (
            <ThemedText style={[styles.ranking, styles.lightText]}>
              {ranking}
            </ThemedText>
          )}
          <ThemedText style={[styles.teamAbbr, styles.lightText]}>
            {abbr}
          </ThemedText>
        </View>
        <View style={styles.scoreContainer}>
          <ThemedText style={[styles.score, styles.lightText, teamWon && styles.winnerText]}>
            {score}
          </ThemedText>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  teamContainer: {
    paddingVertical: 4,
  },
  teamInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 24,
    height: 24,
  },
  ranking: {
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: '#666666',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    textAlign: 'center',
  },
  teamAbbr: {
    fontSize: 18,
    fontWeight: 500,
  },
  lightText: {
    color: '#ffffff',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 50,
    justifyContent: 'flex-end',
  },
  score: {
    fontSize: 18,
    fontWeight: 500,
    textAlign: 'right',
    padding: 2,
    minWidth: 25,
  },
  coveringCheck: {
    fontSize: 18,
    color: '#22c55e',
    fontWeight: 'bold',
    marginRight: 6,
  },
  winnerText: {
    fontWeight: 800,
  },
});