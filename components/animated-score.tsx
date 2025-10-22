import { ThemedText } from '@/components/themed-text';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type AnimatedScoreProps = {
  score: number;
  teamWon: boolean;
  style?: any;
};

export const AnimatedScore = ({ score, teamWon, style }: AnimatedScoreProps) => {
  const [previousScore, setPreviousScore] = useState(score);
  const [displayScore, setDisplayScore] = useState(score);
  const scale = useSharedValue(1);
  const arrowOpacity = useSharedValue(0);
  const arrowBounce = useSharedValue(0);

  useEffect(() => {
    if (previousScore !== score && previousScore !== undefined) {
      if (score > previousScore) {
        // Scale animation for score change
        scale.value = withSequence(
          withTiming(1.2, { duration: 150 }),
          withTiming(1, { duration: 150 })
        );

        // Show and animate the up arrow
        arrowOpacity.value = withTiming(1, { duration: 200 });
        arrowBounce.value = withRepeat(
          withSequence(
            withTiming(-3, { duration: 300 }),
            withTiming(0, { duration: 300 })
          ),
          3, // Bounce 3 times
          false
        );

        // Faster scoreboard-style incrementing
        const difference = score - previousScore;
        const steps = Math.min(Math.abs(difference), 6); // Max 6 steps for faster animation
        const stepValue = difference / steps;

        let currentStep = 0;
        const incrementTimer = setInterval(() => {
          currentStep++;
          if (currentStep <= steps) {
            const newValue = previousScore + Math.round(stepValue * currentStep);
            setDisplayScore(newValue);
          }

          if (currentStep >= steps) {
            clearInterval(incrementTimer);
            setDisplayScore(score); // Ensure final value is exact

            // Hide arrow after animation completes
            setTimeout(() => {
              arrowOpacity.value = withTiming(0, { duration: 300 });
            }, 500);
          }
        }, 80); // 80ms between increments for faster feel
      } else {
        // For decreases (including reset to 0), just update immediately - no animation
        setDisplayScore(score);
      }

      setPreviousScore(score);
    } else if (previousScore === undefined) {
      setDisplayScore(score);
      setPreviousScore(score);
    }
  }, [arrowBounce, arrowOpacity, previousScore, scale, score]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const arrowStyle = useAnimatedStyle(() => {
    return {
      opacity: arrowOpacity.value,
      transform: [{ translateY: arrowBounce.value }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[arrowStyle, styles.arrowContainer]}>
        <ThemedText style={styles.arrow}>↑</ThemedText>
      </Animated.View>
      <Animated.View style={[animatedStyle]}>
        <ThemedText style={[styles.score, styles.lightText, teamWon && styles.winnerText, style]}>
          {displayScore}
        </ThemedText>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  arrowContainer: {
    marginRight: 4,
  },
  arrow: {
    fontSize: 16,
    color: '#22c55e', // Green color
    fontWeight: 'bold',
  },
  score: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'right',
    padding: 2,
    minWidth: 25,
  },
  lightText: {
    color: '#ffffff',
  },
  winnerText: {
    fontWeight: '800',
  },
});