import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius } from '@/constants/theme';

type LiveDotProps = {
  size?: number;
  animate?: boolean;
};

/**
 * Pulsing live indicator. Set `animate` to false (e.g. under reduce-motion)
 * for a steady dot.
 */
export function LiveDot({ size = 8, animate = true }: LiveDotProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!animate) return undefined;

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 750, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }),
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
    <Animated.View
      style={[styles.dot, { width: size, height: size }, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    borderRadius: radius.pill,
    backgroundColor: colors.liveBright,
  },
});
