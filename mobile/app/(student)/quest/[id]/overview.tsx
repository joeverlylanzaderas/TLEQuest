// mobile/app/(student)/quest/[id]/overview.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, Image, useWindowDimensions,
} from 'react-native';
import { T, HEADER_BG, HEADER_TEXT, activeTheme } from '../../../../src/theme/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getProgressDetail } from '../../../../src/api/assignments';
import { QuestProgressDetail, ProgressStep } from '../../../../src/types/assignments';
import SubmitOutputCard from '../../../../src/components/SubmitOutputCard';
import QuestCover from '../../../../src/components/QuestCover';
import { FadeIn, PressableScale, AnimatedBar, Confetti } from '../../../../src/components/Motion';

const GOLD = T('#F5B921');
const OVERVIEW_BG = require('../../../../assets/images/overview-bg.png');
const BG_COLOR = '#F3F3EE';
const BROWN = T('#5C2C16');
// The quest card on the header follows the theme (same colors as the Progress tab)
const CARD_BROWN = activeTheme === 'school' ? '#15366B' : '#4A2E1D';
const GREEN = '#22C55E';
const ORANGE = T('#EA580C');

function checkedCount(step: ProgressStep): number {
  return step.checklist_items.filter((i) => i.is_checked).length;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function QuestOverview() {
  const { width: bgWidth } = useWindowDimensions();
  const router = useRouter();
  // [id] is the QuestProgress id (what Home and the Quests tab push), not the quest id
  const { id } = useLocalSearchParams<{ id: string }>();
  const progressId = Number(id);

  const [progress, setProgress] = useState<QuestProgressDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Confetti only when the quest becomes completed while this screen is open
  const wasOpen = useRef<boolean | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (!progress) return;
    const done = !!progress.completed_at;
    if (wasOpen.current === false && done) setCelebrate(true);
    wasOpen.current = done;
  }, [progress?.completed_at, !!progress]);

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

  const currentStepId = progress?.steps.find((st) => st.status === 'available')?.id ?? null;

  return (
    <View style={styles.screen}>
      <Image
        source={OVERVIEW_BG}
        style={[styles.bgImage, { width: bgWidth, height: bgWidth * (16 / 9) }]}
        resizeMode="contain"
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={20} color={BROWN} />
          <Text style={styles.backTitle}>Quest Overview</Text>
        </TouchableOpacity>

        {progress && (
          <View style={styles.currentQuestCard}>
            <QuestCover url={progress?.quest_cover_image_url} style={styles.imagePlaceholder} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.questTitle} numberOfLines={2}>{progress.quest_title}</Text>
              <Text style={styles.questMode}>
                {progress.quest_mode === 'group' ? 'Group Quest' : 'Individual Quest'}
                {progress.group_name ? ` • ${progress.group_name}` : ''}
              </Text>
              <AnimatedBar
                percent={progress.percent_complete}
                trackStyle={styles.progressTrack}
                fillStyle={styles.progressFill}
              />
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
          <FadeIn>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutLabel}>ABOUT THIS QUEST</Text>
            <Text style={styles.aboutText}>{progress.quest_description}</Text>
          </View>
          </FadeIn>
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

          const isCurrent = step.id === currentStepId;
          const isLast = index === progress.steps.length - 1;
          const segments = Math.min(total, 10);
          const filled = total > 0 ? Math.round((checked / total) * segments) : 0;

          return (
            <FadeIn key={step.id} delay={120 + index * 90}>
              <View style={styles.stepRow}>
                {/* Timeline rail: number / check / lock, with a line down to the next step */}
                <View style={styles.rail}>
                  <View
                    style={[
                      styles.stepBadge,
                      isCurrent && styles.stepBadgeCurrent,
                      isCompleted && styles.stepBadgeCompleted,
                      isLocked && styles.stepBadgeLocked,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    ) : isLocked ? (
                      <Ionicons name="lock-closed" size={16} color="#fff" />
                    ) : (
                      <Text style={styles.stepBadgeText}>{step.step_order}</Text>
                    )}
                  </View>
                  {!isLast && <View style={[styles.railLine, isCompleted && styles.railLineDone]} />}
                </View>

                <PressableScale
                  containerStyle={{ flex: 1, minWidth: 0 }}
                  onPress={() => openStep(step)}
                  scaleTo={isLocked ? 1 : 0.97}
                  style={[
                    styles.stepCard,
                    isCurrent && styles.stepCardCurrent,
                    isCompleted && styles.stepCardDone,
                    isLocked && styles.stepCardLocked,
                  ]}
                >
                  <View style={styles.stepTop}>
                    <Text style={styles.stepKicker}>STEP {step.step_order}</Text>
                    {isCurrent ? (
                      <View style={styles.tagNext}><Text style={styles.tagNextText}>UP NEXT</Text></View>
                    ) : isCompleted ? (
                      <View style={styles.tagDone}><Text style={styles.tagDoneText}>DONE</Text></View>
                    ) : null}
                  </View>

                  <Text style={[styles.stepTitle, isLocked && { color: '#6B7280' }]}>{step.title}</Text>
                  <Text style={styles.stepDescription} numberOfLines={2}>{step.instruction}</Text>

                  {isLocked ? (
                    <View style={styles.lockedRow}>
                      <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
                      <Text style={styles.unlockHint}>Complete Step {previousOrder} to unlock!</Text>
                    </View>
                  ) : (
                    <>
                      {total > 0 ? (
                        <View style={styles.segRow}>
                          <View style={styles.segs}>
                            {Array.from({ length: segments }).map((_, k) => (
                              <View key={k} style={[styles.seg, k < filled && (isCompleted ? styles.segDone : styles.segOn)]} />
                            ))}
                          </View>
                          <Text style={styles.stepChecklistMeta}>{checked}/{total}</Text>
                        </View>
                      ) : null}
                      <View style={styles.stepFooter}>
                        <View style={[styles.stepButton, isCompleted && styles.stepButtonCompleted, isCurrent && styles.stepButtonCurrent]}>
                          <Text style={[styles.stepButtonText, (isCompleted || isCurrent) && styles.stepButtonTextCompleted]}>
                            {isCompleted ? 'Review' : checked > 0 ? 'Continue' : 'Start step'}
                          </Text>
                          <Ionicons name="arrow-forward" size={13} color={isCompleted || isCurrent ? '#fff' : BROWN} />
                        </View>
                      </View>
                    </>
                  )}
                </PressableScale>
              </View>
            </FadeIn>
          );
        })}

        {progress?.completed_at ? <SubmitOutputCard progress={progress} /> : null}
      </ScrollView>
      <Confetti active={celebrate} onDone={() => setCelebrate(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG_COLOR },
  bgImage: { position: 'absolute', bottom: 0, alignSelf: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG_COLOR },
  header: { backgroundColor: HEADER_BG, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backTitle: { fontSize: 17, fontWeight: '800', color: BROWN, marginLeft: 8 },

  currentQuestCard: { backgroundColor: CARD_BROWN, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center' },
  imagePlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: activeTheme === 'school' ? '#2F6FD0' : '#8a5a3a', alignItems: 'center', justifyContent: 'center' },
  questTitle: { color: activeTheme === 'school' ? '#FFFFFF' : ORANGE, fontSize: 15, fontWeight: '800' },
  questMode: { color: activeTheme === 'school' ? '#FFFFFF' : T('#fbbf24'), fontSize: 11, fontStyle: 'italic', marginBottom: 6 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  percentText: { color: '#fff', fontSize: 10, marginTop: 3 },

  scrollContent: { padding: 20, paddingBottom: 60 },
  errorText: { color: '#B3261E', marginBottom: 12, fontSize: 13 },
  emptyText: { color: T('#8A6A2A'), fontStyle: 'italic', textAlign: 'center', marginTop: 20 },

  aboutCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14 },
  aboutLabel: { fontSize: 10, fontWeight: '800', color: T('#8A6A2A'), letterSpacing: 0.5, marginBottom: 4 },
  aboutText: { fontSize: 13, color: '#444', lineHeight: 19 },

  stepRow: { flexDirection: 'row', gap: 12 },
  rail: { width: 40, alignItems: 'center' },
  railLine: { flex: 1, width: 3, borderRadius: 2, backgroundColor: '#D9D4C7', marginVertical: 4 },
  railLineDone: { backgroundColor: GREEN },
  stepCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: 'rgba(92,44,22,0.10)',
    elevation: 4, shadowColor: '#3A2B1A', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  stepCardCurrent: { borderColor: ORANGE, backgroundColor: '#FFFBEB', elevation: 8, shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  stepCardDone: { backgroundColor: '#F6FBF7', borderColor: 'rgba(34,197,94,0.35)', shadowColor: '#166B3A' },
  stepCardLocked: { backgroundColor: '#EDEDED', opacity: 0.85, elevation: 1, shadowOpacity: 0.06 },
  stepBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#C9B88A', alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  stepBadgeCurrent: { backgroundColor: ORANGE },
  stepBadgeCompleted: { backgroundColor: GREEN },
  stepBadgeLocked: { backgroundColor: '#9CA3AF' },
  stepBadgeText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  stepTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  stepKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: T('#8A6A2A') },
  tagNext: { backgroundColor: ORANGE, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  tagNextText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  tagDone: { backgroundColor: '#DCF2E3', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  tagDoneText: { color: '#166B3A', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  stepTitle: { fontSize: 15, fontWeight: '800', color: T('#7c2d12'), marginBottom: 4 },
  stepDescription: { fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 17 },
  segRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  segs: { flex: 1, flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#EADFC6' },
  segOn: { backgroundColor: ORANGE },
  segDone: { backgroundColor: GREEN },
  stepChecklistMeta: { fontSize: 11, fontWeight: '700', color: T('#8A6A2A') },
  stepFooter: { flexDirection: 'row' },
  stepButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#fde68a', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  stepButtonCurrent: { backgroundColor: ORANGE },
  stepButtonCompleted: { backgroundColor: GREEN },
  stepButtonText: { fontSize: 12, fontWeight: '700', color: BROWN },
  stepButtonTextCompleted: { color: '#fff' },

  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unlockHint: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' },
});