import { ThemedText } from '@/components/themed-text';
import React from 'react';
import { StyleSheet, View } from 'react-native';

type GameCardTeamRowProps = {
  teamWon: boolean,
  abbr: string,
  isCovering: boolean,
  score: number,
}

export const GameCardTeamRow = ({ teamWon, abbr, isCovering, score }: GameCardTeamRowProps) => {
  return (
    <View style={styles.teamContainer}>
      <View style={styles.teamInfo}>
        <View style={styles.teamNameContainer}>
          <ThemedText style={[styles.teamAbbr, teamWon ? styles.winnerText : styles.loserText]}>
            {abbr}
          </ThemedText>
        </View>
        <View style={styles.scoreContainer}>
          {isCovering && (
            <ThemedText style={styles.coveringCheck}>✓</ThemedText>
          )}
          <ThemedText style={[styles.score, teamWon ? styles.winnerText : styles.loserText]}>
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
  },
  teamAbbr: {
    fontSize: 18,
    fontWeight: 500,
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
    color: 'green',
    fontWeight: 'bold',
    marginRight: 6,
  },
  winnerText: {
    fontWeight: 800,
  },
  loserText: {
    color: 'grey'
  }
});