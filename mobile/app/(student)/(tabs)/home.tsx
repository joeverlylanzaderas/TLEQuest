// mobile/app/(student)/(tabs)/home.tsx
import React, { useCallback, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { getMyClasses, getClassEnrollments, getClassGroups, joinClass } from '../../../src/api/classrooms';
import { getMyProgress } from '../../../src/api/assignments';
import { getMyRewardSummary } from '../../../src/api/rewards';
import { ClassSummary, ClassEnrollment, Group } from '../../../src/types/classrooms';
import { QuestProgress } from '../../../src/types/assignments';
import { Ionicons } from '@expo/vector-icons';
import KeyboardSafe from '../../../src/components/KeyboardSafe';
import AppHeader from '../../../src/components/AppHeader';
import QuestCover from '../../../src/components/QuestCover';

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const GREEN = '#22C55E';
const ORANGE = '#EA580C';

const AVATAR_COLORS = ['#f87171', '#4ade80', '#fbbf24', '#60a5fa', '#f472b6', '#fb923c', '#34d399', '#38bdf8'];

export default function StudentHome() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [questIndex, setQuestIndex] = useState(0);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [classmates, setClassmates] = useState<ClassEnrollment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [progress, setProgress] = useState<QuestProgress[]>([]);
  // Totals across ALL quests, from the same endpoint the Profile tab uses
  const [totals, setTotals] = useState<{ points: number; badges: number } | null>(null);
  const [selectedClassmate, setSelectedClassmate] = useState<ClassEnrollment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // ---- Join class modal ----
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const loadEverything = useCallback(async () => {
    setError('');
    try {
      const [classesData, progressData, summary] = await Promise.all([
        getMyClasses(),
        getMyProgress(),
        getMyRewardSummary().catch(() => null),
      ]);
      setClasses(classesData);
      setProgress(progressData);
      setTotals(summary ? { points: summary.total_points, badges: summary.total_badges } : null);

      if (classesData.length > 0) {
        const [enrollments, groupsData] = await Promise.all([
          getClassEnrollments(classesData[0].id),
          getClassGroups(classesData[0].id),
        ]);
        setClassmates(enrollments);
        setGroups(groupsData);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEverything();
    }, [loadEverything])
  );

  function openQuest(item: QuestProgress) {
    router.push(`/(student)/quest/${item.id}/overview` as any);
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
      await loadEverything(); // refresh classes, progress, classmates with the newly joined class
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
  const unfinished = progress.filter((p) => !p.completed_at);
  const carouselQuests: QuestProgress[] =
    unfinished.length > 0 ? unfinished : progress.length > 0 ? [progress[progress.length - 1]] : [];
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
  const doneCount = progress.filter((p) => p.completed_at).length;

  return (
    <View style={styles.screen}>
      {/* Header: same look as the Quests / Submissions / Progress tabs */}
      <AppHeader role="student" />

    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 80 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadEverything} tintColor={BROWN} />}
    >
      {/* Quick stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="star" size={18} color={GOLD} />
          <Text style={styles.statValue}>{totalPoints}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="ribbon" size={18} color={ORANGE} />
          <Text style={styles.statValue}>{totalBadges}</Text>
          <Text style={styles.statLabel}>Badges</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={18} color={GREEN} />
          <Text style={styles.statValue}>{doneCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Join class — small link when already in a class, big CTA card when not */}
      {classes.length > 0 ? (
        <TouchableOpacity style={styles.joinLinkRow} onPress={() => setShowJoinModal(true)}>
          <Text style={styles.joinLinkText}>+ Join another class</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.joinClassCard} onPress={() => setShowJoinModal(true)}>
          <Text style={styles.joinClassCardTitle}>No class yet</Text>
          <Text style={styles.joinClassCardSubtitle}>Enter your teacher's invite code to get started</Text>
          <View style={styles.joinClassCardButton}>
            <Text style={styles.joinClassCardButtonText}>Join a Class</Text>
          </View>
        </TouchableOpacity>
      )}

      {carouselQuests.length > 0 ? (
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
              <TouchableOpacity
                key={quest.id}
                style={[styles.currentQuestCard, { width: cardWidth }]}
                onPress={() => openQuest(quest)}
                activeOpacity={0.9}
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
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${quest.percent_complete}%` }]} />
                </View>
                <Text style={styles.percentText}>{quest.percent_complete}% complete</Text>
              </TouchableOpacity>
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
      ) : (
        <Text style={styles.emptyText}>No quests assigned yet.</Text>
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
              {c.student.profile_picture ? (
                <Image
                  source={{ uri: c.student.profile_picture }}
                  style={styles.classmateAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.classmateAvatarPlaceholder,
                    { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] },
                  ]}
                >
                  <Text style={styles.classmateAvatarInitial}>
                    {classmateDisplayName(c).charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.classmateName} numberOfLines={1}>
                {classmateDisplayName(c)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Assigned Quests</Text>
      </View>
      {progress.length === 0 ? (
        <Text style={styles.emptyText}>No quests assigned yet.</Text>
      ) : (
        progress.map((item) => (
          <TouchableOpacity key={item.id} style={styles.questCard} onPress={() => openQuest(item)}>
            <View style={styles.questCardTop}>
              <Text style={styles.questTitle} numberOfLines={2}>{item.quest_title}</Text>
              {item.completed_at ? (
                <View style={styles.doneChip}><Text style={styles.doneChipText}>Completed</Text></View>
              ) : null}
            </View>
            <Text style={styles.questMode}>
              {item.quest_mode === 'group' ? 'Group Quest' : 'Individual Quest'}
            </Text>
            <View style={styles.questTrack}>
              <View style={[styles.questFill, { width: `${item.percent_complete}%` }]} />
            </View>
            <Text style={styles.questPercent}>{item.percent_complete}%</Text>
          </TouchableOpacity>
        ))
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
          <View style={styles.modalCard}>
            {selectedClassmate && (
              <>
                {selectedClassmate.student.profile_picture ? (
                  <Image
                    source={{ uri: selectedClassmate.student.profile_picture }}
                    style={styles.modalAvatar}
                  />
                ) : (
                  <View style={styles.modalAvatarPlaceholder}>
                    <Text style={styles.modalAvatarPlaceholderText}>
                      {(selectedClassmate.student.first_name || selectedClassmate.student.username)
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.modalName}>
                  {selectedClassmate.student.first_name} {selectedClassmate.student.last_name}
                </Text>
                <Text style={styles.modalSection}>
                  {selectedClassmate.student.section || 'No section on file'}
                </Text>
                {(() => {
                  const groupNumber = findGroupNumberFor(selectedClassmate.student.id);
                  return (
                    <Text style={styles.modalGroup}>
                      {groupNumber !== null ? `Group ${groupNumber}` : 'Not in a group yet'}
                    </Text>
                  );
                })()}
              </>
            )}
          </View>
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
  screen: { flex: 1, backgroundColor: CREAM },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CREAM },
  error: { color: '#B3261E', marginBottom: 12, fontSize: 13 },
  emptyText: { color: '#8A6A2A', fontStyle: 'italic', marginBottom: 12 },

  header: { backgroundColor: GOLD, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerAvatarImg: { width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: '#fff' },
  welcomeSmall: { fontSize: 12, color: BROWN, opacity: 0.8 },
  welcomeName: { fontSize: 16, fontWeight: '800', color: BROWN },
  dateText: { fontSize: 11, color: BROWN, fontWeight: '600' },
  classText: { fontSize: 11, color: BROWN, fontWeight: '700', marginTop: 2 },
  bellDot: { position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: BROWN, marginTop: 4 },
  statLabel: { fontSize: 11, color: '#8A6A2A', fontWeight: '600' },

  joinLinkRow: { marginBottom: 4 },
  joinLinkText: { color: ORANGE, fontSize: 13, fontWeight: '700' },

  joinClassCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#F3D98B',
    borderStyle: 'dashed', padding: 20, alignItems: 'center', marginTop: 12, marginBottom: 8,
  },
  joinClassCardTitle: { fontSize: 15, fontWeight: '800', color: BROWN },
  joinClassCardSubtitle: { fontSize: 12, color: '#8A6A2A', textAlign: 'center', marginTop: 4, marginBottom: 12 },
  joinClassCardButton: { backgroundColor: ORANGE, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  joinClassCardButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  questCarouselWrap: { marginTop: 16, marginBottom: 20, marginHorizontal: -20 },
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
  questTitle: { fontSize: 15, fontWeight: '800', color: '#7c2d12', flex: 1 },
  questMode: { fontSize: 12, color: '#8A6A2A', marginTop: 2, marginBottom: 10 },
  questTrack: { height: 8, backgroundColor: '#F1E6CC', borderRadius: 4, overflow: 'hidden' },
  questFill: { height: 8, backgroundColor: GREEN, borderRadius: 4 },
  questPercent: { color: '#8A6A2A', marginTop: 4, fontSize: 12, fontWeight: '600' },
  doneChip: { backgroundColor: GREEN, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  doneChipText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', width: 280 },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  modalAvatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#ea580c',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  modalAvatarPlaceholderText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  modalName: { fontSize: 18, fontWeight: 'bold' },
  modalSection: { fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center' },
  modalGroup: { fontSize: 13, color: '#ea580c', fontWeight: '600', marginTop: 4 },

  joinInput: {
    width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 16, textAlign: 'center', letterSpacing: 2,
    marginTop: 16, fontWeight: '700', color: '#7c2d12',
  },
  joinErrorText: { color: '#dc2626', fontSize: 12, marginTop: 10, textAlign: 'center' },
  joinSubmitButton: {
    width: '100%', backgroundColor: ORANGE, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginTop: 16,
  },
  joinSubmitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  joinCancelText: { color: '#8A6A2A', fontSize: 13 },
});