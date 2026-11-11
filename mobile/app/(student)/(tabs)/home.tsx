// mobile/app/(student)/(tabs)/home.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { T, HEADER_BG, HEADER_TEXT, activeTheme } from '../../../src/theme/theme';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { getClassEnrollments, getClassGroups, joinClass } from '../../../src/api/classrooms';
import { getMyProgress, getProgressDetail } from '../../../src/api/assignments';
import { getMyRewardSummary } from '../../../src/api/rewards';
import { ClassEnrollment, Group } from '../../../src/types/classrooms';
import { QuestProgress } from '../../../src/types/assignments';
import { Ionicons } from '@expo/vector-icons';
import MyGroupCard from '../../../src/components/MyGroupCard';
import KeyboardSafe from '../../../src/components/KeyboardSafe';
import AppHeader from '../../../src/components/AppHeader';
import QuestCover from '../../../src/components/QuestCover';
import { Avatar, prefetchAvatars } from '../../../src/components/Avatar';
import { FadeIn, PressableScale, AnimatedBar, CountUp, Pop } from '../../../src/components/Motion';
import { useAuth } from '../../../src/context/AuthContext';
import { refreshClasses, inSelectedClass, useClassScope, selectClass } from '../../../src/utils/selectedClass';
import { NAV_CLEARANCE } from '../../../src/components/FloatingTabBar';

const GOLD = T('#F5B921');
const CREAM = T('#F5EDD8');
const HOME_BG = require('../../../assets/images/home-bg (1).png');
const BG_COLOR = '#F3F3EE';
const BROWN = T('#5C2C16');
const GREEN = '#22C55E';
const ORANGE = T('#EA580C');

const AVATAR_COLORS = ['#f87171', '#4ade80', T('#fbbf24'), '#60a5fa', '#f472b6', '#fb923c', '#34d399', '#38bdf8'];

