import { AnimatedScore } from '@/components/animated-score';
import { colors, radius, spacing, type } from '@/constants/theme';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type GameCardTeamRowProps = {
  teamWon: boolean;
  abbr: string;
  score: number;
  logo?: string;
  ranking?: number | null;
  muted?: boolean;
};

export const GameCardTeamRow = ({
  teamWon,
  abbr,
  score,
  logo,
  ranking,
  muted = false,
}: GameCardTeamRowProps) => {
  return (
    <View style={styles.teamContainer}>
      <View style={styles.teamInfo}>
        <View style={styles.teamNameContainer}>
          {logo && (
            <Image source={{ uri: logo }} style={styles.logo} contentFit="contain" />
          )}
          {ranking && ranking <= 25 && (
            <View style={styles.ranking}>
              <Text style={[type.chip, styles.rankingText]}>{ranking}</Text>
            </View>
          )}
          <Text style={[type.teamAbbr, styles.teamAbbr]}>{abbr}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <AnimatedScore score={score} teamWon={teamWon} muted={muted} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  teamContainer: {
    paddingVertical: spacing.xs,
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
    gap: spacing.sm,
  },
  logo: {
    width: 28,
    height: 28,
  },
  ranking: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 26,
    alignItems: 'center',
  },
  rankingText: {
    color: colors.textSecondary,
    textTransform: 'none',
  },
  teamAbbr: {
    color: colors.textPrimary,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 56,
    justifyContent: 'flex-end',
  },
});
