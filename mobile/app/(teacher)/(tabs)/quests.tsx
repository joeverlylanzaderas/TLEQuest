// mobile/app/(teacher)/(tabs)/quests.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyProfile } from '../../../src/api/accounts';
import { getMyQuests } from '../../../src/api/quests';
import { getMyClasses } from '../../../src/api/classrooms';
import { getAssignmentsForQuest } from '../../../src/api/assignments';
import { Quest } from '../../../src/types/quests';
import { ClassSummary } from '../../../src/types/classrooms';

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const GREEN = '#22C55E';
const ORANGE = '#EA580C';

const CLASS_BADGE_COLORS = ['#93C5FD', '#86EFAC', '#FDE68A', '#FCA5A5', '#C4B5FD'];

interface QuestDates {
  assigned: string | null;
  due: string | null;
}

export default function TeacherQuestLibrary() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState('');
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
      const [profile, allQuests, allClasses] = await Promise.all([
        getMyProfile(),
        getMyQuests(),
        getMyClasses(),
      ]);
      setTeacherName(profile.profile.first_name || profile.username);
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

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // ---- Apply the class filter before rendering ----
  const visibleQuests = selectedClassId === null
    ? quests
    : quests.filter((q) => q.classes.includes(selectedClassId));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={20} color={BROWN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeSmall}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{teacherName || '...'}!</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.dateText}>{today}</Text>
            <Text style={styles.classText}>Teacher's Portal</Text>
          </View>
          <Ionicons name="notifications" size={20} color={BROWN} style={{ marginLeft: 8 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
      >
        <View style={styles.titleRow}>
          <Ionicons name="arrow-back" size={20} color={BROWN} onPress={() => router.back()} />
          <Text style={styles.pageTitle}>Quest Library</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/(teacher)/create-quest' as any)}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.createButtonText}>Create New Quest</Text>
        </TouchableOpacity>

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
          visibleQuests.map((quest) => {
            const classInfoList = classInfoFor(quest.classes);
            const dates = questDates[quest.id] || { assigned: null, due: null };
            return (
              <TouchableOpacity
                key={quest.id}
                style={styles.questCard}
                onPress={() => router.push(`/(teacher)/quest/${quest.id}` as any)}
              >
                <Text style={styles.questTitle}>{quest.title}</Text>
                {quest.description ? <Text style={styles.questDescription}>{quest.description}</Text> : null}

                <View style={styles.classBadgeRow}>
                  {classInfoList.map((info, idx) => (
                    <View key={idx} style={[styles.classBadge, { backgroundColor: info.color }]}>
                      <Text style={styles.classBadgeText}>{info.name}</Text>
                    </View>
                  ))}
                  <View style={[styles.statusBadge, quest.is_published ? styles.statusPublished : styles.statusDraft]}>
                    <Text style={styles.statusBadgeText}>{quest.is_published ? 'Published' : 'Draft'}</Text>
                  </View>
                </View>

                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={13} color="#8A6A2A" />
                  <Text style={styles.dateLabel}>Assigned: {formatDate(dates.assigned)}</Text>
                </View>
                <View style={styles.dateRow}>
                  <Ionicons name="time-outline" size={13} color="#8A6A2A" />
                  <Text style={styles.dateLabel}>Due: {formatDate(dates.due)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  header: { backgroundColor: GOLD, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  welcomeSmall: { fontSize: 12, color: BROWN, opacity: 0.8 },
  welcomeName: { fontSize: 16, fontWeight: '800', color: BROWN },
  dateText: { fontSize: 11, color: BROWN, fontWeight: '600' },
  classText: { fontSize: 11, color: BROWN, fontWeight: '700', marginTop: 2 },

  scrollContent: { padding: 20, paddingBottom: 60 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: BROWN },
  errorText: { color: '#B3261E', marginBottom: 12, fontSize: 13 },
  emptyText: { fontSize: 13, color: '#8A6A2A', marginTop: 16, textAlign: 'center' },

  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: GREEN, borderRadius: 14, paddingVertical: 14, marginBottom: 16 },
  createButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  filterScroll: { marginBottom: 16 },
  filterRow: { gap: 8, paddingRight: 8 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EADEC9' },
  filterPillActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  filterPillText: { fontSize: 12, fontWeight: '700', color: BROWN },
  filterPillTextActive: { color: '#fff' },

  questCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  questTitle: { fontSize: 15, fontWeight: '800', color: '#ea580c', marginBottom: 4 },
  questDescription: { fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 17 },
  classBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  classBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  classBadgeText: { fontSize: 11, fontWeight: '700', color: '#1e3a5f' },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusPublished: { backgroundColor: '#DCFCE7' },
  statusDraft: { backgroundColor: '#F3F4F6' },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: BROWN },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dateLabel: { fontSize: 11, color: '#8A6A2A', marginLeft: 4 },
});