// mobile/app/(teacher)/(tabs)/dashboard.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet,
} from 'react-native';
import { T, activeTheme } from '../../../src/theme/theme';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getTeacherDashboardSummary } from '../../../src/api/dashboard';
import { getSubmissions } from '../../../src/api/submissions';
import { TeacherDashboardSummary, RecentActivityEvent } from '../../../src/types/dashboard';
import { Submission } from '../../../src/types/submissions';
import AppHeader from '../../../src/components/AppHeader';
import { FadeIn, PressableScale, CountUp, Pop } from '../../../src/components/Motion';
import { NAV_CLEARANCE } from '../../../src/components/FloatingTabBar';

const GOLD = T('#F5B921');
const CREAM = T('#F5EDD8');
const BROWN = T('#5C2C16');
const DARK = T('#3A2B1A');
const ORANGE = T('#EA580C');
const GREEN = '#22A455';

// The big "needs review" card: brown (default) or deep blue (school theme)
const IS_SCHOOL = activeTheme === 'school';
const HERO_BG = IS_SCHOOL ? '#15366B' : '#4A2E1D';
const HERO_TEXT_SOFT = IS_SCHOOL ? '#CFE0F5' : '#EBD9BF';

// Soft tints for the small icon circles / chips
const TINT_BLUE = { bg: '#D6E6F8', fg: '#1F4D7A' };
const TINT_GOLD = { bg: '#FFF1C7', fg: '#6B4A00' };
const TINT_GREEN = { bg: '#DCF2E3', fg: '#166B3A' };
const TINT_ROSE = { bg: '#FBD9DF', fg: '#9F1239' };
const AVATAR_TINTS = [
  { bg: '#F7C9C0', fg: '#7A2E1F' },
  { bg: '#CFE0F5', fg: '#1F4D7A' },
  { bg: '#FBE3A6', fg: '#6B4A00' },
];

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
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
  const [pending, setPending] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadEverything = useCallback(async () => {
    setError('');
    try {
      const [sum, subs] = await Promise.all([
        getTeacherDashboardSummary(),
        getSubmissions().catch(() => [] as Submission[]),
      ]);
      setSummary(sum);
      setPending(
        subs
          .filter((s) => !s.is_reviewed)
          .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
      );
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
    { label: 'Students', value: summary?.student_count ?? 0, icon: 'people', tint: TINT_BLUE },
    { label: 'Classes', value: summary?.class_count ?? 0, icon: 'school', tint: TINT_GOLD },
    { label: 'Quests', value: summary?.quest_count ?? 0, icon: 'restaurant', tint: TINT_GREEN },
    { label: 'Groups', value: summary?.group_count ?? 0, icon: 'albums', tint: TINT_ROSE },
  ];

  const actions = [
    { label: 'New quest', icon: 'add', tint: TINT_GOLD, route: '/(teacher)/create-quest' },
    { label: 'Classes', icon: 'people', tint: TINT_GREEN, route: '/(teacher)/manage-classes' },
    { label: 'Submissions', icon: 'receipt-outline', tint: TINT_ROSE, route: '/(teacher)/submissions-list' },
  ];

  const waiting = pending.length;
  // Up to 3 different students who are waiting
  const waitingNames = Array.from(new Set(pending.map((s) => s.student_username))).slice(0, 3);
  const recent = (summary?.recent_activity ?? []).slice(0, 4);

  return (
    <View style={styles.screen}>
      <AppHeader role="teacher" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* ---------- 1. What needs me right now ---------- */}
        <FadeIn>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>{waiting > 0 ? 'NEEDS YOUR REVIEW' : 'ALL CAUGHT UP'}</Text>
            <View style={styles.heroRow}>
              {waiting > 0 ? (
                <View style={styles.heroCountRow}>
                  <CountUp value={waiting} style={styles.heroCount} />
                  <Text style={styles.heroCountText}>
                    {waiting === 1 ? 'submission waiting' : 'submissions waiting'}
                  </Text>
                </View>
              ) : (
                <View style={styles.heroCountRow}>
                  <Pop>
                    <View style={styles.heroCheck}><Ionicons name="checkmark" size={22} color={BROWN} /></View>
                  </Pop>
                  <Text style={styles.heroCountText}>No submissions to review</Text>
                </View>
              )}
              {waiting > 0 ? (
                <View style={styles.avatarStack}>
                  {waitingNames.map((n, i) => (
                    <Pop key={n} delay={300 + i * 100}>
                      <View
                        style={[
                          styles.stackAvatar,
                          { backgroundColor: AVATAR_TINTS[i % 3].bg, marginLeft: i === 0 ? 0 : -10 },
                        ]}
                      >
                        <Text style={[styles.stackAvatarText, { color: AVATAR_TINTS[i % 3].fg }]}>
                          {n.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    </Pop>
                  ))}
                </View>
              ) : null}
            </View>
            {waiting > 0 ? (
              <PressableScale
                style={styles.heroButton}
                scaleTo={0.97}
                onPress={() => router.navigate('/(teacher)/(tabs)/submissions' as any)}
              >
                <Text style={styles.heroButtonText}>Review now</Text>
                <Ionicons name="chevron-forward" size={18} color={DARK} />
              </PressableScale>
            ) : null}
          </View>
        </FadeIn>

        {/* ---------- 2. Quick numbers ---------- */}
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <FadeIn key={s.label} delay={120 + i * 70} style={styles.statTile}>
              <View style={[styles.statIcon, { backgroundColor: s.tint.bg }]}>
                <Ionicons name={s.icon as any} size={15} color={s.tint.fg} />
              </View>
              <CountUp value={s.value} style={styles.statNumber} delay={300 + i * 70} />
              <Text style={styles.statLabel}>{s.label}</Text>
            </FadeIn>
          ))}
        </View>

        {/* ---------- 3. Shortcuts ---------- */}
        <FadeIn delay={300}>
          <Text style={styles.sectionHeader}>Quick actions</Text>
          <View style={styles.actionsRow}>
            {actions.map((a) => (
              <PressableScale
                key={a.label}
                containerStyle={{ flex: 1 }}
                style={styles.actionTile}
                scaleTo={0.94}
                onPress={() => router.push(a.route as any)}
              >
                <View style={[styles.actionIcon, { backgroundColor: a.tint.bg }]}>
                  <Ionicons name={a.icon as any} size={20} color={a.tint.fg} />
                </View>
                <Text style={styles.actionLabel} numberOfLines={1}>{a.label}</Text>
              </PressableScale>
            ))}
          </View>
        </FadeIn>

        {/* ---------- 4. My classes ---------- */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionHeaderInline}>My classes</Text>
          <TouchableOpacity onPress={() => router.push('/(teacher)/manage-classes' as any)} hitSlop={8}>
            <Text style={styles.viewAll}>Manage →</Text>
          </TouchableOpacity>
        </View>
        {!summary || summary.classes.length === 0 ? (
          <Text style={styles.emptyText}>No classes yet.</Text>
        ) : (
          summary.classes.map((c, ci) => (
            <FadeIn key={c.id} delay={400 + Math.min(ci, 5) * 90}>
              <PressableScale
                style={styles.classCard}
                scaleTo={0.97}
                onPress={() => router.push(`/(teacher)/class/${c.id}` as any)}
              >
                <View style={styles.classTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.className} numberOfLines={1}>{c.class_name}</Text>
                    {c.section ? <Text style={styles.classSection}>Section {c.section}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={T('#B8A671')} />
                </View>
                <View style={styles.classChips}>
                  <View style={[styles.chip, { backgroundColor: TINT_GOLD.bg }]}>
                    <Ionicons name="restaurant" size={13} color={TINT_GOLD.fg} />
                    <Text style={[styles.chipText, { color: TINT_GOLD.fg }]}>{c.active_quests} active {c.active_quests === 1 ? 'quest' : 'quests'}</Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: TINT_BLUE.bg }]}>
                    <Ionicons name="people" size={13} color={TINT_BLUE.fg} />
                    <Text style={[styles.chipText, { color: TINT_BLUE.fg }]}>{c.total_students} {c.total_students === 1 ? 'student' : 'students'}</Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: TINT_ROSE.bg }]}>
                    <Ionicons name="albums" size={13} color={TINT_ROSE.fg} />
                    <Text style={[styles.chipText, { color: TINT_ROSE.fg }]}>{c.total_groups} {c.total_groups === 1 ? 'group' : 'groups'}</Text>
                  </View>
                </View>
              </PressableScale>
            </FadeIn>
          ))
        )}

        {/* ---------- 5. What happened lately ---------- */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionHeaderInline}>Recent activity</Text>
          <TouchableOpacity onPress={() => router.push('/(teacher)/submissions-list' as any)} hitSlop={8}>
            <Text style={styles.viewAll}>View all →</Text>
          </TouchableOpacity>
        </View>
        {recent.length === 0 ? (
          <Text style={styles.emptyText}>Nothing yet.</Text>
        ) : (
          <FadeIn delay={650}>
            <View style={styles.activityCard}>
              {recent.map((event, idx) => {
                const icon = activityIcon(event.type);
                return (
                  <View key={idx} style={[styles.activityRow, idx === recent.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[styles.activityIcon, { backgroundColor: icon.color }]}>
                      <Ionicons name={icon.name} size={13} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityStudent} numberOfLines={1}>{event.student_full_name}</Text>
                      <Text style={styles.activityDescription} numberOfLines={2}>{event.description}</Text>
                    </View>
                    <Text style={styles.activityTime}>{timeAgo(event.timestamp)}</Text>
                  </View>
                );
              })}
            </View>
          </FadeIn>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CREAM },
  scrollContent: { padding: 16, paddingBottom: NAV_CLEARANCE },
  error: { color: '#B3261E', marginBottom: 12, fontSize: 13 },
  emptyText: { color: T('#8A6A2A'), fontStyle: 'italic', marginBottom: 12 },

  // hero
  hero: { backgroundColor: HERO_BG, borderRadius: 24, padding: 18, gap: 12, marginTop: 4 },
  heroLabel: { color: GOLD, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroCountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  heroCount: { color: '#fff', fontSize: 44, fontWeight: '900', lineHeight: 48 },
  heroCountText: { color: HERO_TEXT_SOFT, fontSize: 14, flexShrink: 1 },
  heroCheck: { width: 40, height: 40, borderRadius: 20, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  avatarStack: { flexDirection: 'row' },
  stackAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: HERO_BG, alignItems: 'center', justifyContent: 'center' },
  stackAvatarText: { fontSize: 12, fontWeight: '800' },
  heroButton: { height: 46, borderRadius: 14, backgroundColor: GOLD, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  heroButtonText: { color: DARK, fontSize: 15, fontWeight: '800' },

  // numbers
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, alignItems: 'center', gap: 4 },
  statIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statNumber: { fontSize: 20, fontWeight: '900', color: DARK },
  statLabel: { fontSize: 11, fontWeight: '600', color: T('#8A6A2A') },

  // sections
  sectionHeader: { fontSize: 16, fontWeight: '900', color: DARK, marginTop: 22, marginBottom: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 10 },
  sectionHeaderInline: { fontSize: 16, fontWeight: '900', color: DARK },
  viewAll: { fontSize: 13, fontWeight: '700', color: ORANGE },

  // actions
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionTile: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 8 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '800', color: DARK },

  // classes
  classCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10, gap: 12 },
  classTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  className: { fontSize: 16, fontWeight: '900', color: DARK },
  classSection: { fontSize: 12, color: T('#8A6A2A'), marginTop: 2, fontWeight: '600' },
  classChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 11, fontWeight: '800' },

  // activity
  activityCard: { backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 14 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.08)' },
  activityIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityStudent: { fontWeight: '800', color: DARK, fontSize: 13 },
  activityDescription: { fontSize: 12, color: T('#8A6A2A'), marginTop: 1 },
  activityTime: { fontSize: 11, color: '#999' },
});