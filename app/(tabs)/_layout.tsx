import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { DemoProvider } from '@/components/demo-controller';
import { colors, type } from '@/constants/theme';
import { GamePreferencesProvider } from '@/hooks/use-game-preferences';

export default function TabLayout() {
  return <DemoProvider><GamePreferencesProvider><Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: colors.live,
    tabBarInactiveTintColor: colors.textSecondary,
    tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
    tabBarLabelStyle: { ...type.small, fontWeight: '700' },
    sceneStyle: { backgroundColor: colors.background },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Games', tabBarIcon: ({ color, size }) => <Ionicons name="american-football-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="standings" options={{ title: 'Standings', tabBarIcon: ({ color, size }) => <Ionicons name="podium-outline" color={color} size={size} /> }} />
  </Tabs></GamePreferencesProvider></DemoProvider>;
}
