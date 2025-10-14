import { GameCard, GameData } from '@/components/game-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React from 'react';
import { FlatList, StyleSheet } from 'react-native';

const dummyGames: GameData[] = [
  {
    id: '1',
    homeTeam: {
      name: 'Georgia Bulldogs',
      abbreviation: 'UGA',
      score: 31,
      color: '#BA0C2F',
    },
    awayTeam: {
      name: 'Alabama Crimson Tide',
      abbreviation: 'ALA',
      score: 24,
      color: '#9E1B32',
    },
    status: 'final',
    time: 'Final',
    spread: -3.5,
    totalPoints: 52.5,
  },
  {
    id: '2',
    homeTeam: {
      name: 'Michigan Wolverines',
      abbreviation: 'MICH',
      score: 14,
      color: '#00274C',
    },
    awayTeam: {
      name: 'Ohio State Buckeyes',
      abbreviation: 'OSU',
      score: 21,
      color: '#BB0000',
    },
    status: 'live',
    time: '8:42',
    quarter: '3rd',
    spread: 2.5,
    totalPoints: 47.5,
  },
  {
    id: '3',
    homeTeam: {
      name: 'Texas Longhorns',
      abbreviation: 'TEX',
      score: 0,
      color: '#BF5700',
    },
    awayTeam: {
      name: 'Oklahoma Sooners',
      abbreviation: 'OU',
      score: 0,
      color: '#841617',
    },
    status: 'scheduled',
    time: '3:30 PM EST',
    spread: -7.0,
    totalPoints: 58.5,
  },
];

export default function HomeScreen() {
  const renderGameCard = ({ item }: { item: GameData }) => (
    <GameCard game={item} />
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">College Football</ThemedText>
        <ThemedText style={styles.subtitle}>Game Scores & Covers</ThemedText>
      </ThemedView>

      <FlatList
        data={dummyGames}
        renderItem={renderGameCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.gamesList}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 64,
  },
  header: {
    marginBottom: 20,
    paddingTop: 16,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
  },
  gamesList: {
    paddingBottom: 20,
  },
});
