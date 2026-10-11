// mobile/app/(student)/quest/[id]/step/[stepId].tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyProfile } from '../../../../../src/api/accounts';
import { getMyClasses } from '../../../../../src/api/classrooms';
import { getProgressDetail, toggleChecklistItem } from '../../../../../src/api/assignments';
import { QuestProgressDetail } from '../../../../../src/types/assignments';
import { FullUser } from '../../../../../src/types/accounts';
import SubmitOutputCard from '../../../../../src/components/SubmitOutputCard';
import ReviewStatusNote from '../../../../../src/components/ReviewStatusNote';
import QuestCover from '../../../../../src/components/QuestCover';

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const CARD_BROWN = '#4A2E1D';
const GREEN = '#22C55E';
const ORANGE = '#EA580C';

const TABS = [
  { icon: 'restaurant-outline', label: 'Quests', route: '/(student)/(tabs)/quests', active: true },
  { icon: 'ribbon-outline', label: 'Submissions', route: '/(student)/(tabs)/submissions', active: false },
  { icon: 'home-outline', label: 'Home', route: '/(student)/(tabs)/home', active: false },
  { icon: 'bar-chart-outline', label: 'Progress', route: '/(student)/(tabs)/progress', active: false },
  { icon: 'person-outline', label: 'Profile', route: '/(student)/(tabs)/profile', active: false },
];

