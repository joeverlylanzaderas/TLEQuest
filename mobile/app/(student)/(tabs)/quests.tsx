// mobile/app/(student)/(tabs)/quests.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyProfile } from '../../../src/api/accounts';
import { getMyClasses } from '../../../src/api/classrooms';
import { getMyProgress } from '../../../src/api/assignments';
import { getUnreadNotifications } from '../../../src/api/notifications';
import { FullUser } from '../../../src/types/accounts';
import { ClassSummary } from '../../../src/types/classrooms';
import { QuestProgress } from '../../../src/types/assignments';

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const GREEN = '#22C55E';
const ORANGE = '#EA580C';

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
  const [profile, setProfile] = useState<FullUser | null>(null);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [progress, setProgress] = useState<QuestProgress[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [profileData, classesData, progressData, unread] = await Promise.all([
        getMyProfile(),
        getMyClasses(),
        getMyProgress(),
        getUnreadNotifications(),
      ]);
      setProfile(profileData);
      setClasses(classesData);
      setProgress(progressData);
      setUnreadCount(unread.length);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not load your quests.');
    }
  }, []);

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

  const filtered = progress.filter((p) => filter === 'all' || statusOf(p) === filter);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `All (${progress.length})` },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'not_started', label: 'Not Started' },
  ];

  function statusButton(status: StatusKey) {
    if (status === 'completed') return { label: 'Completed', bg: GREEN, textColor: '#fff', border: undefined };
    if (status === 'in_progress') return { label: 'Continue', bg: GOLD, textColor: BROWN, border: undefined };
    return { label: 'Start Quest', bg: 'transparent', textColor: GREEN, border: GREEN };
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const displayName = profile?.profile.first_name || profile?.username || '';

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={20} color={BROWN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeSmall}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{displayName}!</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.dateText}>{today}</Text>
            <Text style={styles.classText}>{classes.length > 0 ? classes[0].class_name : 'No class joined'}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(student)/notifications' as any)}
            style={{ marginLeft: 8 }}
          >
            <Ionicons name="notifications" size={20} color={BROWN} />
            {unreadCount > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BROWN} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

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

          <Text style={styles.pageTitle}>QUESTS</Text>

          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>
              {progress.length === 0 ? 'No quests assigned yet.' : 'No quests in this category.'}
            </Text>
          ) : (
            <View style={styles.grid}>
              {filtered.map((item) => {
                const btn = statusButton(statusOf(item));
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    // item.id is the QuestProgress id, which the Overview screen expects
                    onPress={() => router.push(`/(student)/quest/${item.id}/overview` as any)}
                  >
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="restaurant" size={28} color="#fff" />
                    </View>
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
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: GOLD, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  welcomeSmall: { fontSize: 12, color: BROWN, opacity: 0.8 },
  welcomeName: { fontSize: 16, fontWeight: '800', color: BROWN },
  dateText: { fontSize: 11, color: BROWN, fontWeight: '600' },
  classText: { fontSize: 11, color: BROWN, fontWeight: '700', marginTop: 2 },
  bellDot: { position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },

  scrollContent: { padding: 20, paddingBottom: 60 },
  errorText: { color: '#B3261E', marginBottom: 12, fontSize: 13 },
  emptyText: { color: '#8A6A2A', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },

  filterRow: { flexDirection: 'row', marginBottom: 16 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: 'transparent' },
  filterPillActive: { backgroundColor: ORANGE },
  filterText: { fontSize: 13, fontWeight: '600', color: BROWN },
  filterTextActive: { color: '#fff' },

  pageTitle: { fontSize: 28, fontWeight: '900', color: GREEN, textAlign: 'center', marginBottom: 16, letterSpacing: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 10, marginBottom: 14 },
  imagePlaceholder: { height: 90, borderRadius: 12, backgroundColor: '#B8895C', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#7c2d12', minHeight: 30 },
  cardDivider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  statusButton: { borderRadius: 20, paddingVertical: 8, alignItems: 'center' },
  statusButtonText: { fontSize: 12, fontWeight: '700' },
});