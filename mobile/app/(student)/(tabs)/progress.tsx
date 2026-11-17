// mobile/app/(student)/(tabs)/progress.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, Alert, Image,
} from 'react-native';
import { T, activeTheme } from '../../../src/theme/theme';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { refreshClasses, inSelectedClass, useClassScope } from '../../../src/utils/selectedClass';
import AppHeader from '../../../src/components/AppHeader';
import { FadeIn, AnimatedBar, Pop, PressableScale, CountUp } from '../../../src/components/Motion';
import { useAuth } from '../../../src/context/AuthContext';
import { getMyProgress, getProgressDetail, toggleChecklistItem } from '../../../src/api/assignments';
import { QuestProgress, QuestProgressDetail } from '../../../src/types/assignments';
import { getMyRewards, getMyRewardSummary } from '../../../src/api/rewards';
import { StudentReward } from '../../../src/types/rewards';
import { getMediaUrl } from '../../../src/utils/media';
import SubmitOutputCard from '../../../src/components/SubmitOutputCard';
import { NAV_CLEARANCE } from '../../../src/components/FloatingTabBar';

const GOLD = T('#F5B921');
const CREAM = T('#F5EDD8');
const BROWN = T('#5C2C16');
const CARD_BROWN = activeTheme === 'school' ? '#15366B' : '#4A2E1D';
const GREEN = '#22C55E';
const ORANGE = T('#EA580C');

