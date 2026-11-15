// mobile/app/(student)/(tabs)/quests.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, Image,
} from 'react-native';
import { T } from '../../../src/theme/theme';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { refreshClasses, inSelectedClass, useClassScope } from '../../../src/utils/selectedClass';
import { useAuth } from '../../../src/context/AuthContext';
import AppHeader from '../../../src/components/AppHeader';
import QuestCover from '../../../src/components/QuestCover';
import { FadeIn, PressableScale } from '../../../src/components/Motion';
import { getMyProgress } from '../../../src/api/assignments';
import { QuestProgress } from '../../../src/types/assignments';
import { NAV_CLEARANCE } from '../../../src/components/FloatingTabBar';
import { QUEST_MAP_ENABLED } from '../../../src/config/features';

// EXPERIMENTAL map view. Needs react-native-svg (development build), so it is only loaded when the flag is on,
// and if anything about it fails the screen falls back to the normal list.
let QuestMapView: React.ComponentType<any> | null = null;
if (QUEST_MAP_ENABLED) {
  try {
    QuestMapView = require('../../../src/components/QuestMap').default;
  } catch {
    QuestMapView = null;
  }
}

const MAP_TOP_INSET = 32; // px of the map that sit under the header

class MapBoundary extends React.Component<{ onFail: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function ViewToggle({ value, onChange }: { value: 'map' | 'list'; onChange: (v: 'map' | 'list') => void }) {
  return (
    <View style={toggleStyles.wrap}>
      {(['map', 'list'] as const).map((v) => (
        <TouchableOpacity key={v} style={[toggleStyles.btn, value === v && toggleStyles.btnActive]} onPress={() => onChange(v)}>
          <Text style={[toggleStyles.text, value === v && toggleStyles.textActive]}>{v === 'map' ? 'Map' : 'List'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const GOLD = T('#F5B921');
const QUEST_BG = require('../../../assets/images/quest-bg.png');
const CREAM = T('#F5EDD8');
const BROWN = T('#5C2C16');
const GREEN = '#22C55E';
const ORANGE = T('#EA580C');

type StatusKey = 'in_progress' | 'completed' | 'not_started';
type FilterKey = 'all' | StatusKey;

function statusOf(p: QuestProgress): StatusKey {
  if (p.completed_at || p.percent_complete >= 100) return 'completed';
  // Ticked some items but finished no step yet still has step_completions rows
  if (p.percent_complete > 0 || p.step_completions.length > 0) return 'in_progress';
  return 'not_started';
}

export default function StudentQuests() {
  const router = useRouter();
  const { user } = useAuth();
  const scope = useClassScope();
  const [progress, setProgress] = useState<QuestProgress[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'map' | 'list'>('map');
  const [mapFailed, setMapFailed] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [, progressData] = await Promise.all([
        refreshClasses(user!.id),
        getMyProgress(),
      ]);
      setProgress(progressData);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not load your quests.');
    }
  }, [user?.id]);

  // Refetch every time the tab regains focus, so ticks made in Step Details show up here
  useFocusEffect(
    useCallback(() => {
      load().finally(() => setIsLoading(false));
    }, [load])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  const classProgress = progress.filter((p) => inSelectedClass(scope, p.group));
  const filtered = classProgress.filter((p) => filter === 'all' || statusOf(p) === filter);

  const mapAvailable = !!QuestMapView && !mapFailed;
  const showMap = mapAvailable && view === 'map' && classProgress.length > 0;
  const mapEntries = [...classProgress]
    .sort((a, b) => a.quest_assignment - b.quest_assignment)
    .map((item) => ({ item, status: statusOf(item) }));

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `All (${classProgress.length})` },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'not_started', label: 'Not Started' },
  ];

  function statusButton(status: StatusKey) {
    if (status === 'completed') return { label: 'Completed', bg: GREEN, textColor: '#fff', border: undefined };
    if (status === 'in_progress') return { label: 'Continue', bg: GOLD, textColor: BROWN, border: undefined };
    return { label: 'Start Quest', bg: 'transparent', textColor: GREEN, border: GREEN };
  }

  return (
    <View style={styles.screen}>
      <Image source={QUEST_BG} style={styles.bgImage} resizeMode="cover" />
      {/* Same header as Home */}
      <View style={{ zIndex: 20 }}>
        <AppHeader role="student" />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BROWN} />
        </View>
      ) : showMap && QuestMapView ? (
        // the map runs underneath the header's rounded corners, so there is no gap between them
        <View style={styles.mapWrap}>
          <MapBoundary onFail={() => setMapFailed(true)}>
            <QuestMapView
              entries={mapEntries}
              onOpen={(item: QuestProgress) => router.push(`/(student)/quest/${item.id}/overview` as any)}
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              topInset={MAP_TOP_INSET}
              toolbar={<ViewToggle value={view} onChange={setView} />}
            />
          </MapBoundary>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {mapAvailable ? (
            <View style={[styles.toggleRow, { paddingHorizontal: 0 }]}>
              <ViewToggle value={view} onChange={setView} />
            </View>
          ) : null}

          {/* Filter pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.pageTitle}>Quests</Text>

          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>
              {progress.length === 0 ? 'No quests assigned yet.' : 'No quests in this category.'}
            </Text>
          ) : (
            <View style={styles.grid}>
              {filtered.map((item, idx) => {
                const btn = statusButton(statusOf(item));
                return (
                  <FadeIn key={item.id} delay={Math.min(idx, 8) * 60} style={styles.cardSlot}>
                  <PressableScale
                    style={styles.card}
                    // item.id is the QuestProgress id, which the Overview screen expects
                    onPress={() => router.push(`/(student)/quest/${item.id}/overview` as any)}
                  >
                    <QuestCover url={item.quest_cover_image_url} style={styles.imagePlaceholder} iconSize={32} />
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.quest_title}</Text>
                    <View style={styles.cardDivider} />
                    <View
                      style={[
                        styles.statusButton,
                        { backgroundColor: btn.bg, borderColor: btn.border || 'transparent', borderWidth: btn.border ? 1.5 : 0 },
                      ]}
                    >
                      <Text style={[styles.statusButtonText, { color: btn.textColor }]}>{btn.label}</Text>
                    </View>
                  </PressableScale>
                  </FadeIn>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: '#FFF9EA', borderWidth: 2, borderColor: '#3A1D0E', borderRadius: 22, padding: 3 },
  btn: { height: 34, paddingHorizontal: 20, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  btnActive: { backgroundColor: '#C2410C' },
  text: { fontSize: 13, fontWeight: '900', color: '#4A2412' },
  textActive: { color: '#fff' },
});

const styles = StyleSheet.create({
  toggleRow: { paddingVertical: 0, marginBottom: 12 },
  mapWrap: { flex: 1, marginTop: -MAP_TOP_INSET },
  screen: { flex: 1, backgroundColor: CREAM },
  bgImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // 16px between the header and the Map | List pill (same as the map view, see QuestMap overlay)
  scrollContent: { padding: 20, paddingTop: 16, paddingBottom: NAV_CLEARANCE },
  errorText: { color: '#B3261E', marginBottom: 12, fontSize: 13 },
  emptyText: { color: T('#8A6A2A'), fontStyle: 'italic', textAlign: 'center', marginTop: 20 },

  filterRow: { flexDirection: 'row', marginBottom: 16 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: 'transparent' },
  filterPillActive: { backgroundColor: ORANGE },
  filterText: { fontSize: 13, fontWeight: '600', color: BROWN },
  filterTextActive: { color: '#fff' },

  pageTitle: { fontSize: 26, fontWeight: '800', color: BROWN, marginBottom: 14 },

   grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardSlot: { width: '48%' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 12, marginBottom: 14 },
  imagePlaceholder: { height: 120, borderRadius: 14, backgroundColor: T('#B8895C'), alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: T('#7c2d12'), minHeight: 38 },
  cardDivider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  statusButton: { borderRadius: 22, paddingVertical: 10, alignItems: 'center' },
  statusButtonText: { fontSize: 13, fontWeight: '800' },
});