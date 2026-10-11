// mobile/app/(teacher)/(tabs)/dashboard.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getTeacherDashboardSummary } from '../../../src/api/dashboard';
import { TeacherDashboardSummary, RecentActivityEvent } from '../../../src/types/dashboard';
import AppHeader from '../../../src/components/AppHeader';

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const DARK = '#3A2B1A';
const ORANGE = '#EA580C';
const GREEN = '#22A455';
const RED = '#DC2626';

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min. ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function activityIcon(type: RecentActivityEvent['type']): { name: any; color: string } {
  if (type === 'quest_started') return { name: 'play', color: GOLD };
  if (type === 'submission_made') return { name: 'camera', color: ORANGE };
  return { name: 'checkmark', color: GREEN };
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadEverything = useCallback(async () => {
    setError('');
    try {
      setSummary(await getTeacherDashboardSummary());
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEverything();
    }, [loadEverything])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadEverything();
    setIsRefreshing(false);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }


  const stats = [
    { label: 'Students', value: summary?.student_count ?? 0 },
    { label: 'Classes', value: summary?.class_count ?? 0 },
    { label: 'Quests', value: summary?.quest_count ?? 0 },
    { label: 'Groups', value: summary?.group_count ?? 0 },
  ];

  const actions = [
    { label: 'Create Quest', icon: 'add', color: '#F0A30A', route: '/(teacher)/create-quest' },
    { label: 'Manage Classes', icon: 'people', color: GREEN, route: '/(teacher)/manage-classes' },
    { label: 'View Submissions', icon: 'receipt-outline', color: '#E11D48', route: '/(teacher)/submissions-list' },
  ];

  return (
    <View style={styles.screen}>
      <AppHeader role="teacher" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* ---------- Stats ---------- */}
        <View style={styles.statsWrap}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statTile}>
              <Text style={styles.statNumber}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ---------- Quick actions ---------- */}
        <Text style={styles.sectionHeader}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {actions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.actionTile, { backgroundColor: a.color }]}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.85}
            >
              <Ionicons name={a.icon as any} size={30} color="#fff" />
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ---------- Class overview ---------- */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionHeaderInline}>Class Overview</Text>
          <TouchableOpacity onPress={() => router.push('/(teacher)/manage-classes' as any)}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>
        {!summary || summary.classes.length === 0 ? (
          <Text style={styles.emptyText}>No classes yet.</Text>
        ) : (
          summary.classes.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.classCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/(teacher)/class/${c.id}` as any)}
            >
              <View style={styles.classNameBox}>
                <Text style={styles.className} numberOfLines={3}>{c.class_name}</Text>
                {c.section ? <Text style={styles.classSection}>{c.section}</Text> : null}
              </View>
              <View style={styles.classTiles}>
                <View style={[styles.classTile, { backgroundColor: '#7A6540' }]}>
                  <Text style={styles.classTileNumber}>{c.active_quests}</Text>
                  <Text style={styles.classTileLabel}>Active{'\n'}Quests</Text>
                </View>
                <View style={[styles.classTile, { backgroundColor: '#4A3418' }]}>
                  <Text style={styles.classTileNumber}>{c.total_groups}</Text>
                  <Text style={styles.classTileLabel}>Total{'\n'}Groups</Text>
                </View>
                <View style={[styles.classTile, { backgroundColor: '#2B1D0C' }]}>
                  <Text style={styles.classTileNumber}>{c.total_students}</Text>
                  <Text style={styles.classTileLabel}>Total{'\n'}Students</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* ---------- Recent activity ---------- */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionHeaderInline}>Recent Activity</Text>
          <TouchableOpacity onPress={() => router.push('/(teacher)/submissions-list' as any)}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>
        {!summary || summary.recent_activity.length === 0 ? (
          <Text style={styles.emptyText}>Nothing yet.</Text>
        ) : (
          <View style={styles.activityCard}>
            {summary.recent_activity.map((event, idx) => {
              const icon = activityIcon(event.type);
              return (
                <View
                  key={idx}
                  style={[styles.activityRow, idx === summary.recent_activity.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={[styles.activityIcon, { backgroundColor: icon.color }]}>
                    <Ionicons name={icon.name} size={13} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityStudent}>{event.student_full_name}</Text>
                    <Text style={styles.activityDescription}>{event.description}</Text>
                    <Text style={styles.activityTime}>{timeAgo(event.timestamp)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CREAM },
  scrollContent: { padding: 16, paddingBottom: 60 },
  error: { color: '#B3261E', marginBottom: 12, fontSize: 13 },
  emptyText: { color: '#8A6A2A', fontStyle: 'italic', marginBottom: 12 },

  header: {
    backgroundColor: GOLD, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    borderWidth: 1.5, borderTopWidth: 0, borderColor: DARK,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFE08A', borderWidth: 1.5, borderColor: DARK, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarImg: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 1.5, borderColor: DARK },
  welcomeSmall: { fontSize: 12, color: DARK },
  welcomeName: { fontSize: 18, fontWeight: '900', color: DARK },
  dateText: { fontSize: 11, color: DARK, fontWeight: '600' },
  portalText: { fontSize: 11, color: DARK, fontWeight: '800', marginTop: 2 },
  bellDot: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: RED, borderWidth: 1, borderColor: DARK },

  statsWrap: {
    flexDirection: 'row', gap: 8, padding: 8, marginTop: 4, marginBottom: 20,
    backgroundColor: '#FBF3DC', borderRadius: 24, borderWidth: 1.5, borderColor: DARK,
  },
  statTile: { flex: 1, backgroundColor: '#F7E2A0', borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  statNumber: { fontSize: 26, fontWeight: '900', color: DARK },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#5A4630', marginTop: 2 },

  sectionHeader: { fontSize: 16, fontWeight: '900', color: DARK, marginBottom: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 10 },
  sectionHeaderInline: { fontSize: 16, fontWeight: '900', color: DARK },
  viewAll: { fontSize: 13, fontWeight: '700', color: ORANGE },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionTile: { flex: 1, height: 84, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  actionLabel: { color: '#fff', fontSize: 11, fontWeight: '800', textAlign: 'center' },

  classCard: {
    flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#F8EDCB',
    borderRadius: 10, borderWidth: 1.5, borderColor: DARK, marginBottom: 12, overflow: 'hidden',
  },
  classNameBox: { width: '32%', padding: 10, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1.5, borderRightColor: DARK },
  className: { fontSize: 15, fontWeight: '900', color: DARK, textAlign: 'center' },
  classSection: { fontSize: 11, color: '#8A6A2A', marginTop: 2, fontWeight: '700' },
  classTiles: { flex: 1, flexDirection: 'row', gap: 8, padding: 10 },
  classTile: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  classTileNumber: { fontSize: 20, fontWeight: '900', color: '#fff' },
  classTileLabel: { fontSize: 10, color: '#F3E6C4', textAlign: 'center', marginTop: 2 },

  activityCard: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, borderWidth: 1, borderColor: '#EADEC9' },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.08)' },
  activityIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  activityStudent: { fontWeight: '800', color: ORANGE, fontSize: 14 },
  activityDescription: { fontSize: 12, color: DARK, marginTop: 1 },
  activityTime: { fontSize: 11, color: '#999', marginTop: 2 },
});