export default function StudentHome() {
  const router = useRouter();
  const { user } = useAuth();
  const scope = useClassScope();
  const { width: screenWidth } = useWindowDimensions();
  const [questIndex, setQuestIndex] = useState(0);
  const [classmates, setClassmates] = useState<ClassEnrollment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // start downloading everybody's photo as soon as the lists are known (popup + group card open instantly)
  useEffect(() => {
    prefetchAvatars([
      ...classmates.map((c) => c.student.profile_picture),
      ...groups.flatMap((g) => g.members.map((m) => m.student.profile_picture)),
    ]);
  }, [classmates, groups]);
  const [progress, setProgress] = useState<QuestProgress[]>([]);
  // Totals across ALL quests, from the same endpoint the Profile tab uses
  const [totals, setTotals] = useState<{ points: number; badges: number } | null>(null);
  const [selectedClassmate, setSelectedClassmate] = useState<ClassEnrollment | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  // The step each unfinished quest should continue at ("Continue step 3")
  const [nextSteps, setNextSteps] = useState<
    Record<number, { stepId: number | null; order: number | null; percent: number }>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Remember what was loaded so we do not re-download the same thing twice
  const lastLoadAt = useRef(0);
  const classDataFor = useRef<number | null>(null);

  // ---- Join class modal ----
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Classmates + groups of ONE class. Skipped if that class is already loaded.
  const loadClassData = useCallback(async (classId: number | null, force = false) => {
    if (classId === null) {
      setClassmates([]);
      setGroups([]);
      classDataFor.current = null;
      return;
    }
    if (!force && classDataFor.current === classId) return;
    const [enrollments, groupsData] = await Promise.all([
      getClassEnrollments(classId),
      getClassGroups(classId),
    ]);
    classDataFor.current = classId;
    setClassmates(enrollments);
    setGroups(groupsData);
  }, []);

  const loadEverything = useCallback(async (force = false) => {
    setError('');
    try {
      const [snap, progressData, summary] = await Promise.all([
        refreshClasses(user!.id),
        getMyProgress(),
        getMyRewardSummary().catch(() => null),
      ]);
      setProgress(progressData);
      setTotals(summary ? { points: summary.total_points, badges: summary.total_badges } : null);
      lastLoadAt.current = Date.now();
      // Show the main screen right away; classmates/groups fill in after
      setIsLoading(false);
      await loadClassData(snap.selectedId, force);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, loadClassData]);

  // Refresh when the tab is focused, but not more than once every 20 seconds
  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastLoadAt.current < 20000) return;
      loadEverything();
    }, [loadEverything])
  );

  // When the student switches class, only reload that class's classmates/groups
  useEffect(() => {
    if (!isLoading) loadClassData(scope.selectedId).catch(() => {});
  }, [scope.selectedId]);

  // Find the step to continue for each unfinished quest. Re-checked whenever the quest's percent changes.
  useEffect(() => {
    const todo = progress
      .filter((p) => !p.completed_at && nextSteps[p.id]?.percent !== p.percent_complete)
      .slice(0, 8);
    if (todo.length === 0) return;
    let alive = true;
    Promise.all(
      todo.map(async (p) => {
        try {
          const d = await getProgressDetail(p.id);
          const step = d.steps.find((st) => st.status === 'available');
          return [p.id, { stepId: step ? step.id : null, order: step ? step.step_order : null, percent: p.percent_complete }] as const;
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (!alive) return;
      setNextSteps((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          if (r) next[r[0]] = r[1];
        });
        return next;
      });
    });
    return () => {
      alive = false;
    };
  }, [progress]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadEverything(true);
    setIsRefreshing(false);
  }

  function openQuest(item: QuestProgress) {
    router.push(`/(student)/quest/${item.id}/overview` as any);
  }

  // "Continue step 3": opens the exact step the student is on
  function continueLabel(item: QuestProgress): string {
    if (item.completed_at) return 'View quest';
    const n = nextSteps[item.id];
    if (!n) return 'Continue';
    if (n.order == null) return 'Open quest';
    return item.percent_complete === 0 && n.order === 1 ? `Start step ${n.order}` : `Continue step ${n.order}`;
  }

  function continueQuest(item: QuestProgress) {
    const n = nextSteps[item.id];
    if (!item.completed_at && n?.stepId) {
      router.push(`/(student)/quest/${item.id}/step/${n.stepId}` as any);
    } else {
      openQuest(item);
    }
  }

  function classmateDisplayName(c: ClassEnrollment): string {
    return c.student.first_name || c.student.username;
  }

  function findGroupNumberFor(studentId: number): number | null {
    const group = groups.find((g) => g.members.some((m) => m.student.id === studentId));
    return group ? group.group_number : null;
  }

  async function handleJoinClass() {
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code) {
      setJoinError('Please enter an invite code.');
      return;
    }
    setJoinError('');
    setIsJoining(true);
    try {
      await joinClass(code);
      setInviteCodeInput('');
      setShowJoinModal(false);
      await loadEverything(true); // refresh classes, progress, classmates with the newly joined class
    } catch (e: any) {
      setJoinError(e?.response?.data?.detail || e?.response?.data?.non_field_errors?.[0] || 'Could not join class. Check the code and try again.');
    } finally {
      setIsJoining(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Swipeable "current quest" cards: every unfinished quest, first one is the current quest.
  // If everything is finished, show the most recent one so it is still reachable from Home.
  const classProgress = progress.filter((p) => inSelectedClass(scope, p.group));
  const unfinished = classProgress.filter((p) => !p.completed_at);
  const carouselQuests: QuestProgress[] =
    unfinished.length > 0 ? unfinished : classProgress.length > 0 ? [classProgress[classProgress.length - 1]] : [];
  const CARD_GAP = 12;
  const cardWidth = carouselQuests.length > 1 ? screenWidth - 56 : screenWidth - 40;
  const snapInterval = cardWidth + CARD_GAP;

  function handleQuestScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / snapInterval);
    setQuestIndex(Math.max(0, Math.min(idx, carouselQuests.length - 1)));
  }

  // Same numbers as the Profile tab. Falls back to the per-quest sums only if the summary call failed.
  const totalPoints = totals ? totals.points : progress.reduce((sum, p) => sum + (p.points_earned || 0), 0);
  const totalBadges = totals ? totals.badges : progress.filter((p) => p.badge_earned).length;
  const doneCount = classProgress.filter((p) => p.completed_at).length;

  // Assigned quests: unfinished first, show 3 (the rest are under "See all quests")
  const assignedShown = [...classProgress]
    .sort((a, b) => Number(!!a.completed_at) - Number(!!b.completed_at))
    .slice(0, 3);

  // My group (shown as a tappable row)
  const myGroup = user ? groups.find((g) => g.members.some((m) => m.student.id === user.id)) : undefined;
  const iAmLeader = !!myGroup && myGroup.leader?.id === user?.id;
  const myGroupLabel = myGroup
    ? myGroup.group_name && myGroup.group_name !== `Group ${myGroup.group_number}`
      ? `Group ${myGroup.group_number} · ${myGroup.group_name}`
      : `Group ${myGroup.group_number}`
    : '';

  return (
    <View style={styles.screen}>
      <Image
        source={HOME_BG}
        style={styles.bgImage}
        resizeMode="cover"
      />
      {/* Header: same look as the Quests / Submissions / Progress tabs */}
      <AppHeader role="student">
        {scope.classes.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.headerChipsScroll}
            contentContainerStyle={styles.headerChips}
          >
            {scope.classes.map((c) => {
              const active = c.id === scope.selectedId;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => selectClass(c.id)}
                  style={[styles.hChip, active && styles.hChipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Class ${c.class_name}`}
                >
                  <Text style={[styles.hChipText, active && styles.hChipTextActive]} numberOfLines={1}>
                    {c.class_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[styles.hChip, styles.hChipJoin]} onPress={() => setShowJoinModal(true)}>
              <Ionicons name="add" size={14} color={HEADER_TEXT} />
              <Text style={styles.hChipText}>Join another class</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </AppHeader>

    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: NAV_CLEARANCE }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* No class yet: big call-to-action. (With classes, "+ Join" lives in the header.) */}
      {scope.classes.length === 0 && (
        <FadeIn>
        <PressableScale style={styles.joinClassCard} onPress={() => setShowJoinModal(true)}>
          <Text style={styles.joinClassCardTitle}>No class yet</Text>
          <Text style={styles.joinClassCardSubtitle}>Enter your teacher's invite code to get started</Text>
          <View style={styles.joinClassCardButton}>
            <Text style={styles.joinClassCardButtonText}>Join a Class</Text>
          </View>
        </PressableScale>
        </FadeIn>
      )}

      {carouselQuests.length > 0 ? (
        <FadeIn delay={120}>
        <View style={styles.questCarouselWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={snapInterval}
            snapToAlignment="start"
            decelerationRate="fast"
            onMomentumScrollEnd={handleQuestScrollEnd}
            contentContainerStyle={styles.questCarouselRow}
          >
            {carouselQuests.map((quest, index) => (
              <PressableScale
                key={quest.id}
                style={[styles.currentQuestCard, { width: cardWidth }]}
                onPress={() => openQuest(quest)}
                scaleTo={0.97}
              >
                <View style={styles.currentQuestTop}>
                  <QuestCover url={quest.quest_cover_image_url} style={styles.questIcon} iconSize={24} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.currentQuestLabel}>
                      {index === 0 ? 'YOUR CURRENT QUEST' : 'ALSO IN PROGRESS'}
                    </Text>
                    <Text style={styles.currentQuestTitle} numberOfLines={2}>{quest.quest_title}</Text>
                    <Text style={styles.currentQuestMode}>
                      {quest.quest_mode === 'group' ? 'Group Quest' : 'Individual Quest'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </View>
                <AnimatedBar
                  percent={quest.percent_complete}
                  trackStyle={styles.progressBarTrack}
                  fillStyle={styles.progressBarFill}
                  delay={400}
                />
                <Text style={styles.percentText}>{quest.percent_complete}% complete</Text>
                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={() => continueQuest(quest)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Text style={styles.continueButtonText}>{continueLabel(quest)}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#3A2B1A" />
                </TouchableOpacity>
              </PressableScale>
            ))}
          </ScrollView>

          {carouselQuests.length > 1 && (
            <View style={styles.dotsRow}>
              {carouselQuests.map((q, i) => (
                <View key={q.id} style={[styles.dot, i === questIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
        </FadeIn>
      ) : (
        <Text style={styles.emptyText}>No quests assigned yet.</Text>
      )}

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <FadeIn delay={250} style={styles.statCard}>
          <Ionicons name="star" size={18} color={GOLD} />
          <CountUp value={totalPoints} style={styles.statValue} delay={400} />
          <Text style={styles.statLabel}>Points</Text>
        </FadeIn>
        <FadeIn delay={350} style={styles.statCard}>
          <Ionicons name="ribbon" size={18} color={ORANGE} />
          <CountUp value={totalBadges} style={styles.statValue} delay={520} />
          <Text style={styles.statLabel}>Badges</Text>
        </FadeIn>
        <FadeIn delay={450} style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={18} color={GREEN} />
          <CountUp value={doneCount} style={styles.statValue} delay={640} />
          <Text style={styles.statLabel}>Completed</Text>
        </FadeIn>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Assigned Quests</Text>
        <TouchableOpacity
          onPress={() => router.navigate('/(student)/(tabs)/quests' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.seeAllText}>See all quests</Text>
        </TouchableOpacity>
      </View>
      {assignedShown.length === 0 ? (
        <Text style={styles.emptyText}>No quests assigned yet.</Text>
      ) : (
        assignedShown.map((item, i) => (
          <FadeIn key={item.id} delay={450 + Math.min(i, 6) * 80}>
          <PressableScale style={styles.questCard} onPress={() => openQuest(item)}>
            <View style={styles.questCardTop}>
              <Text style={styles.questTitle} numberOfLines={2}>{item.quest_title}</Text>
              {item.completed_at ? (
                <View style={styles.doneChip}><Text style={styles.doneChipText}>Completed</Text></View>
              ) : null}
            </View>
            <Text style={styles.questMode}>
              {item.quest_mode === 'group' ? 'Group Quest' : 'Individual Quest'}
            </Text>
            <AnimatedBar
              percent={item.percent_complete}
              trackStyle={styles.questTrack}
              fillStyle={styles.questFill}
              delay={700 + Math.min(i, 6) * 80}
            />
            <Text style={styles.questPercent}>{item.percent_complete}%</Text>
          </PressableScale>
          </FadeIn>
        ))
      )}

      {/* My group: tap to see the members */}
      {scope.classes.length > 0 && (
        myGroup ? (
          <FadeIn delay={650}>
          <PressableScale style={styles.groupRow} onPress={() => setShowGroupModal(true)}>
            <View style={styles.groupRowIcon}>
              <Ionicons name="people" size={20} color="#1F4D7A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.groupRowTitle}>My group · {myGroupLabel}</Text>
              <Text style={styles.groupRowSub}>
                {myGroup.members.length} {myGroup.members.length === 1 ? 'member' : 'members'}
                {iAmLeader ? ' · You are the leader' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T('#8A6A2A')} />
          </PressableScale>
          </FadeIn>
        ) : (
          <View style={styles.groupRow}>
            <View style={styles.groupRowIcon}>
              <Ionicons name="people-outline" size={20} color="#1F4D7A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.groupRowTitle}>No group yet</Text>
              <Text style={styles.groupRowSub}>Your teacher will put you in a group.</Text>
            </View>
          </View>
        )
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>People in this class</Text>
      </View>
      {classmates.length === 0 ? (
        <Text style={styles.emptyText}>No classmates yet.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.classmateCard}
          contentContainerStyle={styles.classmateStrip}
        >
          {classmates.map((c, index) => (
            <TouchableOpacity
              key={c.id}
              style={styles.classmateItem}
              onPress={() => setSelectedClassmate(c)}
            >
              <Avatar
                picture={c.student.profile_picture}
                name={classmateDisplayName(c)}
                size={48}
                color={AVATAR_COLORS[index % AVATAR_COLORS.length]}
                style={{ marginBottom: 4 }}
              />
              <Text style={styles.classmateName} numberOfLines={1}>
                {classmateDisplayName(c)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Classmate detail modal — unchanged */}
      <Modal
        visible={selectedClassmate !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedClassmate(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedClassmate(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.cmCard}>
            {selectedClassmate && (() => {
              const st = selectedClassmate.student;
              const groupNumber = findGroupNumberFor(st.id);
              const sectionText = st.section && st.section.trim() ? st.section : null;
              return (
                <>
                  <View style={styles.cmBanner} />
                  <Pop style={styles.cmAvatarRing}>
                    <Avatar
                      picture={st.profile_picture}
                      name={st.first_name || st.username}
                      size={84}
                      color={T('#ea580c')}
                    />
                  </Pop>
                  <Text style={styles.cmName} numberOfLines={2}>
                    {[st.first_name, st.last_name].filter(Boolean).join(' ') || st.username}
                  </Text>
                  <Text style={styles.cmUser}>@{st.username}</Text>
                  <View style={styles.cmPills}>
                    <View style={[styles.cmPill, groupNumber !== null ? styles.cmPillGold : styles.cmPillSoft]}>
                      <Ionicons name="people" size={13} color={BROWN} />
                      <Text style={styles.cmPillText}>{groupNumber !== null ? `Group ${groupNumber}` : 'No group yet'}</Text>
                    </View>
                    {sectionText ? (
                      <View style={[styles.cmPill, styles.cmPillSoft]}>
                        <Ionicons name="school" size={13} color={BROWN} />
                        <Text style={styles.cmPillText}>{sectionText}</Text>
                      </View>
                    ) : null}
                  </View>
                  <TouchableOpacity style={styles.cmClose} onPress={() => setSelectedClassmate(null)}>
                    <Text style={styles.cmCloseText}>Close</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* My group details */}
      <Modal visible={showGroupModal} transparent animationType="fade" onRequestClose={() => setShowGroupModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowGroupModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.groupModalWrap}>
            <MyGroupCard groups={groups} />
            <TouchableOpacity onPress={() => setShowGroupModal(false)} style={styles.groupModalClose}>
              <Text style={styles.groupModalCloseText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Join Class modal — new */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <KeyboardSafe style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalName}>Join a Class</Text>
            <Text style={styles.modalSection}>Enter the invite code your teacher shared</Text>

            <TextInput
              style={styles.joinInput}
              placeholder="e.g. K7XQPM"
              autoCapitalize="characters"
              value={inviteCodeInput}
              onChangeText={setInviteCodeInput}
            />

            {joinError ? <Text style={styles.joinErrorText}>{joinError}</Text> : null}

            <TouchableOpacity style={styles.joinSubmitButton} onPress={handleJoinClass} disabled={isJoining}>
              {isJoining ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinSubmitButtonText}>Join</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setShowJoinModal(false); setJoinError(''); setInviteCodeInput(''); }}
              style={{ marginTop: 10 }}
            >
              <Text style={styles.joinCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardSafe>
      </Modal>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG_COLOR },
  bgImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG_COLOR },
  error: { color: '#B3261E', marginBottom: 12, fontSize: 13 },
  emptyText: { color: T('#8A6A2A'), fontStyle: 'italic', marginBottom: 12 },

  header: { backgroundColor: HEADER_BG, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerAvatarImg: { width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: '#fff' },
  welcomeSmall: { fontSize: 12, color: HEADER_TEXT, opacity: 0.8 },
  welcomeName: { fontSize: 16, fontWeight: '800', color: HEADER_TEXT },
  dateText: { fontSize: 11, color: HEADER_TEXT, fontWeight: '600' },
  classText: { fontSize: 11, color: HEADER_TEXT, fontWeight: '700', marginTop: 2 },
  bellDot: { position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: BROWN, marginTop: 4 },
  statLabel: { fontSize: 11, color: T('#8A6A2A'), fontWeight: '600' },

  // class chips + "Join another class" inside the header
  headerChipsScroll: { marginHorizontal: -20 },
  headerChips: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  hChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 200,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)',
  },
  hChipActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  hChipJoin: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  hChipText: { fontSize: 13, fontWeight: '700', color: HEADER_TEXT },
  hChipTextActive: { color: '#3A2B1A', fontWeight: '800' },

  seeAllText: { color: ORANGE, fontSize: 13, fontWeight: '700' },

  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 16 },
  groupRowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#CFE0F5', alignItems: 'center', justifyContent: 'center' },
  groupRowTitle: { fontSize: 14, fontWeight: '800', color: BROWN },
  groupRowSub: { fontSize: 12, color: T('#8A6A2A'), marginTop: 1 },
  groupModalWrap: { width: '90%', maxWidth: 360 },
  groupModalClose: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 24, backgroundColor: '#fff', borderRadius: 20 },
  groupModalCloseText: { color: BROWN, fontWeight: '800', fontSize: 14 },

  joinClassCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#F3D98B',
    borderStyle: 'dashed', padding: 20, alignItems: 'center', marginTop: 12, marginBottom: 8,
  },
  joinClassCardTitle: { fontSize: 15, fontWeight: '800', color: BROWN },
  joinClassCardSubtitle: { fontSize: 12, color: T('#8A6A2A'), textAlign: 'center', marginTop: 4, marginBottom: 12 },
  joinClassCardButton: { backgroundColor: ORANGE, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  joinClassCardButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  questCarouselWrap: { marginTop: 0, marginBottom: 16, marginHorizontal: -20 },
  questCarouselRow: { paddingHorizontal: 20, gap: 12 },
  currentQuestCard: { backgroundColor: BROWN, borderRadius: 20, padding: 16 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D8C9A3' },
  dotActive: { width: 18, backgroundColor: ORANGE },
  currentQuestTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  questIcon: { width: 56, height: 56, borderRadius: 14 },
  currentQuestLabel: { color: GOLD, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  currentQuestTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  currentQuestMode: { color: '#F3D98B', fontSize: 12, marginTop: 2 },

  progressBarTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: GREEN, borderRadius: 4 },
  percentText: { color: '#fff', marginTop: 6, fontSize: 12, fontWeight: '600' },
  continueButton: {
    marginTop: 14, height: 46, borderRadius: 14, backgroundColor: GOLD,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  continueButtonText: { color: '#3A2B1A', fontSize: 15, fontWeight: '800' },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 10 },
  sectionHeader: { fontSize: 13, fontWeight: '800', color: BROWN, letterSpacing: 0.8, textTransform: 'uppercase' },

  classmateCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, flexGrow: 0 },
  classmateStrip: { paddingVertical: 14, paddingHorizontal: 14 },
  classmateItem: { alignItems: 'center', marginRight: 16, width: 60 },
  classmateAvatar: { width: 48, height: 48, borderRadius: 24, marginBottom: 4 },
  classmateAvatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  classmateAvatarInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  classmateName: { fontSize: 11, color: BROWN, textAlign: 'center', fontWeight: '600' },

  questCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12 },
  questCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  questTitle: { fontSize: 15, fontWeight: '800', color: T('#7c2d12'), flex: 1 },
  questMode: { fontSize: 12, color: T('#8A6A2A'), marginTop: 2, marginBottom: 10 },
  questTrack: { height: 8, backgroundColor: '#F1E6CC', borderRadius: 4, overflow: 'hidden' },
  questFill: { height: 8, backgroundColor: GREEN, borderRadius: 4 },
  questPercent: { color: T('#8A6A2A'), marginTop: 4, fontSize: 12, fontWeight: '600' },
  doneChip: { backgroundColor: GREEN, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  doneChipText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  cmCard: { backgroundColor: '#fff', borderRadius: 26, width: 300, overflow: 'hidden', alignItems: 'center', paddingBottom: 20 },
  cmBanner: { height: 84, width: '100%', backgroundColor: GOLD },
  cmAvatarRing: { marginTop: -46, width: 96, height: 96, borderRadius: 48, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  cmName: { fontSize: 20, fontWeight: '900', color: BROWN, marginTop: 12, textAlign: 'center', paddingHorizontal: 16 },
  cmUser: { fontSize: 13, color: T('#8A6A2A'), marginTop: 2 },
  cmPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14, paddingHorizontal: 16 },
  cmPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  cmPillGold: { backgroundColor: GOLD },
  cmPillSoft: { backgroundColor: '#F3EBDA' },
  cmPillText: { fontSize: 12, fontWeight: '800', color: BROWN },
  cmClose: { marginTop: 18, backgroundColor: BROWN, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 10 },
  cmCloseText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  cmAvatarImg: { width: 84, height: 84, borderRadius: 42 },
  cmAvatarFallback: { backgroundColor: T('#ea580c'), alignItems: 'center', justifyContent: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', width: 280 },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  modalAvatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: T('#ea580c'),
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  modalAvatarPlaceholderText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  modalName: { fontSize: 18, fontWeight: 'bold' },
  modalSection: { fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center' },
  modalGroup: { fontSize: 13, color: T('#ea580c'), fontWeight: '600', marginTop: 4 },

  joinInput: {
    width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 16, textAlign: 'center', letterSpacing: 2,
    marginTop: 16, fontWeight: '700', color: T('#7c2d12'),
  },
  joinErrorText: { color: '#dc2626', fontSize: 12, marginTop: 10, textAlign: 'center' },
  joinSubmitButton: {
    width: '100%', backgroundColor: ORANGE, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginTop: 16,
  },
  joinSubmitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  joinCancelText: { color: T('#8A6A2A'), fontSize: 13 },
});