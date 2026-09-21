import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { colors, spacing, type } from '@/constants/theme';
import { demoDescription, demoScenarios, type DemoScenario } from '@/lib/demo-games';

const key = '222:demo-mode:v1';
type Settings = { scenario: DemoScenario | null; hideBadge: boolean };
export type DemoControls = Settings & { openMenu: () => void };
export function DemoController({ children }: { children: (controls: DemoControls) => React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ scenario: null, hideBadge: false });
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key).then(raw => {
      if (!raw || !active) return;
      const saved = JSON.parse(raw);
      setSettings({ scenario: demoScenarios.includes(saved.scenario) ? saved.scenario : null, hideBadge: saved.hideBadge === true });
    }).catch(() => {}).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const update = (next: Settings) => {
    setSettings(next);
    writes.current = writes.current.then(() => AsyncStorage.setItem(key, JSON.stringify(next)))
      .then(() => setSaveError(false)).catch(() => setSaveError(true));
  };
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  return <>
    {children({ ...settings, openMenu: () => setVisible(true) })}
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60, gap: spacing.md }}>
        <Text style={[type.headline, { color: colors.textPrimary }]}>Developer menu</Text>
        <Text style={[type.body, { color: colors.textSecondary }]}>Demo Mode</Text>
        <Text style={[type.small, { color: colors.textSecondary }]}>Fictional, frozen games. Selection survives restarts. Sorting demos use your local timezone.</Text>
        {[null, ...demoScenarios].map(scenario => <Pressable key={scenario ?? 'off'} accessibilityRole="radio" accessibilityState={{ checked: settings.scenario === scenario }}
          onPress={() => update({ ...settings, scenario })} style={{ padding: spacing.md, borderRadius: 12, backgroundColor: settings.scenario === scenario ? colors.liveDim : colors.surface }}>
          <Text style={[type.body, { color: settings.scenario === scenario ? colors.live : colors.textPrimary }]}>{scenario ?? 'Off · Live data'}{settings.scenario === scenario ? ' ✓' : ''}</Text>
        </Pressable>)}
        {settings.scenario && <Text style={[type.small, { color: colors.textSecondary }]}>{demoDescription(settings.scenario)}</Text>}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <Text style={[type.body, { flex: 1, color: colors.textPrimary }]}>Hide demo label for screenshots</Text>
          <Switch accessibilityLabel="Hide demo label for screenshots" value={settings.hideBadge} onValueChange={hideBadge => update({ ...settings, hideBadge })} />
        </View>
        <Text style={[type.small, { color: colors.textSecondary }]}>Double tap the 222 logo to return here, even when the label is hidden.</Text>
        {saveError && <Text style={{ color: colors.danger }}>Could not save settings. This selection works for this session.</Text>}
        <Pressable accessibilityRole="button" onPress={() => setVisible(false)} style={{ padding: spacing.md, alignItems: 'center' }}><Text style={[type.body, { color: colors.live }]}>Done</Text></Pressable>
      </ScrollView>
    </Modal>
  </>;
}
