import { weekAfterSwipe } from '@/lib/week-navigation';
import React, { useMemo } from 'react';
import { PanResponder, View } from 'react-native';

export function WeekSwipeArea({ week, weeks, onChange, children }: {
  week: number | null;
  weeks: number[];
  onChange: (week: number) => void;
  children: React.ReactNode;
}) {
  const gestures = useMemo(() => PanResponder.create({
    // Leave taps, pull-to-refresh and vertical scrolling with the game list.
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderRelease: (_, gesture) => {
      const next = weekAfterSwipe(weeks, week, gesture.dx, gesture.dy);
      if (next !== null) onChange(next);
    },
  }), [weeks, week, onChange]);

  return <View style={{ flex: 1 }} {...gestures.panHandlers}>{children}</View>;
}
