// mobile/app/(teacher)/(tabs)/progress.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet,
} from 'react-native';
import { T, HEADER_BG, HEADER_TEXT, activeTheme } from '../../../src/theme/theme';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllAssignments, getMyProgress } from '../../../src/api/assignments';
import { getSubmissions } from '../../../src/api/submissions';
import { QuestAssignment, QuestProgress } from '../../../src/types/assignments';
import { Submission } from '../../../src/types/submissions';
import AppHeader from '../../../src/components/AppHeader';
import { FadeIn, AnimatedBar, CountUp } from '../../../src/components/Motion';
import { NAV_CLEARANCE } from '../../../src/components/FloatingTabBar';

const GOLD = T('#F5B921');
const CREAM = T('#F5EDD8');
const BROWN = T('#5C2C16');
const GREEN = '#22C55E';
const ORANGE = T('#EA580C');
const HERO_BG = activeTheme === 'school' ? '#15366B' : '#4A2E1D';
const HERO_SOFT = activeTheme === 'school' ? '#CFE0F5' : '#EBD9BF';
const AVATAR_TINTS = [
  { bg: '#F7C9C0', fg: '#7A2E1F' },
  { bg: '#CFE0F5', fg: '#1F4D7A' },
  { bg: '#FBE3A6', fg: '#6B4A00' },
  { bg: '#CDE7D3', fg: '#1F5A35' },
  { bg: '#E4D3F2', fg: '#4B2A70' },
];

