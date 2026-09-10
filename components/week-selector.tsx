import { colors, spacing, type } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

const WEEK_WIDTH = 88;
const WEEK_STEP = WEEK_WIDTH + spacing.sm;

interface WeekSelectorProps {
  week: number | null;
  weeks: number[];
  onChange: (week: number) => void;
}

export function WeekSelector({ week, weeks, onChange }: WeekSelectorProps) {
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const reduceMotion = useReduceMotion();
  const positioned = useRef(false);
  const index = weeks.indexOf(week ?? -1);

  useEffect(() => {
    if (!width || index < 0) return;
    scroll.current?.scrollTo({ x: index * WEEK_STEP, animated: positioned.current && !reduceMotion });
    positioned.current = true;
  }, [index, width, reduceMotion]);

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel="Choose a football week"
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
      onContentSizeChange={() => {
        if (width && index >= 0) scroll.current?.scrollTo({ x: index * WEEK_STEP, animated: false });
      }}
      style={styles.strip}
      contentContainerStyle={[styles.content, { paddingRight: Math.max(spacing.lg, width - WEEK_WIDTH - spacing.lg) }]}
    >
      {week === null && <Text style={[type.body, styles.loading]}>Loading weeks…</Text>}
      {weeks.map(value => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityLabel={`Week ${value}`}
          accessibilityState={{ selected: value === week }}
          onPress={() => onChange(value)}
          style={({ pressed }) => [styles.week, value === week && styles.selected, pressed && styles.pressed]}
        >
          <Text style={[type.body, styles.label, value === week && styles.selectedLabel]}>Week {value}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { flexGrow: 0, flexShrink: 0 },
  content: { paddingLeft: spacing.lg, paddingVertical: spacing.xs, gap: spacing.sm, alignItems: 'center' },
  week: { width: WEEK_WIDTH, minHeight: 24, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'transparent' },
  selected: { borderColor: colors.live },
  label: { color: colors.textSecondary, fontWeight: '600' },
  selectedLabel: { color: colors.liveBright },
  loading: { minHeight: 24, color: colors.textSecondary },
  pressed: { opacity: 0.7 },
});
