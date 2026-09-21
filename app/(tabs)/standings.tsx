import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { StandingsHub } from '@/components/standings-hub';
import { GameInfoDrawer } from '@/components/game-info-drawer';
import { useDemoControls } from '@/components/demo-controller';
import { useCompetitionData } from '@/hooks/use-competition-data';
import { useCurrentSeason } from '@/hooks/games';
import { useGamePreferences } from '@/hooks/use-game-preferences';
import { createStandingsDemo } from '@/lib/standings-demo';
import { selectStandings } from '@/lib/standings-data';
import { useTeamMetadata } from '@/hooks/use-team-metadata';
import type { TeamCatalog } from '@/lib/game-filters';
import { availablePolls, resolvePollSelection, type PollSelection } from '@/lib/standings-data';
import { demoCatalog, demoDetails } from '@/lib/demo-games';
import type { CompetitionSnapshot } from '@/lib/competition-data';
import type { Poll, StandingsView } from '@/lib/standings';
import { colors } from '@/constants/theme';

export default function StandingsScreen() {
  const controls = useDemoControls();
  return controls?.scenario ? <DemoStandings /> : <LiveStandings />;
}
function DemoStandings() {
  const data = useMemo(createStandingsDemo, []);
  return <StandingsContent data={data} catalog={demoCatalog} isLoading={false} error={null} refetch={async () => {}} demo />;
}
function LiveStandings() {
  const season = useCurrentSeason();
  const source = useCompetitionData(season.seasonYear);
  const metadata = useTeamMetadata(season.seasonYear);
  const { refetch: refreshCompetition } = source;
  useFocusEffect(useCallback(() => { void refreshCompetition(); }, [refreshCompetition]));
  return <StandingsContent {...source} catalog={metadata.catalog} isLoading={source.isLoading || season.isLoading} error={source.error ?? season.error} refetch={async () => { await Promise.all([source.refetch(), season.refetch(), metadata.retry()]); }} />;
}
function StandingsContent({ data, catalog, isLoading, error, refetch, demo = false }: {
  data?: CompetitionSnapshot; catalog?: TeamCatalog; isLoading: boolean; error: string | null; refetch: () => Promise<unknown>; demo?: boolean;
}) {
  const [view, setView] = useState<StandingsView>('top25');
  const [pollSelection, setPollSelection] = useState<PollSelection | null>(null);
  const poll = resolvePollSelection(data, pollSelection);
  const setPoll = (next: Poll) => { if (data) setPollSelection({ season: data.season_year, cfpAvailable: availablePolls(data).includes('cfp'), poll: next }); };
  const [conference, setConference] = useState('8');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [demoPins, setDemoPins] = useState<string[]>([]);
  const preferences = useGamePreferences();
  const activeConference = data?.standings.some(item => item.conference_id === conference) ? conference : data?.standings[0]?.conference_id ?? '';
  const selected = useMemo(() => selectStandings(data, view, poll, activeConference, catalog), [data, view, poll, activeConference, catalog]);
  const game = data?.games.find(item => item.id === selectedGameId);
  const pins = demo ? demoPins : preferences.pins;
  const togglePin = () => {
    if (!game) return;
    if (demo) setDemoPins(current => current.includes(game.id) ? current.filter(id => id !== game.id) : [...current, game.id]);
    else preferences.togglePin(game.id);
  };
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <StandingsHub data={{ ...selected, loading: isLoading, error: !!error }} view={view} poll={poll} conference={activeConference}
      onView={setView} onPoll={setPoll} onConference={setConference} onGame={setSelectedGameId} onRefresh={refetch} />
    {game && <GameInfoDrawer game={game} detailsOverride={demo ? demoDetails : undefined} pinned={pins.includes(game.id)} onTogglePin={togglePin} onClose={() => setSelectedGameId(null)} />}
  </View>;
}
