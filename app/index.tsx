import { GameCard } from '@/components/game-card';
import { ThemedView } from '@/components/themed-view';
import { Game, useGames } from '@/hooks/games';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

// const games = espnGamesData as GameData[];

export default function HomeScreen() {
  const { games, loading, refetch } = useGames()
  const [showSpinner, setShowSpinner] = useState(false)

  useEffect(() => {
    if (loading) {
      setShowSpinner(true)
    } else if (showSpinner) {
      const timer = setTimeout(() => {
        setShowSpinner(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [loading, showSpinner])

  const renderGameCard = ({ item }: { item: Game }) => (
    <GameCard game={item} />
  );

  return (
    <ThemedView style={[styles.container, styles.darkContainer]}>
      {/* <ThemedView style={[styles.header, styles.darkHeader]}>
        <Image source={require('../assets/images/222-transparent.png')} style={styles.logo} />
      </ThemedView> */}

      {showSpinner && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#ffffff" />
        </View>
      )}

      <FlatList
        data={games}
        renderItem={renderGameCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.gamesList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor="#ffffff"
            colors={["#ffffff"]}
          />
        }
        ListHeaderComponent={
          <ThemedView style={[styles.header, styles.darkHeader]}>
            <Image source={require('../assets/images/222-transparent.png')} style={styles.logo} />
          </ThemedView>}
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
    paddingBottom: 30,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.8,
  },
  logo: {
    width: 100,
    height: 60,
  },
});
