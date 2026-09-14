import { colors, radius, spacing, type } from '@/constants/theme';
import { filterOptions, type GameFilter } from '@/lib/game-filters';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function GameFilterDropdown({ value, onChange, disabled }: { value: GameFilter; onChange: (value: GameFilter) => void; disabled?: boolean }) {
  const [anchorBottom, setAnchorBottom] = useState<number | null>(null);
  const anchor = useRef<View>(null);
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const selected = filterOptions.find(option => option.value === value)!;
  const close = () => setAnchorBottom(null);
  return (
    <>
      <Pressable ref={anchor} disabled={disabled} accessibilityRole="button"
        accessibilityLabel={`Filter games: ${selected.label}`} accessibilityState={{ expanded: anchorBottom !== null, disabled }}
        onPress={() => anchor.current?.measureInWindow((_x, y, _width, h) => setAnchorBottom(y + h + spacing.sm))}
        style={({ pressed }) => [styles.trigger, value !== 'all' && styles.active, pressed && styles.pressed]}>
        <Text numberOfLines={1} style={[type.body, styles.label, value !== 'all' && styles.activeLabel]}>{selected.label}</Text>
        <Ionicons name="chevron-down" size={14} color={value === 'all' ? colors.textSecondary : colors.liveBright} />
      </Pressable>
      <Modal visible={anchorBottom !== null} transparent animationType="none" onRequestClose={close}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close game filters" onPress={close} />
          <View accessibilityViewIsModal onAccessibilityEscape={close}
            style={[styles.menu, { top: anchorBottom ?? insets.top, right: Math.max(insets.right, spacing.lg), width: Math.min(280, width - spacing.xxxl), maxHeight: Math.max(100, Math.min(540, height - (anchorBottom ?? 0) - insets.bottom - spacing.lg)) }]}>
            <ScrollView showsVerticalScrollIndicator contentContainerStyle={styles.options}>
              {filterOptions.map(option => (
                <View key={option.value}>
                  {option.group && <Text style={[type.sectionHeader, styles.group]}>{option.group}</Text>}
                  <Pressable accessibilityRole="radio" accessibilityState={{ selected: value === option.value }}
                    onPress={() => { onChange(option.value); close(); }}
                    style={({ pressed }) => [styles.option, value === option.value && styles.selected, pressed && styles.pressed]}>
                    <Text style={[type.body, styles.optionLabel, value === option.value && styles.activeLabel]}>{option.label}</Text>
                    {value === option.value && <Ionicons name="checkmark" size={18} color={colors.liveBright} />}
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  trigger: { minHeight: 44, maxWidth: '70%', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.textSecondary, flexShrink: 1 },
  active: { borderColor: colors.live, backgroundColor: colors.liveDim },
  activeLabel: { color: colors.liveBright },
  pressed: { opacity: 0.7 },
  overlay: { flex: 1, backgroundColor: colors.scrim },
  menu: { position: 'absolute', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  options: { padding: spacing.sm },
  group: { color: colors.textTertiary, paddingHorizontal: spacing.sm, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  option: { minHeight: 44, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.sm, gap: spacing.sm },
  optionLabel: { color: colors.textPrimary, flexShrink: 1 },
  selected: { backgroundColor: colors.liveDim },
});
