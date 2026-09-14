import { colors, spacing, type } from '@/constants/theme';
import type { GameNarrative as Narrative } from '@/hooks/narratives';
import { StyleSheet, Text, View } from 'react-native';

interface GameNarrativeProps {
  narrative?: Narrative;
  headline?: string;
  compact?: boolean;
}

export function GameNarrative({ narrative, headline, compact = false }: GameNarrativeProps) {
  if (compact) {
    return (
      <Text selectable style={[type.body, styles.cardHeadline]} numberOfLines={2}>
        {headline ?? narrative?.headline}
      </Text>
    );
  }

  if (!narrative) return null;

  return (
    <View style={styles.drawerNarrative}>
      <Text style={[type.small, { color: colors.textSecondary }]}>Quarter End Summary · {narrative.period <= 4 ? `Q${narrative.period}` : `OT${narrative.period - 4}`}{narrative.is_final ? ' · Final' : ''}</Text>
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
