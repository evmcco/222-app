import { colors, spacing, type } from '@/constants/theme';
import type { GameNarrative as Narrative } from '@/hooks/narratives';
import { StyleSheet, Text, View } from 'react-native';

interface GameNarrativeProps {
  narrative: Narrative;
  compact?: boolean;
}

export function GameNarrative({ narrative, compact = false }: GameNarrativeProps) {
  if (compact) {
    return (
      <Text selectable style={[type.body, styles.cardHeadline]} numberOfLines={2}>
        {narrative.headline}
      </Text>
    );
  }

  return (
    <View style={styles.drawerNarrative}>
      <Text selectable style={[type.headline, styles.drawerHeadline]}>
        {narrative.headline}
      </Text>
      <Text selectable style={[type.body, styles.drawerDetail]}>
        {narrative.detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeadline: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  drawerNarrative: {
    gap: spacing.sm,
  },
  drawerHeadline: {
    color: colors.textPrimary,
  },
  drawerDetail: {
    color: colors.textSecondary,
  },
});
