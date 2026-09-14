import { colors, radius, spacing, type } from '@/constants/theme';
import type { Game } from '@/hooks/games';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

export function PeriodScoreboard({ game }: { game: Game }) {
  const { fontScale } = useWindowDimensions();
  const periods = Math.max(4, game.home_team_period_scores?.length ?? 0, game.away_team_period_scores?.length ?? 0);
  const labels = Array.from({ length: periods }, (_, i) => i < 4 ? `${i + 1}` : `OT${i - 3}`);
  const final = game.status === 'final';
  const currentPeriod = game.quarter?.endsWith('OT') ? Number.parseInt(game.quarter, 10) + 4 : Number.parseInt(game.quarter ?? '', 10);
  const teams = [
    { team: game.away_team, scores: game.away_team_period_scores, total: game.away_team_score },
    { team: game.home_team, scores: game.home_team_period_scores, total: game.home_team_score },
  ];
  const unavailable = teams.every(({ scores }) => !scores?.some(score => score != null));
  const cellWidth = Math.max(38, 34 * fontScale);
  const rowHeight = Math.max(36, 28 * fontScale);
  const headerHeight = Math.max(26, 22 * fontScale);

  return <View style={styles.container} testID="period-scoreboard">
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <View style={[styles.identityColumn, { width: Math.max(94, 80 * fontScale) }]}>
          <View style={{ height: headerHeight, justifyContent: 'center' }}>
            <Text style={styles.columnLabel}>TEAM</Text>
          </View>
          {teams.map(({ team }) => <View key={team.id} style={[styles.identity, { height: rowHeight }]}>
            <Image source={{ uri: team.logo }} style={styles.logo} contentFit="contain" />
            <Text numberOfLines={1} style={styles.team} accessibilityLabel={team.name}>{team.abbreviation}</Text>
          </View>)}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled directionalLockEnabled bounces={false}
          testID="period-score-scroll" style={styles.scoreScroll} contentContainerStyle={styles.scores}>
          {labels.map((label, index) => {
            const active = game.status === 'live' && currentPeriod === index + 1;
            return <View key={label} style={[{ width: cellWidth, flexGrow: 1 }, active && styles.activeColumn]}>
              <View style={{ height: headerHeight, justifyContent: 'center' }}>
                <Text style={[styles.columnLabel, styles.center, active && styles.activeText]}>{label}</Text>
              </View>
              {teams.map(({ team, scores }) => <View key={team.id} style={[styles.cell, { height: rowHeight }, styles.cellBorder]}>
                <Text selectable style={[styles.score, scores?.[index] == null && styles.missing]}
                  accessibilityLabel={`${team.abbreviation}, ${index < 4 ? `quarter ${index + 1}` : label}, ${scores?.[index] ?? 'unavailable or unplayed'}`}>
                  {scores?.[index] ?? '—'}
                </Text>
              </View>)}
            </View>;
          })}
          {final && <View style={[styles.totalColumn, { width: cellWidth + 10, flexGrow: 1 }]}>
            <View style={{ height: headerHeight, justifyContent: 'center' }}><Text style={[styles.columnLabel, styles.center]}>T</Text></View>
            {teams.map(({ team, total }) => <View key={team.id} style={[styles.cell, { height: rowHeight }]}>
              <Text selectable style={[styles.score, styles.totalScore]} accessibilityLabel={`${team.abbreviation}, final total ${total}`}>{total}</Text>
            </View>)}
          </View>}
        </ScrollView>
      </View>
    </View>
    {unavailable && <Text style={styles.note}>Quarter scores unavailable.</Text>}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  table: { padding: spacing.sm },
  tableRow: { flexDirection: 'row' },
  identityColumn: { paddingRight: spacing.xs },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  logo: { width: 22, height: 22 },
  team: { ...type.small, color: colors.textPrimary, fontWeight: '800', flexShrink: 1 },
  columnLabel: { ...type.chip, letterSpacing: 0.4, color: colors.textSecondary },
  center: { textAlign: 'center' },
  scoreScroll: { flex: 1 },
  scores: { flexGrow: 1 },
  cell: { alignItems: 'center', justifyContent: 'center' },
  cellBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  score: { ...type.body, fontVariant: ['tabular-nums'], color: colors.textPrimary, fontWeight: '600' },
  missing: { color: colors.textSecondary },
  totalColumn: { backgroundColor: colors.surface, borderRadius: radius.sm, marginLeft: spacing.xs },
  totalScore: { fontWeight: '900' },
  activeColumn: { backgroundColor: colors.liveDim, borderRadius: radius.sm },
  activeText: { color: colors.liveBright },
  note: { ...type.small, color: colors.textSecondary },
});
