// mobile/app/(student)/class-group.tsx
// "My class and group": the class the student is looking at, their group, and classmates.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, Modal, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { T } from '../../src/theme/theme';
import { useAuth } from '../../src/context/AuthContext';
import { getClassEnrollments, getClassGroups } from '../../src/api/classrooms';
import { ClassEnrollment, Group } from '../../src/types/classrooms';
import { refreshClasses, selectClass, useClassScope } from '../../src/utils/selectedClass';
import { Avatar, prefetchAvatars } from '../../src/components/Avatar';
import { FadeIn, PressableScale, Pop } from '../../src/components/Motion';
import { TOP_GAP } from '../../src/theme/layout';

const PAGE = T('#F5EDD8');
const BROWN = T('#5C2C16');
const GOLD = T('#F5B921');
const MUTED = T('#8A6A2A');
const LINK = T('#EA580C');
const AVATAR_COLORS = ['#F7C9C0', '#CFE0F5', '#CDE7D3', '#FBE3A6', '#E4D3F2'];
const AVATAR_TEXT = ['#7A2E1F', '#1F4D7A', '#1F5A35', '#6B4A00', '#4B2A70'];

export default function ClassAndGroupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const scope = useClassScope();
  const [classmates, setClassmates] = useState<ClassEnrollment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    prefetchAvatars([
      ...classmates.map((c) => c.student.profile_picture),
      ...groups.flatMap((g) => g.members.map((m) => m.student.profile_picture)),
    ]);
  }, [classmates, groups]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<ClassEnrollment | null>(null);
  const [showAll, setShowAll] = useState(false);
  const loadedFor = useRef<number | null>(null);

  const loadClass = useCallback(async (classId: number | null) => {
    if (classId === null) {
      setClassmates([]);
      setGroups([]);
      loadedFor.current = null;
      return;
    }
    const [enrollments, groupsData] = await Promise.all([getClassEnrollments(classId), getClassGroups(classId)]);
    loadedFor.current = classId;
    setClassmates(enrollments);
    setGroups(groupsData);
  }, []);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setError('');
    try {
      const snap = await refreshClasses(user.id);
      await loadClass(snap.selectedId);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not load your class. Pull down to try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, loadClass]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // Switching class: only reload that class
  useEffect(() => {
    if (!isLoading && scope.selectedId !== loadedFor.current) {
      loadClass(scope.selectedId).catch(() => {});
    }
  }, [scope.selectedId]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadAll();
    setIsRefreshing(false);
  }

  const cls = scope.classes.find((c) => c.id === scope.selectedId) || null;
  const myGroup = groups.find((g) => g.members.some((m) => m.student.id === user?.id)) || null;
  const groupIds = new Set((myGroup?.members ?? []).map((m) => m.student.id));
  // Classmates = everyone else in the class, not counting yourself or your group mates
  const others = classmates.filter((c) => c.student.id !== user?.id && !groupIds.has(c.student.id));
  const MAX_TILES = 7; // shows 7 people, then a "+N more" tile
  const visible = showAll || others.length <= MAX_TILES + 1 ? others : others.slice(0, MAX_TILES);
  const hiddenCount = others.length - visible.length;

  function groupNumberOf(studentId: number): number | null {
    const g = groups.find((gr) => gr.members.some((m) => m.student.id === studentId));
    return g ? g.group_number : null;
  }

  function PersonAvatar({ person, index, size }: { person: ClassEnrollment['student']; index: number; size: number }) {
    return (
      <Avatar
        picture={person.profile_picture}
        name={person.first_name || person.username}
        size={size}
        color={AVATAR_COLORS[index % AVATAR_COLORS.length]}
        textColor={AVATAR_TEXT[index % AVATAR_TEXT.length]}
      />
    );
  }

  const fullName = (p: ClassEnrollment['student']) =>
    [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color={BROWN} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{cls ? cls.class_name : 'My class and group'}</Text>
          {cls ? (
            <Text style={styles.sub} numberOfLines={1}>
              {cls.teacher?.username ? `${cls.teacher.username} · ` : ''}{cls.student_count} student{cls.student_count === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={BROWN} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {scope.classes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="school-outline" size={34} color={MUTED} />
              <Text style={styles.emptyTitle}>No class yet</Text>
              <Text style={styles.emptySub}>Ask your teacher for the invite code, then join your class.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(student)/join-class' as any)}>
                <Text style={styles.primaryBtnText}>Join a class</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {scope.classes.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {scope.classes.map((c) => {
                    const on = c.id === scope.selectedId;
                    return (
                      <TouchableOpacity key={c.id} style={[styles.chip, on && styles.chipOn]} onPress={() => selectClass(c.id)}>
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.class_name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* My group */}
              <FadeIn style={styles.groupCard}>
                {myGroup ? (
                  <>
                    <View style={styles.groupHead}>
                      <Text style={styles.groupTitle} numberOfLines={1}>
                        My group · {myGroup.group_name ? `Group ${myGroup.group_number} (${myGroup.group_name})` : `Group ${myGroup.group_number}`}
                      </Text>
                      <View style={styles.pill}>
                        <Text style={styles.pillText}>{myGroup.members.length} member{myGroup.members.length === 1 ? '' : 's'}</Text>
                      </View>
                    </View>
                    <View style={{ gap: 8 }}>
                      {myGroup.members.map((m, i) => {
                        const isMe = m.student.id === user?.id;
                        const isLeader = myGroup.leader?.id === m.student.id;
                        return (
                          <View key={m.id} style={styles.memberRow}>
                            <PersonAvatar person={m.student} index={i + 3} size={36} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.memberName} numberOfLines={1}>{fullName(m.student)}</Text>
                              {m.member_role ? <Text style={styles.memberRole} numberOfLines={1}>{m.member_role}</Text> : null}
                            </View>
                            {isLeader ? (
                              <View style={styles.leaderTag}>
                                <Ionicons name="star" size={11} color={GOLD} />
                                <Text style={styles.youText}>{isMe ? 'You · Leader' : 'Leader'}</Text>
                              </View>
                            ) : isMe ? (
                              <Text style={styles.youText}>You</Text>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
                    <Ionicons name="people-outline" size={28} color="#fff" />
                    <Text style={styles.groupTitle}>No group yet</Text>
                    <Text style={styles.noGroupSub}>Your teacher will put you in a group. It will show up here.</Text>
                  </View>
                )}
              </FadeIn>

              <Text style={styles.sectionTitle}>Classmates</Text>
              {others.length === 0 ? (
                <Text style={styles.emptySub}>No classmates yet.</Text>
              ) : (
                <View style={styles.grid}>
                  {visible.map((c, i) => (
                    <FadeIn key={c.id} delay={150 + Math.min(i, 10) * 45} style={styles.gridItem}>
                    <PressableScale onPress={() => setPicked(c)} scaleTo={0.92} style={{ alignItems: 'center' }}>
                      <PersonAvatar person={c.student} index={i} size={48} />
                      <Text style={styles.gridName} numberOfLines={1}>{c.student.first_name || c.student.username}</Text>
                    </PressableScale>
                    </FadeIn>
                  ))}
                  {hiddenCount > 0 && (
                    <TouchableOpacity style={styles.gridItem} onPress={() => setShowAll(true)} activeOpacity={0.8}>
                      <View style={styles.moreCircle}><Text style={styles.moreText}>+{hiddenCount}</Text></View>
                      <Text style={[styles.gridName, { color: MUTED }]}>more</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {showAll && others.length > MAX_TILES + 1 ? (
                <TouchableOpacity onPress={() => setShowAll(false)} style={styles.joinLink}>
                  <Text style={[styles.joinLinkText, { color: MUTED }]}>Show less</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity onPress={() => router.push('/(student)/join-class' as any)} style={styles.joinLink}>
                <Text style={styles.joinLinkText}>+ Join another class</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {/* Classmate details */}
      <Modal visible={picked !== null} transparent animationType="fade" onRequestClose={() => setPicked(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPicked(null)}>
          {picked && (
            <TouchableOpacity activeOpacity={1} style={styles.cmCard}>
              <View style={styles.cmBanner} />
              <Pop style={styles.cmAvatarRing}>
                <PersonAvatar person={picked.student} index={Math.max(0, others.findIndex((o) => o.id === picked.id))} size={84} />
              </Pop>
              <Text style={styles.cmName} numberOfLines={2}>{fullName(picked.student)}</Text>
              <Text style={styles.cmUser}>@{picked.student.username}</Text>
              <View style={styles.cmPills}>
                <View style={[styles.cmPill, groupNumberOf(picked.student.id) !== null ? styles.cmPillGold : styles.cmPillSoft]}>
                  <Ionicons name="people" size={13} color={BROWN} />
                  <Text style={styles.cmPillText}>
                    {groupNumberOf(picked.student.id) !== null ? `Group ${groupNumberOf(picked.student.id)}` : 'No group yet'}
                  </Text>
                </View>
                {picked.student.section && picked.student.section.trim() ? (
                  <View style={[styles.cmPill, styles.cmPillSoft]}>
                    <Ionicons name="school" size={13} color={BROWN} />
                    <Text style={styles.cmPillText}>{picked.student.section}</Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity style={styles.cmClose} onPress={() => setPicked(null)}>
                <Text style={styles.cmCloseText}>Close</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: TOP_GAP, paddingBottom: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: BROWN },
  sub: { fontSize: 13, color: MUTED, marginTop: 1 },
  content: { padding: 20, paddingBottom: 60, gap: 16 },
  error: { color: '#B3261E', fontSize: 13 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: T('#EADEC9') },
  chipOn: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { fontSize: 13, fontWeight: '700', color: BROWN },
  chipTextOn: { color: T('#3A2B1A') },
  groupCard: { backgroundColor: BROWN, borderRadius: 24, padding: 20, gap: 14 },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  groupTitle: { flex: 1, fontSize: 21, fontWeight: '800', color: '#fff' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: GOLD },
  pillText: { fontSize: 12, fontWeight: '700', color: T('#3A2B1A') },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  memberName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  memberRole: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  youText: { fontSize: 12, fontWeight: '700', color: GOLD },
  leaderTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  noGroupSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  moreCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFE3CC', alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 13, fontWeight: '800', color: BROWN },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: BROWN },
  grid: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 8, flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  gridItem: { width: '25%', alignItems: 'center', gap: 4 },
  gridName: { fontSize: 11, fontWeight: '700', color: BROWN, maxWidth: 64 },
  joinLink: { alignSelf: 'center', paddingVertical: 8 },
  joinLinkText: { fontSize: 14, fontWeight: '800', color: LINK },
  emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: BROWN },
  emptySub: { fontSize: 13, color: MUTED, textAlign: 'center' },
  primaryBtn: { marginTop: 8, backgroundColor: BROWN, borderRadius: 14, paddingHorizontal: 24, height: 46, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
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
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', width: 280, gap: 4 },
  modalName: { fontSize: 18, fontWeight: '800', color: BROWN, marginTop: 8, textAlign: 'center' },
  modalSub: { fontSize: 13, color: MUTED },
});