function isDone(p: QuestProgress): boolean {
  return !!p.completed_at || p.percent_complete >= 100;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TeacherProgress() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<QuestAssignment[]>([]);
  const [progress, setProgress] = useState<QuestProgress[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [a, pr, s] = await Promise.all([
        getAllAssignments(),
        getMyProgress(),
        getSubmissions(),
      ]);
      setAssignments(a);
      setProgress(pr);
      setSubmissions(s);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not load progress.');
    }
  }, []);

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

  // Quests that have at least one assignment, for the filter pills
  const questOptions: { id: number; title: string }[] = [];
  assignments.forEach((a) => {
    if (!questOptions.some((q) => q.id === a.quest)) questOptions.push({ id: a.quest, title: a.quest_title });
  });

  const visibleAssignments = assignments.filter((a) => selectedQuestId === null || a.quest === selectedQuestId);

  const rows = visibleAssignments.map((a) => {
    const members = progress.filter((p) => p.quest_assignment === a.id);
    const subs = submissions.filter((s) => s.quest_assignment === a.id);
    // Backend returns newest first
    const latest = subs.length > 0 ? subs[0] : null;
    return { a, members, avg: average(members.map((m) => m.percent_complete)), latest };
  });

  const allMembers = rows.flatMap((r) => r.members);
  const doneCount = allMembers.filter(isDone).length;
  const overallAvg = average(allMembers.map((m) => m.percent_complete));


  return (
    <View style={styles.screen}>
      <AppHeader role="teacher" />

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

          <Text style={styles.pageTitle}>Progress</Text>

          {questOptions.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <TouchableOpacity
                style={[styles.pill, selectedQuestId === null && styles.pillActive]}
                onPress={() => setSelectedQuestId(null)}
              >
                <Text style={[styles.pillText, selectedQuestId === null && styles.pillTextActive]}>All quests</Text>
              </TouchableOpacity>
              {questOptions.map((q) => (
                <TouchableOpacity
                  key={q.id}
                  style={[styles.pill, selectedQuestId === q.id && styles.pillActive]}
                  onPress={() => setSelectedQuestId(q.id)}
                >
                  <Text style={[styles.pillText, selectedQuestId === q.id && styles.pillTextActive]} numberOfLines={1}>
                    {q.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <FadeIn>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>OVERALL PROGRESS</Text>
              <View style={styles.heroTop}>
                <CountUp value={overallAvg} suffix="%" style={styles.heroValue} />
                <Text style={styles.heroSub}>average across {allMembers.length} {allMembers.length === 1 ? 'student' : 'students'}</Text>
              </View>
              <AnimatedBar percent={overallAvg} trackStyle={styles.heroTrack} fillStyle={styles.heroFill} delay={300} />
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{rows.length}</Text>
                  <Text style={styles.heroStatLabel}>Groups</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{doneCount}</Text>
                  <Text style={styles.heroStatLabel}>Finished</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{allMembers.length - doneCount}</Text>
                  <Text style={styles.heroStatLabel}>In progress</Text>
                </View>
              </View>
            </View>
          </FadeIn>

          {rows.length === 0 ? (
            <Text style={styles.emptyText}>
              No quests have been assigned to a group yet. Publish a quest for a class that has groups, and progress
              will show up here.
            </Text>
          ) : (
            rows.map(({ a, members, avg, latest }, ri) => {
              const expanded = expandedId === a.id;
              const everyoneDone = members.length > 0 && members.every(isDone);
              return (
                <FadeIn key={a.id} delay={Math.min(ri, 6) * 80}>
                <View style={styles.groupCard}>
                  <TouchableOpacity
                    style={styles.groupTop}
                    onPress={() => setExpandedId(expanded ? null : a.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupName} numberOfLines={1}>{a.group_name || `Group #${a.group}`}</Text>
                      <Text style={styles.questName} numberOfLines={1}>{a.quest_title}</Text>
                      {a.due_date ? <Text style={styles.dueText}>Due {formatDate(a.due_date)}</Text> : null}
                    </View>
                    <Text style={styles.groupPercent}>{avg}%</Text>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#B8A671" />
                  </TouchableOpacity>

                  <AnimatedBar
                    percent={avg}
                    trackStyle={styles.track}
                    fillStyle={[styles.fill, { backgroundColor: everyoneDone ? GREEN : ORANGE }]}
                    delay={250 + Math.min(ri, 6) * 80}
                  />

                  <View style={styles.statusRow}>
                    <Text style={styles.memberCount}>
                      {members.filter(isDone).length}/{members.length} finished
                    </Text>
                    {latest ? (
                      <TouchableOpacity
                        style={[styles.statusBadge, { backgroundColor: latest.is_reviewed ? '#DBEAFE' : '#FEF3C7' }]}
                        onPress={() => router.push(`/(teacher)/submission/${latest.id}` as any)}
                      >
                        <Text style={[styles.statusText, { color: latest.is_reviewed ? '#1E40AF' : '#92400E' }]}>
                          {latest.is_reviewed ? 'Reviewed' : 'Needs review'} ›
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.statusBadge, { backgroundColor: everyoneDone ? '#DCFCE7' : '#F3F4F6' }]}>
                        <Text style={[styles.statusText, { color: everyoneDone ? '#166534' : '#6B7280' }]}>
                          {everyoneDone ? 'Ready to submit' : 'Not submitted'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {expanded && (
                    <View style={styles.membersBox}>
                      {members.length === 0 ? (
                        <Text style={styles.emptyMembers}>This group has no members yet.</Text>
                      ) : (
                        members.map((m) => {
                          const tint = AVATAR_TINTS[m.student % AVATAR_TINTS.length];
                          const needsHelp = !isDone(m) && m.percent_complete < 25;
                          return (
                            <View key={m.id} style={styles.memberRow}>
                              <View style={[styles.memberAvatar, { backgroundColor: tint.bg }]}>
                                <Text style={[styles.memberAvatarText, { color: tint.fg }]}>
                                  {m.student_username.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={styles.memberNameRow}>
                                  <Text style={styles.memberName} numberOfLines={1}>{m.student_username}</Text>
                                  {needsHelp ? (
                                    <View style={styles.helpPill}><Text style={styles.helpText}>Needs help</Text></View>
                                  ) : null}
                                </View>
                                <View style={styles.trackSmall}>
                                  <View
                                    style={[
                                      styles.fillSmall,
                                      { width: `${m.percent_complete}%`, backgroundColor: isDone(m) ? GREEN : ORANGE },
                                    ]}
                                  />
                                </View>
                              </View>
                              <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                                <Text style={styles.memberPercent}>{m.percent_complete}%</Text>
                                <Text style={styles.memberMeta}>
                                  {m.points_earned} pts{m.badge_earned ? ' • badge' : ''}
                                </Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
                </FadeIn>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: HEADER_BG, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  welcomeSmall: { fontSize: 12, color: HEADER_TEXT, opacity: 0.8 },
  welcomeName: { fontSize: 16, fontWeight: '800', color: HEADER_TEXT },
  dateText: { fontSize: 11, color: HEADER_TEXT, fontWeight: '600' },
  classText: { fontSize: 11, color: HEADER_TEXT, fontWeight: '700', marginTop: 2 },

  scrollContent: { padding: 20, paddingBottom: NAV_CLEARANCE },
  errorText: { color: '#B3261E', marginBottom: 12, fontSize: 13 },
  pageTitle: { fontSize: 22, fontWeight: '900', color: BROWN, marginBottom: 12 },
  hero: { backgroundColor: HERO_BG, borderRadius: 24, padding: 18, gap: 10, marginBottom: 16 },
  heroLabel: { color: GOLD, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTop: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  heroValue: { color: '#fff', fontSize: 44, fontWeight: '900', lineHeight: 48 },
  heroSub: { color: HERO_SOFT, fontSize: 13, flexShrink: 1 },
  heroTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  heroFill: { height: 8, borderRadius: 4, backgroundColor: GOLD },
  heroStats: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { color: '#fff', fontSize: 18, fontWeight: '900' },
  heroStatLabel: { color: HERO_SOFT, fontSize: 11, marginTop: 1 },
  heroDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)' },
  memberAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  memberAvatarText: { fontSize: 12, fontWeight: '800' },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helpPill: { backgroundColor: '#FDE9D2', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  helpText: { color: '#A34A0A', fontSize: 10, fontWeight: '800' },
  emptyText: { color: T('#8A6A2A'), fontStyle: 'italic', textAlign: 'center', marginTop: 24, lineHeight: 20 },

  pill: { maxWidth: 200, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: T('#EADEC9'), marginRight: 8 },
  pillActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  pillText: { fontSize: 12, fontWeight: '700', color: BROWN },
  pillTextActive: { color: '#fff' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', color: BROWN },
  statLabel: { fontSize: 10, color: T('#8A6A2A'), fontWeight: '600', marginTop: 2 },

  groupCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12 },
  groupTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupName: { fontSize: 15, fontWeight: '800', color: T('#7c2d12') },
  questName: { fontSize: 12, color: T('#8A6A2A'), marginTop: 2 },
  dueText: { fontSize: 11, color: '#B8A671', marginTop: 2 },
  groupPercent: { fontSize: 18, fontWeight: '900', color: ORANGE },

  track: { height: 8, backgroundColor: '#F3EBCB', borderRadius: 4, overflow: 'hidden', marginTop: 10 },
  fill: { height: 8, borderRadius: 4 },

  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  memberCount: { fontSize: 11, color: T('#8A6A2A'), fontWeight: '600' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '800' },

  membersBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(58,43,26,0.08)', paddingTop: 10 },
  emptyMembers: { fontSize: 12, color: T('#8A6A2A'), fontStyle: 'italic' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  memberName: { fontSize: 13, fontWeight: '700', color: BROWN, marginBottom: 5 },
  trackSmall: { height: 5, backgroundColor: '#F3EBCB', borderRadius: 3, overflow: 'hidden' },
  fillSmall: { height: 5, borderRadius: 3 },
  memberPercent: { fontSize: 13, fontWeight: '800', color: BROWN },
  memberMeta: { fontSize: 10, color: T('#8A6A2A'), marginTop: 2 },
});