import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '@/constants/theme';

type SkeletonCardProps = {
  animate?: boolean;
};

/**
 * Breathing placeholder shaped like a game card, shown while scores load.
 */
export function SkeletonCard({ animate = true }: SkeletonCardProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!animate) return undefined;

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );

    return () => {
      opacity.value = 1;
    };
  }, [animate, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <View style={styles.statusPill} />
      {[0, 1].map((row) => (
        <View key={row} style={styles.teamRow}>
          <View style={styles.logo} />
          <View style={[styles.bar, styles.nameBar]} />
          <View style={styles.scoreBar} />
        </View>
      ))}
      <View style={styles.footerBar} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  statusPill: {
    width: 132,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    alignSelf: 'center',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  bar: {
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  nameBar: {
    flex: 1,
  },
  scoreBar: {
    width: 56,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  footerBar: {
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    marginTop: spacing.xs,
  },
});