export default function StudentProgress() {
  const router = useRouter();
  const { user } = useAuth();
  const scope = useClassScope();
  const [progress, setProgress] = useState<QuestProgressDetail | null>(null);
  const [hasAnyQuest, setHasAnyQuest] = useState(false);
  const [currentStepId, setCurrentStepId] = useState<number | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [quests, setQuests] = useState<QuestProgress[]>([]);
  const [rewards, setRewards] = useState<StudentReward[]>([]);
  const [totals, setTotals] = useState<{ points: number; badges: number } | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [snap, allList, rewardList, summary] = await Promise.all([
        refreshClasses(user!.id),
        getMyProgress(),
        getMyRewards().catch(() => [] as StudentReward[]),
        getMyRewardSummary().catch(() => null),
      ]);
      const list = allList.filter((x) => inSelectedClass(snap, x.group));
      setHasAnyQuest(list.length > 0);
      setQuests(list);
      setRewards(rewardList);
      setTotals(summary ? { points: summary.total_points, badges: summary.total_badges } : null);

      // "Current quest" = the first one not finished yet (same rule as Home).
      // If everything is finished, fall back to the most recent one so a leader
      // who still needs to submit the output can do it from here.
      const current =
        list.find((x) => !x.completed_at && x.percent_complete < 100) ??
        list.find((x) => x.completed_at && x.review_status === 'none') ??
        null;
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
  }, [user?.id, scope.selectedId]);

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

  const isCompleted = step?.status === 'completed';
  const isLocked = step?.status === 'locked';
  const total = step?.checklist_items.length ?? 0;
  const checkedCount = step?.checklist_items.filter((i) => i.is_checked).length ?? 0;
  const showRewards = isCompleted && progress && (progress.points_earned > 0 || progress.badge_earned);

  // ---- summary numbers ----
  const totalPoints = totals ? totals.points : rewards.reduce((sum, r) => sum + (r.points_awarded || 0), 0);
  const badgeMap = new Map<number, { id: number; name: string; imageUrl: string | null }>();
  rewards
    .filter((r) => r.reward_detail.reward_type === 'badge')
    .forEach((r) => {
      if (!badgeMap.has(r.reward)) {
        badgeMap.set(r.reward, { id: r.reward, name: r.reward_detail.reward_name, imageUrl: getMediaUrl(r.reward_detail.badge_image) });
      }
    });
  const badges = Array.from(badgeMap.values());
  const badgeTotal = totals ? totals.badges : badges.length;
  const doneQuests = quests.filter((q) => !!q.completed_at || q.percent_complete >= 100).length;
  const donePercent = quests.length ? Math.round((doneQuests / quests.length) * 100) : 0;
  const latestFeedback = quests
    .filter((q) => q.teacher_feedback && q.teacher_feedback.trim())
    .sort((a, b) => (b.reviewed_at || '').localeCompare(a.reviewed_at || ''))[0] ?? null;

  return (
    <View style={styles.screen}>
      <AppHeader role="student">
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>TOTAL POINTS</Text>
              <View style={styles.heroPointsRow}>
                <CountUp value={totalPoints} style={styles.heroPoints} />
                <Text style={styles.heroPts}>pts</Text>
              </View>
            </View>
            <View style={styles.heroBadgeChip}>
              <Ionicons name="ribbon" size={16} color={BROWN} />
              <Text style={styles.heroBadgeText}>{badgeTotal} {badgeTotal === 1 ? 'badge' : 'badges'}</Text>
            </View>
          </View>
          <AnimatedBar percent={donePercent} trackStyle={styles.progressTrack} fillStyle={styles.heroFill} />
          <Text style={styles.heroSub}>
            {quests.length === 0 ? 'No quests yet' : `${doneQuests} of ${quests.length} ${quests.length === 1 ? 'quest' : 'quests'} completed`}
          </Text>
        </View>
      </AppHeader>

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

          {progress ? (
            <FadeIn>
              <Text style={styles.sectionTitle}>Current quest</Text>
              <View style={styles.questInfo}>
                <View style={styles.questInfoTop}>
                  <Text style={styles.questInfoTitle} numberOfLines={2}>{progress.quest_title}</Text>
                  <Text style={styles.questInfoPercent}>{progress.percent_complete}%</Text>
                </View>
                <Text style={styles.questInfoMode}>
                  {progress.quest_mode === 'group' ? 'Group Quest' : 'Individual Quest'}
                </Text>
                <AnimatedBar percent={progress.percent_complete} trackStyle={styles.infoTrack} fillStyle={styles.infoFill} />
              </View>
            </FadeIn>
          ) : null}

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
            <FadeIn delay={150}>
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
                          {item.is_checked && <Pop><Ionicons name="checkmark" size={14} color="#fff" /></Pop>}
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
            </FadeIn>
          )}

          {/* ---------------- Badges ---------------- */}
          <FadeIn delay={250}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Badges</Text>
              <TouchableOpacity onPress={() => router.navigate('/(student)/(tabs)/profile' as any)} hitSlop={8}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {badges.length === 0 ? (
              <View style={styles.softCard}>
                <Text style={styles.softText}>No badges yet. Finish quests to earn them!</Text>
              </View>
            ) : (
              <View style={styles.badgeRow}>
                {badges.slice(0, 4).map((b, i) => (
                  <Pop key={b.id} delay={300 + i * 90} style={styles.badgeTile}>
                    {b.imageUrl ? (
                      <Image source={{ uri: b.imageUrl }} style={styles.badgeImg} />
                    ) : (
                      <View style={[styles.badgeImg, styles.badgeFallback]}>
                        <Ionicons name="ribbon" size={24} color={BROWN} />
                      </View>
                    )}
                    <Text style={styles.badgeName} numberOfLines={2}>{b.name}</Text>
                  </Pop>
                ))}
              </View>
            )}
          </FadeIn>

          {/* ---------------- Latest feedback ---------------- */}
          {latestFeedback ? (
            <FadeIn delay={350}>
              <Text style={styles.sectionTitle}>Latest feedback</Text>
              <View style={styles.feedbackCard}>
                <View style={styles.feedbackIcon}>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#1F5A35" />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.feedbackQuest} numberOfLines={1}>{latestFeedback.quest_title}</Text>
                  <Text style={styles.feedbackText}>{latestFeedback.teacher_feedback}</Text>
                </View>
              </View>
            </FadeIn>
          ) : null}

          {/* ---------------- All quests ---------------- */}
          {quests.length > 0 ? (
            <FadeIn delay={450}>
              <Text style={styles.sectionTitle}>Quests</Text>
              {quests.map((q) => {
                const done = !!q.completed_at || q.percent_complete >= 100;
                return (
                  <PressableScale
                    key={q.id}
                    style={styles.questRow}
                    scaleTo={0.97}
                    onPress={() => router.push(`/(student)/quest/${q.id}/overview` as any)}
                  >
                    <Text style={styles.questRowTitle} numberOfLines={1}>{q.quest_title}</Text>
                    {done ? (
                      <View style={styles.doneChip}><Text style={styles.doneChipText}>Done</Text></View>
                    ) : (
                      <>
                        <AnimatedBar percent={q.percent_complete} trackStyle={styles.rowTrack} fillStyle={styles.rowFill} />
                        <Text style={styles.rowPercent}>{q.percent_complete}%</Text>
                      </>
                    )}
                  </PressableScale>
                );
              })}
            </FadeIn>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    hero: { backgroundColor: CARD_BROWN, borderRadius: 22, padding: 16, gap: 10 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLabel: { color: GOLD, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroPointsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  heroPoints: { color: '#fff', fontSize: 40, fontWeight: '900', lineHeight: 46 },
  heroPts: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  heroBadgeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: GOLD, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  heroBadgeText: { color: BROWN, fontSize: 12, fontWeight: '800' },
  heroFill: { height: 6, backgroundColor: GOLD, borderRadius: 3 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: BROWN, marginTop: 22, marginBottom: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  seeAll: { fontSize: 12, fontWeight: '700', color: ORANGE, marginBottom: 10 },

  questInfo: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12, gap: 6 },
  questInfoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  questInfoTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: BROWN },
  questInfoPercent: { fontSize: 13, fontWeight: '800', color: ORANGE },
  questInfoMode: { fontSize: 11, color: T('#8A6A2A'), fontStyle: 'italic' },
  infoTrack: { height: 6, backgroundColor: '#F1E6CC', borderRadius: 3, overflow: 'hidden', marginTop: 2 },
  infoFill: { height: 6, backgroundColor: GREEN, borderRadius: 3 },

  softCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  softText: { color: T('#8A6A2A'), fontSize: 13, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', gap: 10 },
  badgeTile: { flex: 1, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 8 },
  badgeImg: { width: 48, height: 48, borderRadius: 24 },
  badgeFallback: { backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  badgeName: { fontSize: 11, fontWeight: '700', color: BROWN, textAlign: 'center' },

  feedbackCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 18, padding: 14 },
  feedbackIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#CDE7D3', alignItems: 'center', justifyContent: 'center' },
  feedbackQuest: { fontSize: 12, fontWeight: '700', color: T('#8A6A2A') },
  feedbackText: { fontSize: 14, lineHeight: 20, color: BROWN },

  questRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 },
  questRowTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: BROWN },
  rowTrack: { width: 80, height: 6, backgroundColor: '#F1E6CC', borderRadius: 3, overflow: 'hidden' },
  rowFill: { height: 6, backgroundColor: GOLD, borderRadius: 3 },
  rowPercent: { width: 36, textAlign: 'right', fontSize: 12, fontWeight: '800', color: BROWN },
  doneChip: { backgroundColor: '#E3F3E9', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  doneChipText: { color: '#166B3A', fontSize: 11, fontWeight: '700' },

  imagePlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: activeTheme === 'school' ? '#2F6FD0' : '#8a5a3a', alignItems: 'center', justifyContent: 'center' },
  currentLabel: { color: '#fff', opacity: 0.8, fontSize: 10, marginBottom: 2 },
  questTitle: { color: activeTheme === 'school' ? '#FFFFFF' : ORANGE, fontSize: 15, fontWeight: '800' },
  questMode: { color: activeTheme === 'school' ? '#FFFFFF' : '#fbbf24', fontSize: 11, fontStyle: 'italic', marginBottom: 6 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: GREEN, borderRadius: 3 },
  percentText: { color: '#fff', fontSize: 10, marginTop: 3, fontStyle: 'italic' },

  scrollContent: { padding: 20, paddingBottom: NAV_CLEARANCE },
  errorText: { color: '#B3261E', marginBottom: 12, fontSize: 13 },

  emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: BROWN },
  emptyText: { color: T('#8A6A2A'), fontSize: 13, textAlign: 'center', lineHeight: 19 },

  stepCard: { backgroundColor: '#FFFBEB', borderRadius: 20, borderWidth: 2, borderColor: ORANGE, padding: 18 },
  stepHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  stepLabel: { fontSize: 13, fontWeight: '700', color: T('#8A6A2A') },

  stepBodyRow: { flexDirection: 'row', marginBottom: 18 },
  stepImagePlaceholder: { width: 64, height: 64, borderRadius: 12, backgroundColor: T('#EADEC9'), alignItems: 'center', justifyContent: 'center' },
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