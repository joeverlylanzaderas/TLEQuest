// mobile/app/(student)/quest/[id]/overview.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getProgressDetail } from '../../../../src/api/assignments';
import { QuestProgressDetail, ProgressStep } from '../../../../src/types/assignments';
import SubmitOutputCard from '../../../../src/components/SubmitOutputCard';

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const CARD_BROWN = '#4A2E1D';
const GREEN = '#22C55E';
const ORANGE = '#EA580C';

function checkedCount(step: ProgressStep): number {
  return step.checklist_items.filter((i) => i.is_checked).length;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function QuestOverview() {
  const router = useRouter();
  // [id] is the QuestProgress id (what Home and the Quests tab push), not the quest id
  const { id } = useLocalSearchParams<{ id: string }>();
  const progressId = Number(id);

  const [progress, setProgress] = useState<QuestProgressDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setProgress(await getProgressDetail(progressId));
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not load this quest.');
    }
  }, [progressId]);

  // Refetch whenever this screen regains focus (e.g. coming back from a step)
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

  function openStep(step: ProgressStep) {
    if (step.status === 'locked') return;
    router.push(`/(student)/quest/${progressId}/step/${step.id}` as any);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={20} color={BROWN} />
          <Text style={styles.backTitle}>Quest Overview</Text>
        </TouchableOpacity>

        {progress && (
          <View style={styles.currentQuestCard}>
            <View style={styles.imagePlaceholder}>
              <Ionicons name="restaurant" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.questTitle} numberOfLines={2}>{progress.quest_title}</Text>
              <Text style={styles.questMode}>
                {progress.quest_mode === 'group' ? 'Group Quest' : 'Individual Quest'}
                {progress.group_name ? ` • ${progress.group_name}` : ''}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress.percent_complete}%` }]} />
              </View>
              <Text style={styles.percentText}>
                {progress.percent_complete}%{progress.due_date ? `  •  Due ${formatDate(progress.due_date)}` : ''}
              </Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {progress?.quest_description ? (
          <View style={styles.aboutCard}>
            <Text style={styles.aboutLabel}>ABOUT THIS QUEST</Text>
            <Text style={styles.aboutText}>{progress.quest_description}</Text>
          </View>
        ) : null}

        {progress && progress.steps.length === 0 ? (
          <Text style={styles.emptyText}>This quest has no steps yet.</Text>
        ) : null}

        {progress?.steps.map((step, index) => {
          const isLocked = step.status === 'locked';
          const isCompleted = step.status === 'completed';
          const checked = checkedCount(step);
          const total = step.checklist_items.length;
          const previousOrder = index > 0 ? progress.steps[index - 1].step_order : null;

          return (
            <TouchableOpacity
              key={step.id}
              activeOpacity={isLocked ? 1 : 0.7}
              onPress={() => openStep(step)}
              style={[styles.stepCard, isLocked && styles.stepCardLocked]}
            >
              <View
                style={[
                  styles.stepBadge,
                  isCompleted && styles.stepBadgeCompleted,
                  isLocked && styles.stepBadgeLocked,
                ]}
              >
                <Text style={styles.stepBadgeText}>{step.step_order}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription} numberOfLines={2}>{step.instruction}</Text>
                <Text style={styles.stepChecklistMeta}>{checked}/{total} checklist items</Text>

                {isLocked ? (
                  <View style={styles.lockedRow}>
                    <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
                    <Text style={styles.unlockHint}>Complete Step {previousOrder} to unlock!</Text>
                  </View>
                ) : (
                  <View style={[styles.stepButton, isCompleted && styles.stepButtonCompleted]}>
                    <Text style={[styles.stepButtonText, isCompleted && styles.stepButtonTextCompleted]}>
                      {isCompleted ? 'Completed' : checked > 0 ? 'Continue' : 'Complete Step'}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {progress?.completed_at ? <SubmitOutputCard progress={progress} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM },
  header: { backgroundColor: GOLD, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backTitle: { fontSize: 17, fontWeight: '800', color: BROWN, marginLeft: 8 },

  currentQuestCard: { backgroundColor: CARD_BROWN, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center' },
  imagePlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#8a5a3a', alignItems: 'center', justifyContent: 'center' },
  questTitle: { color: ORANGE, fontSize: 15, fontWeight: '800' },
  questMode: { color: '#fbbf24', fontSize: 11, fontStyle: 'italic', marginBottom: 6 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  percentText: { color: '#fff', fontSize: 10, marginTop: 3 },

  scrollContent: { padding: 20, paddingBottom: 60 },
  errorText: { color: '#B3261E', marginBottom: 12, fontSize: 13 },
  emptyText: { color: '#8A6A2A', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },

  aboutCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14 },
  aboutLabel: { fontSize: 10, fontWeight: '800', color: '#8A6A2A', letterSpacing: 0.5, marginBottom: 4 },
  aboutText: { fontSize: 13, color: '#444', lineHeight: 19 },

  stepCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14 },
  stepCardLocked: { backgroundColor: '#EDEDED', opacity: 0.75 },
  stepBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepBadgeCompleted: { backgroundColor: GREEN },
  stepBadgeLocked: { backgroundColor: '#9CA3AF' },
  stepBadgeText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  stepTitle: { fontSize: 14, fontWeight: '800', color: '#7c2d12', marginBottom: 4 },
  stepDescription: { fontSize: 12, color: '#666', marginBottom: 6, lineHeight: 17 },
  stepChecklistMeta: { fontSize: 11, color: '#8A6A2A', marginBottom: 8 },

  stepButton: { alignSelf: 'flex-start', backgroundColor: '#fde68a', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  stepButtonCompleted: { backgroundColor: GREEN },
  stepButtonText: { fontSize: 12, fontWeight: '700', color: BROWN },
  stepButtonTextCompleted: { color: '#fff' },

  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unlockHint: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' },
});