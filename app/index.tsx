import { GameCard, GameData } from '@/components/game-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React from 'react';
import { FlatList, StyleSheet } from 'react-native';

const dummyGames: GameData[] = [
  // Final Games
  {
    id: '1',
    homeTeam: {
      name: 'Georgia Bulldogs',
      abbreviation: 'UGA',
      score: 21,
      color: '#BA0C2F',
    },
    awayTeam: {
      name: 'Alabama Crimson Tide',
      abbreviation: 'ALA',
      score: 20,
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
      name: 'Notre Dame Fighting Irish',
      abbreviation: 'ND',
      score: 127,
      color: '#0C2340',
    },
    awayTeam: {
      name: 'USC Trojans',
      abbreviation: 'USC',
      score: 28,
      color: '#990000',
    },
    status: 'final',
    time: 'Final',
    spread: 30.5,
    totalPoints: 48.5,
  },
  {
    id: '3',
    homeTeam: {
      name: 'Penn State Nittany Lions',
      abbreviation: 'PSU',
      score: 35,
      color: '#041E42',
    },
    awayTeam: {
      name: 'Wisconsin Badgers',
      abbreviation: 'WIS',
      score: 14,
      color: '#C5050C',
    },
    status: 'final',
    time: 'Final',
    spread: -10.5,
    totalPoints: 44.5,
  },

  // Live Games
  {
    id: '4',
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
    id: '5',
    homeTeam: {
      name: 'LSU Tigers',
      abbreviation: 'LSU',
      score: 31,
      color: '#461D7C',
    },
    awayTeam: {
      name: 'Florida Gators',
      abbreviation: 'FLA',
      score: 27,
      color: '#0021A5',
    },
    status: 'live',
    time: '12:15',
    quarter: '2nd',
    spread: -4.5,
    totalPoints: 51.0,
  },
  {
    id: '6',
    homeTeam: {
      name: 'Oregon Ducks',
      abbreviation: 'ORE',
      score: 7,
      color: '#154733',
    },
    awayTeam: {
      name: 'Washington Huskies',
      abbreviation: 'WASH',
      score: 10,
      color: '#4B2E83',
    },
    status: 'live',
    time: '3:22',
    quarter: '1st',
    spread: -3.5,
    totalPoints: 56.5,
  },

  // Scheduled Games
  {
    id: '7',
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
  {
    id: '8',
    homeTeam: {
      name: 'Clemson Tigers',
      abbreviation: 'CLEM',
      score: 0,
      color: '#F56600',
    },
    awayTeam: {
      name: 'Miami Hurricanes',
      abbreviation: 'MIA',
      score: 0,
      color: '#F47321',
    },
    status: 'scheduled',
    time: '7:00 PM EST',
    spread: -3.0,
    totalPoints: 45.0,
  },
  {
    id: '9',
    homeTeam: {
      name: 'Auburn Tigers',
      abbreviation: 'AUB',
      score: 0,
      color: '#0C2340',
    },
    awayTeam: {
      name: 'Tennessee Volunteers',
      abbreviation: 'TENN',
      score: 0,
      color: '#FF8200',
    },
    status: 'scheduled',
    time: '8:00 PM EST',
    spread: 1.5,
    totalPoints: 52.0,
  },
];

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
