// mobile/app/(student)/(tabs)/progress.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyProfile } from '../../../src/api/accounts';
import { getMyClasses } from '../../../src/api/classrooms';
import { getMyProgress, getProgressDetail, toggleChecklistItem } from '../../../src/api/assignments';
import { getUnreadNotifications } from '../../../src/api/notifications';
import { FullUser } from '../../../src/types/accounts';
import { ClassSummary } from '../../../src/types/classrooms';
import { QuestProgressDetail } from '../../../src/types/assignments';
import SubmitOutputCard from '../../../src/components/SubmitOutputCard';

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const CARD_BROWN = '#4A2E1D';
const GREEN = '#22C55E';
const ORANGE = '#EA580C';

export default function StudentProgress() {
  const router = useRouter();
  const [profile, setProfile] = useState<FullUser | null>(null);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [progress, setProgress] = useState<QuestProgressDetail | null>(null);
  const [hasAnyQuest, setHasAnyQuest] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentStepId, setCurrentStepId] = useState<number | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [p, c, list, unread] = await Promise.all([
        getMyProfile(),
        getMyClasses(),
        getMyProgress(),
        getUnreadNotifications(),
      ]);
      setProfile(p);
      setClasses(c);
      setUnreadCount(unread.length);
      setHasAnyQuest(list.length > 0);

      // "Current quest" = the first one not finished yet (same rule as Home).
      // If everything is finished, fall back to the most recent one so a leader
      // who still needs to submit the output can do it from here.
      const current =
        list.find((x) => !x.completed_at && x.percent_complete < 100) ?? list[list.length - 1] ?? null;
      if (!current) {
        setProgress(null);
        return;
      }

      const detail = await getProgressDetail(current.id);
      setProgress(detail);
      setCurrentStepId((prev) => {
        if (prev !== null && detail.steps.some((s) => s.id === prev)) return prev;
        const open = detail.steps.find((s) => s.status === 'available') ?? detail.steps[detail.steps.length - 1];
        return open ? open.id : null;
      });
      // A fully finished quest goes straight to the submission card
      setShowComplete(!!detail.completed_at);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not load your progress.');
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

  const steps = progress?.steps ?? [];
  const stepIndex = steps.findIndex((s) => s.id === currentStepId);
  const step = stepIndex >= 0 ? steps[stepIndex] : null;
  const prevStep = stepIndex > 0 ? steps[stepIndex - 1] : null;
  const nextStep = stepIndex >= 0 && stepIndex < steps.length - 1 ? steps[stepIndex + 1] : null;

  function handleBack() {
    if (prevStep) setCurrentStepId(prevStep.id);
    else if (progress) router.push(`/(student)/quest/${progress.id}/overview` as any);
  }

  function handleProceed() {
    if (!step || step.status !== 'completed') return;
    if (nextStep) setCurrentStepId(nextStep.id);
    else setShowComplete(true);
  }

  async function handleToggle(itemId: number, isChecked: boolean) {
    if (!progress || !step || step.status !== 'available' || togglingId !== null) return;
    const next = !isChecked;
    setTogglingId(itemId);

    setProgress((prev) =>
      prev
        ? {
            ...prev,
            steps: prev.steps.map((s) =>
              s.id !== step.id
                ? s
                : {
                    ...s,
                    checklist_items: s.checklist_items.map((i) =>
                      i.id === itemId ? { ...i, is_checked: next } : i
                    ),
                  }
            ),
          }
        : prev
    );

    try {
      setProgress(await toggleChecklistItem(progress.id, step.id, itemId, next));
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not save that. Please try again.');
      await load();
    } finally {
      setTogglingId(null);
    }
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const displayName = profile?.profile.first_name || profile?.username || '';

  const isCompleted = step?.status === 'completed';
  const isLocked = step?.status === 'locked';
  const total = step?.checklist_items.length ?? 0;
  const checkedCount = step?.checklist_items.filter((i) => i.is_checked).length ?? 0;
  const showRewards = isCompleted && progress && (progress.points_earned > 0 || progress.badge_earned);

  return (
    <View style={styles.screen}>
      {/* ---------------- Header + current quest card ---------------- */}
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
          <TouchableOpacity onPress={() => router.push('/(student)/notifications' as any)} style={{ marginLeft: 8 }}>
            <Ionicons name="notifications" size={20} color={BROWN} />
            {unreadCount > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        {progress && (
          <View style={styles.currentQuestCard}>
            <View style={styles.imagePlaceholder}>
              <Ionicons name="restaurant" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.currentLabel}>Your current quest:</Text>
              <Text style={styles.questTitle} numberOfLines={2}>{progress.quest_title}</Text>
              <Text style={styles.questMode}>
                {progress.quest_mode === 'group' ? 'Group Quest' : 'Individual Quest'}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress.percent_complete}%` }]} />
              </View>
              <Text style={styles.percentText}>{progress.percent_complete}%</Text>
            </View>
          </View>
        )}
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

          {!progress ? (
            <View style={styles.emptyCard}>
              <Ionicons name="trophy-outline" size={32} color="#B8A671" />
              <Text style={styles.emptyTitle}>
                {hasAnyQuest ? 'All quests completed!' : 'No quests yet'}
              </Text>
              <Text style={styles.emptyText}>
                {hasAnyQuest
                  ? 'Great job! New quests from your teacher will show up here.'
                  : 'Join a class and wait for your teacher to assign a quest.'}
              </Text>
            </View>
          ) : showComplete ? (
            // All steps done: submission card for the leader, waiting message for others
            <SubmitOutputCard progress={progress} />
          ) : !step ? (
            <Text style={styles.emptyText}>This quest has no steps yet.</Text>
          ) : (
            <View style={styles.stepCard}>
              <View style={styles.stepHeaderRow}>
                <Text style={styles.stepLabel}>Step {step.step_order}</Text>
                {isCompleted && <Ionicons name="checkmark-circle" size={18} color={GREEN} />}
              </View>

              <View style={styles.stepBodyRow}>
                <View style={styles.stepImagePlaceholder}>
                  <Ionicons name="image-outline" size={22} color="#B08968" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.instruction}</Text>
                </View>
              </View>

              {isLocked ? (
                <View style={styles.lockedBox}>
                  <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
                  <Text style={styles.lockedText}>
                    {prevStep ? `Complete Step ${prevStep.step_order} to unlock this step.` : 'This step is locked.'}
                  </Text>
                </View>
              ) : (
                total > 0 && (
                  <>
                    <Text style={styles.checklistLabel}>Checklist: ({checkedCount}/{total})</Text>
                    {step.checklist_items.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.checklistRow}
                        onPress={() => handleToggle(item.id, item.is_checked)}
                        activeOpacity={isCompleted ? 1 : 0.7}
                        disabled={isCompleted}
                      >
                        <View style={[styles.checkbox, item.is_checked && styles.checkboxChecked]}>
                          {item.is_checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                        <Text style={[styles.checklistText, item.is_checked && styles.checklistTextChecked]}>
                          {item.checklist_text}
                        </Text>
                        {togglingId === item.id && <ActivityIndicator size="small" color={ORANGE} />}
                      </TouchableOpacity>
                    ))}
                  </>
                )
              )}

              <View style={styles.actionsRow}>
                <TouchableOpacity onPress={handleBack}>
                  <Text style={styles.backToStepText}>
                    {prevStep ? `Back to Step ${prevStep.step_order}` : 'View Overview'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.proceedButton, !isCompleted && styles.proceedButtonDisabled]}
                  onPress={handleProceed}
                  disabled={!isCompleted}
                >
                  <Text style={styles.proceedButtonText}>
                    {nextStep ? 'Proceed to Next Step' : 'Complete Quest'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showRewards && progress && (
                <View style={styles.rewardsRow}>
                  <Text style={styles.rewardsLabel}>Rewards Earned:</Text>
                  <View style={styles.rewardsIcons}>
                    {progress.badge_earned && (
                      <View style={styles.badgePill}>
                        <Ionicons name="ribbon" size={16} color="#fff" />
                      </View>
                    )}
                    <View style={styles.pointsPill}>
                      <Text style={styles.pointsPillText}>+{progress.points_earned}</Text>
                    </View>
                  </View>
                </View>
              )}
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

  header: { backgroundColor: GOLD, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  welcomeSmall: { fontSize: 12, color: BROWN, opacity: 0.8 },
  welcomeName: { fontSize: 16, fontWeight: '800', color: BROWN },
  dateText: { fontSize: 11, color: BROWN, fontWeight: '600' },
  classText: { fontSize: 11, color: BROWN, fontWeight: '700', marginTop: 2 },
  bellDot: { position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },

  currentQuestCard: { backgroundColor: CARD_BROWN, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center' },
  imagePlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#8a5a3a', alignItems: 'center', justifyContent: 'center' },
  currentLabel: { color: '#fff', opacity: 0.8, fontSize: 10, marginBottom: 2 },
  questTitle: { color: ORANGE, fontSize: 15, fontWeight: '800' },
  questMode: { color: '#fbbf24', fontSize: 11, fontStyle: 'italic', marginBottom: 6 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: GREEN, borderRadius: 3 },
  percentText: { color: '#fff', fontSize: 10, marginTop: 3, fontStyle: 'italic' },

  scrollContent: { padding: 20, paddingBottom: 60 },
  errorText: { color: '#B3261E', marginBottom: 12, fontSize: 13 },

  emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: BROWN },
  emptyText: { color: '#8A6A2A', fontSize: 13, textAlign: 'center', lineHeight: 19 },

  stepCard: { backgroundColor: '#FFFBEB', borderRadius: 20, borderWidth: 2, borderColor: ORANGE, padding: 18 },
  stepHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  stepLabel: { fontSize: 13, fontWeight: '700', color: '#8A6A2A' },

  stepBodyRow: { flexDirection: 'row', marginBottom: 18 },
  stepImagePlaceholder: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#EADEC9', alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 16, fontWeight: '800', color: ORANGE, marginBottom: 4 },
  stepDescription: { fontSize: 12, color: '#666', lineHeight: 17 },

  checklistLabel: { fontSize: 14, fontWeight: '800', color: BROWN, marginBottom: 10 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D8C9A3', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checkboxChecked: { backgroundColor: ORANGE, borderColor: ORANGE },
  checklistText: { fontSize: 13, color: BROWN, fontWeight: '600', flex: 1 },
  checklistTextChecked: { color: ORANGE },

  lockedBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EDEDED', borderRadius: 12, padding: 12 },
  lockedText: { flex: 1, fontSize: 12, color: '#6B7280' },

  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  backToStepText: { fontSize: 13, fontWeight: '700', color: BROWN },
  proceedButton: { backgroundColor: GREEN, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  proceedButtonDisabled: { backgroundColor: '#D8D8D8' },
  proceedButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  rewardsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  rewardsLabel: { fontSize: 13, fontWeight: '800', color: BROWN },
  rewardsIcons: { flexDirection: 'row', gap: 8 },
  badgePill: { width: 30, height: 30, borderRadius: 15, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  pointsPill: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  pointsPillText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});