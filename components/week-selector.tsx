import { colors, radius, spacing, type } from '@/constants/theme';
import type { WeekInfo } from '@/hooks/use-season-games';
import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type WeekSelectorProps = {
  weeks: WeekInfo[];
  /** Selected week number; null while the week index loads. */
  selected: number | null;
  /** The week containing today — marked with an accent dot. */
  currentWeek: number | null;
  onSelect: (week: number) => void;
};

/** Horizontal week navigator; keeps the selected chip scrolled into view. */
export function WeekSelector({ weeks, selected, currentWeek, onSelect }: WeekSelectorProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const chipPositions = useRef(new Map<number, { x: number; width: number }>());

  useEffect(() => {
    if (selected === null) return;
    const chip = chipPositions.current.get(selected);
    if (chip) {
      scrollRef.current?.scrollTo({ x: Math.max(0, chip.x - spacing.lg), animated: true });
    }
  }, [selected]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {weeks.map((week) => {
        const isSelected = week.weekNumber === selected;
        const isCurrent = week.weekNumber === currentWeek;
        return (
          <Pressable
            key={week.weekNumber}
            onPress={() => onSelect(week.weekNumber)}
            onLayout={(event) => {
              chipPositions.current.set(week.weekNumber, {
                x: event.nativeEvent.layout.x,
                width: event.nativeEvent.layout.width,
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Show week ${week.weekNumber} games`}
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [
              styles.chip,
              isCurrent && styles.chipCurrent,
              isSelected && styles.chipSelected,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={[type.chip, styles.chipText, isSelected && styles.chipTextSelected]}>
              WK {week.weekNumber}
            </Text>
            {isCurrent && !isSelected && <View style={styles.currentDot} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
  },
  chipCurrent: {
    borderColor: colors.border,
  },
  chipSelected: {
    borderColor: colors.live,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.live,
  },
  currentDot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.live,
  },
});