export default function QuestStepScreen() {
  const router = useRouter();
  const { id, stepId } = useLocalSearchParams<{ id: string; stepId: string }>();
  const progressId = Number(id);

  const [progress, setProgress] = useState<QuestProgressDetail | null>(null);
  const [profile, setProfile] = useState<FullUser | null>(null);
  const [className, setClassName] = useState('');
  const [currentStepId, setCurrentStepId] = useState(Number(stepId));
  const [showComplete, setShowComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    getMyProfile().then(setProfile).catch(() => {});
    getMyClasses().then((c) => setClassName(c[0]?.class_name ?? '')).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      setProgress(await getProgressDetail(progressId));
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not load this step.');
    }
  }, [progressId]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setIsLoading(false));
    }, [load])
  );

  const steps = progress?.steps ?? [];
  const stepIndex = steps.findIndex((s) => s.id === currentStepId);
  const step = stepIndex >= 0 ? steps[stepIndex] : null;
  const prevStep = stepIndex > 0 ? steps[stepIndex - 1] : null;
  const nextStep = stepIndex >= 0 && stepIndex < steps.length - 1 ? steps[stepIndex + 1] : null;

  function goToOverview() {
    if (router.canGoBack()) router.back();
    else router.replace(`/(student)/quest/${progressId}/overview` as any);
  }

  function handleBack() {
    if (prevStep) setCurrentStepId(prevStep.id);
    else goToOverview();
  }

  function handleProceed() {
    if (!step || step.status !== 'completed') return;
    if (nextStep) setCurrentStepId(nextStep.id);
    else setShowComplete(true);
  }

  async function handleToggle(itemId: number, isChecked: boolean) {
    if (!step || step.status !== 'available' || togglingId !== null) return;

    const next = !isChecked;
    setTogglingId(itemId);

    // Optimistic update so the checkbox responds instantly
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
      setProgress(await toggleChecklistItem(progressId, step.id, itemId, next));
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not save that. Please try again.');
      await load();
    } finally {
      setTogglingId(null);
    }
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  if (!progress || !step) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Step not found.'}</Text>
        <TouchableOpacity style={styles.backPill} onPress={goToOverview}>
          <Text style={styles.backPillText}>Back to Overview</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLocked = step.status === 'locked';
  const isCompleted = step.status === 'completed';
  const total = step.checklist_items.length;
  const checkedCount = step.checklist_items.filter((i) => i.is_checked).length;
  const showRewards = isCompleted && (progress.points_earned > 0 || progress.badge_earned);

  return (
    <View style={styles.screen}>
      {/* ---------------- Header ---------------- */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={20} color={BROWN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeSmall}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{profile?.profile.first_name || profile?.username || ''}!</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.dateText}>{today}</Text>
            <Text style={styles.classText}>{className}</Text>
          </View>
        </View>

        <View style={styles.currentQuestCard}>
          <QuestCover url={progress.quest_cover_image_url} style={styles.imagePlaceholder} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.questTitle} numberOfLines={1}>{progress.quest_title}</Text>
            <Text style={styles.questMode}>
              {progress.quest_mode === 'group' ? 'Group Quest' : 'Individual Quest'}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress.percent_complete}%` }]} />
            </View>
            <Text style={styles.percentText}>{progress.percent_complete}%</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {showComplete ? (
          // All steps done: submission card (leader) or waiting message (others)
          <View>
            <SubmitOutputCard progress={progress} />
            <TouchableOpacity style={styles.overviewButton} onPress={goToOverview}>
              <Text style={styles.overviewButtonText}>Back to Overview</Text>
            </TouchableOpacity>
          </View>
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
                  {prevStep ? `Back to Step ${prevStep.step_order}` : 'Back to Overview'}
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

            {step.is_final_step && isCompleted && <ReviewStatusNote status={progress.review_status} />}
            {showRewards && (
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

      {/* ---------------- Bottom tab bar ---------------- */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.label}
            style={styles.tabIconWrapper}
            onPress={() => router.navigate(t.route as any)}
          >
            <Ionicons name={t.icon as any} size={20} color={t.active ? ORANGE : '#B8A671'} />
            <Text style={[styles.tabLabel, t.active && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM, padding: 24 },
  errorText: { color: '#B3261E', marginBottom: 16, textAlign: 'center' },
  backPill: { backgroundColor: BROWN, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  backPillText: { color: '#fff', fontWeight: '700' },

  header: {
    backgroundColor: GOLD, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  welcomeSmall: { fontSize: 12, color: BROWN, opacity: 0.8 },
  welcomeName: { fontSize: 16, fontWeight: '800', color: BROWN },
  dateText: { fontSize: 11, color: BROWN, fontWeight: '600' },
  classText: { fontSize: 11, color: BROWN, fontWeight: '700', marginTop: 2 },

  currentQuestCard: { backgroundColor: CARD_BROWN, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center' },
  imagePlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#8a5a3a', alignItems: 'center', justifyContent: 'center' },
  questTitle: { color: ORANGE, fontSize: 15, fontWeight: '800' },
  questMode: { color: '#fbbf24', fontSize: 11, fontStyle: 'italic', marginBottom: 6 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  percentText: { color: '#fff', fontSize: 10, marginTop: 3, fontStyle: 'italic' },

  scrollContent: { padding: 20, paddingBottom: 20 },

  stepCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 2, borderColor: ORANGE, padding: 18 },
  stepHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  stepLabel: { fontSize: 13, fontWeight: '700', color: '#8A6A2A' },

  stepBodyRow: { flexDirection: 'row', marginBottom: 18 },
  stepImagePlaceholder: {
    width: 64, height: 64, borderRadius: 12, backgroundColor: '#EADEC9',
    alignItems: 'center', justifyContent: 'center',
  },
  stepTitle: { fontSize: 16, fontWeight: '800', color: ORANGE, marginBottom: 4 },
  stepDescription: { fontSize: 12, color: '#666', lineHeight: 17 },

  checklistLabel: { fontSize: 14, fontWeight: '800', color: BROWN, marginBottom: 10 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D8C9A3',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
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

  rewardsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  rewardsLabel: { fontSize: 13, fontWeight: '800', color: BROWN },
  rewardsIcons: { flexDirection: 'row', gap: 8 },
  badgePill: { width: 30, height: 30, borderRadius: 15, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  pointsPill: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  pointsPillText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  overviewButton: { alignSelf: 'center', marginTop: 14, backgroundColor: BROWN, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 10 },
  overviewButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#F5EAD1', paddingVertical: 10,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, justifyContent: 'space-around',
  },
  tabIconWrapper: { alignItems: 'center', gap: 2, paddingHorizontal: 6 },
  tabLabel: { fontSize: 10, color: '#B8A671', fontWeight: '600' },
  tabLabelActive: { color: ORANGE, fontWeight: '800' },
});