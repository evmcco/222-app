import { colors, radius, spacing, type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type DropdownOption<Value extends string = string> = { value: Value; label: string; group?: string };
export function FilterDropdown<Value extends string>({ value, onChange, disabled, options, label, fallbackLabel = 'Unavailable', active = false, align = 'end' }: {
  options: DropdownOption<Value>[]; value: Value; onChange: (value: Value) => void; disabled?: boolean;
  label: string; fallbackLabel?: string; active?: boolean; align?: 'start' | 'end';
}) {
  const [position, setPosition] = useState<{ x: number; bottom: number; width: number } | null>(null);
  const anchor = useRef<View>(null);
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const selected = options.find(option => option.value === value)?.label ?? fallbackLabel;
  const close = () => setPosition(null);
  const menuWidth = Math.min(280, width - spacing.xxxl);
  const desiredLeft = position ? position.x + (align === 'end' ? position.width - menuWidth : 0) : spacing.lg;
  const left = Math.max(insets.left + spacing.lg, Math.min(desiredLeft, width - menuWidth - insets.right - spacing.lg));
  return <>
    <Pressable ref={anchor} disabled={disabled} accessibilityRole="button"
      accessibilityLabel={`${label}: ${selected}`} accessibilityState={{ expanded: position !== null, disabled }}
      onPress={() => anchor.current?.measureInWindow((x, y, measuredWidth, h) => setPosition({ x, bottom: y + h + spacing.sm, width: measuredWidth }))}
      style={({ pressed }) => [styles.trigger, active && styles.active, pressed && styles.pressed]}>
      <Text numberOfLines={1} style={[type.body, styles.label, active && styles.activeLabel]}>{selected}</Text>
      <Ionicons name="chevron-down" size={14} color={active ? colors.liveBright : colors.textSecondary} />
    </Pressable>
    <Modal visible={position !== null} transparent animationType="none" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={`Close ${label.toLowerCase()}`} onPress={close} />
        <View accessibilityViewIsModal onAccessibilityEscape={close}
          style={[styles.menu, { top: position?.bottom ?? insets.top, left, width: menuWidth, maxHeight: Math.max(100, Math.min(540, height - (position?.bottom ?? 0) - insets.bottom - spacing.lg)) }]}>
          <ScrollView showsVerticalScrollIndicator contentContainerStyle={styles.options}>
            {options.map(option => <View key={option.value}>
              {option.group && <Text style={[type.sectionHeader, styles.group]}>{option.group}</Text>}
              <Pressable accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: value === option.value }}
                onPress={() => { onChange(option.value); close(); }}
                style={({ pressed }) => [styles.option, value === option.value && styles.selected, pressed && styles.pressed]}>
                <Text style={[type.body, styles.optionLabel, value === option.value && styles.activeLabel]}>{option.label}</Text>
                {value === option.value && <Ionicons name="checkmark" size={18} color={colors.liveBright} />}
              </Pressable>
            </View>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
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
