// mobile/app/(teacher)/(tabs)/quests.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { T, HEADER_BG, HEADER_TEXT, activeTheme } from '../../../src/theme/theme';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyQuests } from '../../../src/api/quests';
import { getMyClasses } from '../../../src/api/classrooms';
import { getAssignmentsForQuest } from '../../../src/api/assignments';
import { Quest } from '../../../src/types/quests';
import { ClassSummary } from '../../../src/types/classrooms';
import AppHeader from '../../../src/components/AppHeader';
import { FadeIn, PressableScale } from '../../../src/components/Motion';
import QuestCover from '../../../src/components/QuestCover';
import { NAV_CLEARANCE } from '../../../src/components/FloatingTabBar';

const GOLD = T('#F5B921');
const CREAM = T('#F5EDD8');
const BROWN = T('#5C2C16');
const GREEN = '#22C55E';
const DARKTXT = T('#3A2B1A');
const ORANGE = T('#EA580C');

const CLASS_BADGE_COLORS = ['#93C5FD', '#86EFAC', '#FDE68A', '#FCA5A5', '#C4B5FD'];

interface QuestDates {
  assigned: string | null;
  due: string | null;
}

export default function TeacherQuestLibrary() {
  const router = useRouter();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [questDates, setQuestDates] = useState<Record<number, QuestDates>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // ---- Class filter — null means "All" ----
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  async function loadAll() {
    setError('');
    try {
      const [allQuests, allClasses] = await Promise.all([
        getMyQuests(),
        getMyClasses(),
      ]);
      setQuests(allQuests);
      setClasses(allClasses);

      const datesEntries = await Promise.all(
        allQuests.map(async (quest) => {
          try {
            const assignments = await getAssignmentsForQuest(quest.id);
            if (assignments.length === 0) {
              return [quest.id, { assigned: null, due: null }] as const;
            }
            const earliestCreated = assignments.reduce((earliest, a) =>
              new Date(a.created_at) < new Date(earliest) ? a.created_at : earliest, assignments[0].created_at);
            const dueDates = assignments.map((a) => a.due_date).filter((d): d is string => !!d);
            const earliestDue = dueDates.length > 0
              ? dueDates.reduce((earliest, d) => new Date(d) < new Date(earliest) ? d : earliest, dueDates[0])
              : null;
            return [quest.id, { assigned: earliestCreated, due: earliestDue }] as const;
          } catch {
            return [quest.id, { assigned: null, due: null }] as const;
          }
        })
      );
      setQuestDates(Object.fromEntries(datesEntries));
    } catch (e) {
      setError('Could not load quests. Pull down to try again.');
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadAll().finally(() => setIsLoading(false));
    }, [])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadAll();
    setIsRefreshing(false);
  }

  function classInfoFor(classIds: number[]): { name: string; color: string }[] {
  return classIds.map((id) => {
    const index = classes.findIndex((c) => c.id === id);
    const found = classes[index];
    return {
      name: found ? found.class_name : 'Unknown Class',
      color: CLASS_BADGE_COLORS[Math.max(index, 0) % CLASS_BADGE_COLORS.length],
    };
  });
}

  function formatDate(iso: string | null): string {
    if (!iso) return 'Not yet assigned';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }


  // ---- Apply the class filter before rendering ----
  const visibleQuests = selectedClassId === null
    ? quests
    : quests.filter((q) => q.classes.includes(selectedClassId));

  return (
    <View style={styles.screen}>
      <AppHeader role="teacher" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
      >
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.pageTitle}>Quests</Text>
            <Text style={styles.pageSub}>{quests.length} in your library</Text>
          </View>
          <PressableScale
            style={styles.createButton}
            scaleTo={0.94}
            onPress={() => router.push('/(teacher)/create-quest' as any)}
          >
            <Ionicons name="add" size={18} color={BROWN} />
            <Text style={styles.createButtonText}>New quest</Text>
          </PressableScale>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* ---- Class filter row ---- */}
        {classes.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterPill, selectedClassId === null && styles.filterPillActive]}
              onPress={() => setSelectedClassId(null)}
            >
              <Text style={[styles.filterPillText, selectedClassId === null && styles.filterPillTextActive]}>
                All ({quests.length})
              </Text>
            </TouchableOpacity>
            {classes.map((c) => {
              const count = quests.filter((q) => q.classes.includes(c.id)).length;
              const isActive = selectedClassId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setSelectedClassId(c.id)}
                >
                  <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                    {c.class_name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color={BROWN} style={{ marginTop: 20 }} />
        ) : visibleQuests.length === 0 ? (
          <Text style={styles.emptyText}>
            {quests.length === 0
              ? 'No quests yet. Tap "Create New Quest" to add one.'
              : 'No quests for this class yet.'}
          </Text>
        ) : (
          visibleQuests.map((quest, qi) => {
            const classInfoList = classInfoFor(quest.classes);
            const dates = questDates[quest.id] || { assigned: null, due: null };
            return (
              <FadeIn key={quest.id} delay={Math.min(qi, 6) * 70}>
              <PressableScale
                style={styles.questCard}
                scaleTo={0.97}
                onPress={() => router.push(`/(teacher)/quest/${quest.id}` as any)}
              >
                {quest.cover_image_url ? (
                  <QuestCover url={quest.cover_image_url} style={styles.cover} />
                ) : null}
                <Text style={styles.questTitle}>{quest.title}</Text>
                {quest.description ? <Text style={styles.questDescription} numberOfLines={2}>{quest.description}</Text> : null}

                <View style={styles.classBadgeRow}>
                  {classInfoList.map((info, idx) => (
                    <View key={idx} style={[styles.classBadge, { backgroundColor: info.color }]}>
                      <Text style={styles.classBadgeText}>{info.name}</Text>
                    </View>
                  ))}
                  <View style={[styles.statusBadge, quest.is_published ? styles.statusPublished : styles.statusDraft]}>
                    <Text style={[styles.statusBadgeText, { color: quest.is_published ? '#166534' : '#6B7280' }]}>{quest.is_published ? '● Published' : '● Draft'}</Text>
                  </View>
                </View>

                <View style={styles.datesRow}>
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={13} color={T('#8A6A2A')} />
                    <Text style={styles.dateLabel}>Assigned {formatDate(dates.assigned)}</Text>
                  </View>
                  <View style={styles.dateRow}>
                    <Ionicons name="time-outline" size={13} color={T('#8A6A2A')} />
                    <Text style={styles.dateLabel}>Due {formatDate(dates.due)}</Text>
                  </View>
                </View>
              </PressableScale>
              </FadeIn>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  scrollContent: { padding: 20, paddingBottom: NAV_CLEARANCE },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  pageTitle: { fontSize: 22, fontWeight: '900', color: BROWN },
  pageSub: { fontSize: 12, color: T('#8A6A2A'), marginTop: 2 },
  errorText: { color: '#B3261E', marginBottom: 12, fontSize: 13 },
  emptyText: { fontSize: 13, color: T('#8A6A2A'), marginTop: 16, textAlign: 'center' },

  createButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GOLD, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  createButtonText: { color: BROWN, fontSize: 13, fontWeight: '800' },

  filterScroll: { marginBottom: 16 },
  filterRow: { gap: 8, paddingRight: 8 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: T('#EADEC9') },
  filterPillActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  filterPillText: { fontSize: 12, fontWeight: '700', color: BROWN },
  filterPillTextActive: { color: '#fff' },

  questCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12 },
  cover: { width: '100%', aspectRatio: 16 / 7, borderRadius: 12, marginBottom: 12 },
  questTitle: { fontSize: 16, fontWeight: '900', color: DARKTXT, marginBottom: 4 },
  questDescription: { fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 17 },
  classBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  classBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  classBadgeText: { fontSize: 11, fontWeight: '700', color: '#1e3a5f' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  datesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, borderTopWidth: 1, borderTopColor: 'rgba(58,43,26,0.08)', paddingTop: 10 },
  statusPublished: { backgroundColor: '#DCFCE7' },
  statusDraft: { backgroundColor: '#F3F4F6' },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: BROWN },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateLabel: { fontSize: 11, color: T('#8A6A2A'), marginLeft: 4 },
});