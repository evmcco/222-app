import { GameCard, GameData } from '@/components/game-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import espnGamesData from '@/data/games.json';
import React from 'react';
import { FlatList, StyleSheet } from 'react-native';

const games = espnGamesData as GameData[];

export default function HomeScreen() {
  const renderGameCard = ({ item }: { item: GameData }) => (
    <GameCard game={item} />
  );

  return (
    <ThemedView style={[styles.container, styles.darkContainer]}>
      <ThemedView style={[styles.header, styles.darkHeader]}>
        <ThemedText type="title" style={styles.lightText}>College Football</ThemedText>
        <ThemedText style={[styles.subtitle, styles.lightSubtitle]}>Game Scores & Covers</ThemedText>
      </ThemedView>

      <FlatList
        data={games}
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
  darkContainer: {
    backgroundColor: '#1a1a1a',
  },
  header: {
    marginBottom: 20,
    paddingTop: 16,
  },
  darkHeader: {
    backgroundColor: 'transparent',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
  },
  lightText: {
    color: '#ffffff',
  },
  lightSubtitle: {
    color: '#cccccc',
    opacity: 1,
  },
  gamesList: {
    paddingBottom: 20,
  },
});
