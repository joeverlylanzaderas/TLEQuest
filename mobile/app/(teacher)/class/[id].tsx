// mobile/app/(teacher)/class/[id].tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, Alert, Switch,
} from 'react-native';
import { T, HEADER_BG, HEADER_TEXT, activeTheme } from '../../../src/theme/theme';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  getClassDetail, getClassEnrollments, getClassGroups,
  createGroup, updateGroup, deleteGroup, addGroupMember, removeGroupMember,
} from '../../../src/api/classrooms';
import { getMyQuests, updateQuest } from '../../../src/api/quests';
import { thumbUrl } from '../../../src/utils/media';
import {
  ClassSummary, ClassEnrollment, Group, GroupCreatePayload,
} from '../../../src/types/classrooms';
import { Quest } from '../../../src/types/quests';
import KeyboardSafe from '../../../src/components/KeyboardSafe';
import CachedImage from '../../../src/components/CachedImage';
import { useToast } from '../../../src/components/Toast';
import { FadeIn, PressableScale } from '../../../src/components/Motion';
import { TOP_GAP } from '../../../src/theme/layout';

const CREAM = T('#F5EDD8');
const CARD_BG = T('#F5B921');
const AVATAR_TINTS = [
  { bg: '#F7C9C0', fg: '#7A2E1F' },
  { bg: '#CFE0F5', fg: '#1F4D7A' },
  { bg: '#FBE3A6', fg: '#6B4A00' },
  { bg: '#CDE7D3', fg: '#1F5A35' },
  { bg: '#E4D3F2', fg: '#4B2A70' },
];
const BROWN = T('#3A2B1A');
const GREEN = '#2FA85B';
const RED = '#B3261E';

type Tab = 'roster' | 'groups' | 'quests';

export default function ClassOverview() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = Number(id);

  const [activeTab, setActiveTab] = useState<Tab>('roster');
  const [classDetail, setClassDetail] = useState<ClassSummary | null>(null);
  const [roster, setRoster] = useState<ClassEnrollment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // ---- Group create/add-member modals ----
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [addMemberTargetGroup, setAddMemberTargetGroup] = useState<Group | null>(null);
  // ---- Rename group + roster sort ----
  const [editGroupTarget, setEditGroupTarget] = useState<Group | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [rosterSort, setRosterSort] = useState<'az' | 'za' | 'group'>('az');

  async function loadAll() {
    setError('');
    try {
      const [detail, enrollments, groupsData, allQuests] = await Promise.all([
        getClassDetail(classId),
        getClassEnrollments(classId),
        getClassGroups(classId),
        getMyQuests(),
      ]);
      setClassDetail(detail);
      setRoster(enrollments);
      setGroups(groupsData);
      // No class-filtered quest endpoint exists — filter client-side.
      setQuests(allQuests.filter((q) => q.classes.includes(classId)));
    } catch (e) {
      setError('Could not load class data. Pull down to try again.');
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadAll().finally(() => setIsLoading(false));
    }, [classId])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadAll();
    setIsRefreshing(false);
  }

  function studentDisplayName(e: ClassEnrollment): string {
    const full = [e.student.first_name, e.student.last_name].filter(Boolean).join(' ');
    return full || e.student.username;
  }

  function memberDisplayName(member: Group['members'][number]): string {
    const full = [member.student.first_name, member.student.last_name].filter(Boolean).join(' ');
    return full || member.student.username;
  }

  // Groups a student already belongs to (a student can be in more than one group)
  function groupLabelsFor(studentId: number): string[] {
    return groups
      .filter((grp) => grp.members.some((m) => m.student.id === studentId))
      .map((grp) => grp.group_name || `Group ${grp.group_number}`);
  }

  function sortedRoster(): ClassEnrollment[] {
    return [...roster].sort((a, b) => {
      if (rosterSort === 'group') {
        const ga = groupNumberFor(a.student.id) ?? 9999;
        const gb = groupNumberFor(b.student.id) ?? 9999;
        if (ga !== gb) return ga - gb;
      }
      const cmp = studentDisplayName(a).localeCompare(studentDisplayName(b));
      return rosterSort === 'za' ? -cmp : cmp;
    });
  }

  function openRenameGroup(group: Group) {
    setEditGroupTarget(group);
    setEditGroupName(group.group_name || '');
  }

  async function handleRenameGroup() {
    if (!editGroupTarget) return;
    setIsRenaming(true);
    try {
      const updated = await updateGroup(editGroupTarget.id, { group_name: editGroupName.trim() });
      const newName = updated?.group_name ?? editGroupName.trim();
      setGroups((prev) => prev.map((g) => (g.id === editGroupTarget.id ? { ...g, group_name: newName } : g)));
      setEditGroupTarget(null);
      toast.success('Group name updated');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.response?.data?.group_name?.[0] || 'Could not rename the group.');
    } finally {
      setIsRenaming(false);
    }
  }

  function groupNumberFor(studentId: number): number | null {
    const g = groups.find((grp) => grp.members.some((m) => m.student.id === studentId));
    return g ? g.group_number : null;
  }

  // ---------------- Groups ----------------
  async function handleCreateGroup() {
    setIsSubmittingGroup(true);
    try {
      const nextNumber = groups.length > 0 ? Math.max(...groups.map((g) => g.group_number)) + 1 : 1;
      const payload: GroupCreatePayload = { group_number: nextNumber, group_name: newGroupName.trim() || undefined };
      const created = await createGroup(classId, payload);
      setGroups((prev) => [...prev, created]);
      setNewGroupName('');
      setShowCreateGroupModal(false);
      toast.success(`Group ${created.group_number} created`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Could not create group.');
    } finally {
      setIsSubmittingGroup(false);
    }
  }

  async function handleDeleteGroup(group: Group) {
    Alert.alert('Delete Group', `Delete Group ${group.group_number}? This removes all its members.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteGroup(group.id);
            setGroups((prev) => prev.filter((g) => g.id !== group.id));
            toast.success(`Group ${group.group_number} deleted`);
          } catch {
            toast.error('Could not delete group.');
          }
        },
      },
    ]);
  }

  async function handleSetLeader(group: Group, studentId: number) {
    try {
      const updated = await updateGroup(group.id, { leader: studentId });
      setGroups((prev) => prev.map((g) => (g.id === group.id ? updated : g)));
      toast.success('Group leader updated');
    } catch {
      toast.error('Could not set leader — they must be enrolled in this class.');
    }
  }

  async function handleAddMember(group: Group, studentId: number) {
    try {
      const member = await addGroupMember(group.id, { student: studentId });
      setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, members: [...g.members, member] } : g)));
      setAddMemberTargetGroup(null);
      toast.success('Member added');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Could not add member.');
    }
  }

  async function handleRemoveMember(group: Group, memberId: number) {
    try {
      await removeGroupMember(memberId);
      setGroups((prev) =>
        prev.map((g) => (g.id === group.id ? { ...g, members: g.members.filter((m) => m.id !== memberId) } : g))
      );
      toast.success('Member removed');
    } catch {
      toast.error('Could not remove member.');
    }
  }

  // ---------------- Quests ----------------
  async function handleTogglePublish(quest: Quest) {
    try {
      const updated = await updateQuest(quest.id, { is_published: !quest.is_published });
      setQuests((prev) => prev.map((q) => (q.id === quest.id ? updated : q)));
      toast.success(updated.is_published ? 'Quest published' : 'Quest moved to draft');
    } catch {
      toast.error('Could not update quest.');
    }
  }

  if (isLoading || !classDetail) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={BROWN} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={BROWN} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{classDetail.class_name}</Text>
          <View style={styles.headChips}>
            <View style={styles.headChip}>
              <Ionicons name="key" size={11} color="#6B4A00" />
              <Text style={styles.headChipText}>{classDetail.invite_code}</Text>
            </View>
            <View style={styles.headChip}>
              <Ionicons name="people" size={11} color="#6B4A00" />
              <Text style={styles.headChipText}>{classDetail.student_count} students</Text>
            </View>
            <View style={styles.headChip}>
              <Ionicons name="albums" size={11} color="#6B4A00" />
              <Text style={styles.headChipText}>{groups.length} {groups.length === 1 ? 'group' : 'groups'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ---------------- Tabs ---------------- */}
      <View style={styles.tabRow}>
        {(['roster', 'groups', 'quests'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'roster' ? 'Roster' : tab === 'groups' ? 'Groups' : 'Quests'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* ================= ROSTER ================= */}
        {activeTab === 'roster' && (
          roster.length === 0 ? (
            <Text style={styles.emptyText}>No students enrolled yet.</Text>
          ) : (
            <FadeIn>
            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>Sort</Text>
              {([['az', 'A–Z'], ['za', 'Z–A'], ['group', 'Group']] as const).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.sortChip, rosterSort === key && styles.sortChipActive]}
                  onPress={() => setRosterSort(key)}
                >
                  <Text style={[styles.sortChipText, rosterSort === key && styles.sortChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.card}>
              {sortedRoster().map((enrollment) => {
                const name = studentDisplayName(enrollment);
                const avatarUrl = thumbUrl(enrollment.student.profile_picture, 40);
                const groupNum = groupNumberFor(enrollment.student.id);
                return (
                  <View key={enrollment.id} style={styles.rosterRow}>
                    {avatarUrl ? (
                      <CachedImage uri={avatarUrl} size={160} square style={styles.avatarImage} />
                    ) : (
                      <View style={[styles.avatarFallback, { backgroundColor: AVATAR_TINTS[enrollment.student.id % AVATAR_TINTS.length].bg }]}>
                        <Text style={[styles.avatarFallbackText, { color: AVATAR_TINTS[enrollment.student.id % AVATAR_TINTS.length].fg }]}>
                          {name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.rosterName} numberOfLines={1}>{name}</Text>
                    <View style={[styles.groupPill, groupNum === null && styles.groupPillNone]}>
                      <Text style={[styles.groupPillText, groupNum === null && { color: '#6B7280' }]}>
                        {groupNum !== null ? `Group ${groupNum}` : 'No group'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            </FadeIn>
          )
        )}

        {/* ================= GROUPS ================= */}
        {activeTab === 'groups' && (
          <>
            <PressableScale containerStyle={styles.addWrap} style={styles.addButton} scaleTo={0.95} onPress={() => setShowCreateGroupModal(true)}>
              <Ionicons name="add" size={18} color={BROWN} />
              <Text style={styles.addButtonText}>Create group</Text>
            </PressableScale>

            {groups.length === 0 ? (
              <Text style={styles.emptyText}>No groups yet.</Text>
            ) : (
              groups.map((group, gi) => (
                <FadeIn key={group.id} delay={Math.min(gi, 5) * 70}>
                <View style={styles.groupCard}>
                  <View style={styles.groupCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupTitle}>
                        {group.group_name || `Group ${group.group_number}`}
                      </Text>
                      <Text style={styles.groupCount}>{group.members.length} {group.members.length === 1 ? 'member' : 'members'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <TouchableOpacity onPress={() => openRenameGroup(group)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="create-outline" size={18} color={BROWN} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteGroup(group)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={18} color={RED} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {group.members.length === 0 ? (
                    <Text style={styles.groupEmptyText}>No members yet.</Text>
                  ) : (
                    group.members.map((member) => {
                      const isLeader = group.leader?.id === member.student.id;
                      return (
                        <View key={member.id} style={styles.memberRow}>
                          <View style={[styles.memberAvatar, { backgroundColor: AVATAR_TINTS[member.student.id % AVATAR_TINTS.length].bg }]}>
                            <Text style={[styles.memberAvatarText, { color: AVATAR_TINTS[member.student.id % AVATAR_TINTS.length].fg }]}>
                              {memberDisplayName(member).charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.memberName} numberOfLines={1}>{memberDisplayName(member)}</Text>
                          <TouchableOpacity onPress={() => handleSetLeader(group, member.student.id)} hitSlop={6}>
                            {isLeader ? (
                              <View style={styles.leaderPill}>
                                <Ionicons name="star" size={11} color={GREEN} />
                                <Text style={styles.leaderTag}>Leader</Text>
                              </View>
                            ) : (
                              <Ionicons name="star-outline" size={18} color="#B8A671" />
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleRemoveMember(group, member.id)}>
                            <Ionicons name="close-circle-outline" size={18} color="#B8A671" />
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}

                  <TouchableOpacity style={styles.addMemberButton} onPress={() => setAddMemberTargetGroup(group)}>
                    <Ionicons name="person-add-outline" size={14} color={BROWN} />
                    <Text style={styles.addMemberText}>Add member</Text>
                  </TouchableOpacity>
                </View>
                </FadeIn>
              ))
            )}
          </>
        )}

        {/* ================= QUESTS ================= */}
        {activeTab === 'quests' && (
          <>
            <PressableScale
              containerStyle={styles.addWrap}
              style={styles.addButton}
              scaleTo={0.95}
              onPress={() => router.push(`/(teacher)/create-quest?classId=${classId}` as any)}
            >
              <Ionicons name="add" size={18} color={BROWN} />
              <Text style={styles.addButtonText}>Create quest</Text>
            </PressableScale>

            {quests.length === 0 ? (
              <Text style={styles.emptyText}>No quests assigned to this class yet.</Text>
            ) : (
              quests.map((quest, qi) => (
                <FadeIn key={quest.id} delay={Math.min(qi, 5) * 70}>
                <View style={styles.questCard}>
                  <View style={styles.questCardTop}>
                    <Text style={styles.questTitle}>{quest.title}</Text>
                    <Switch
                      value={quest.is_published}
                      onValueChange={() => handleTogglePublish(quest)}
                      trackColor={{ false: T('#EADEC9'), true: GREEN }}
                      thumbColor="#fff"
                    />
                  </View>
                  {quest.description ? <Text style={styles.questDesc}>{quest.description}</Text> : null}
                  <View style={styles.questFoot}>
                    <View style={styles.stepsPill}>
                      <Ionicons name="list" size={12} color="#6B4A00" />
                      <Text style={styles.stepsPillText}>{quest.total_steps} step{quest.total_steps === 1 ? '' : 's'}</Text>
                    </View>
                    <Text style={[styles.questMeta, { color: quest.is_published ? '#166534' : '#6B7280' }]}>
                      {quest.is_published ? '● Published' : '● Draft'}
                    </Text>
                  </View>
                </View>
                </FadeIn>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* ---------------- Create Group modal ---------------- */}
      <Modal visible={showCreateGroupModal} transparent animationType="fade" onRequestClose={() => setShowCreateGroupModal(false)}>
        <KeyboardSafe style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <Text style={styles.modalLabel}>GROUP NAME (OPTIONAL)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Table Setters"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowCreateGroupModal(false)} disabled={isSubmittingGroup}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleCreateGroup} disabled={isSubmittingGroup}>
                {isSubmittingGroup ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardSafe>
      </Modal>

      {/* ---------------- Rename Group modal ---------------- */}
      <Modal visible={editGroupTarget !== null} transparent animationType="fade" onRequestClose={() => setEditGroupTarget(null)}>
        <KeyboardSafe style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Group Name</Text>
            <Text style={styles.modalLabel}>GROUP NAME</Text>
            <TextInput
              style={styles.modalInput}
              value={editGroupName}
              onChangeText={setEditGroupName}
              placeholder={editGroupTarget ? `Group ${editGroupTarget.group_number}` : ''}
              maxLength={100}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setEditGroupTarget(null)} disabled={isRenaming}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleRenameGroup} disabled={isRenaming}>
                {isRenaming ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardSafe>
      </Modal>

      {/* ---------------- Add Member modal ---------------- */}
      <Modal visible={addMemberTargetGroup !== null} transparent animationType="fade" onRequestClose={() => setAddMemberTargetGroup(null)}>
        <KeyboardSafe style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Add to {addMemberTargetGroup ? (addMemberTargetGroup.group_name || `Group ${addMemberTargetGroup.group_number}`) : 'group'}
            </Text>
            <ScrollView style={{ maxHeight: 300, marginBottom: 12 }}>
              {roster
                .filter((e) => !addMemberTargetGroup?.members.some((m) => m.student.id === e.student.id))
                .sort((a, b) => {
                  // students with no group first, then A-Z
                  const ga = groupLabelsFor(a.student.id).length > 0 ? 1 : 0;
                  const gb = groupLabelsFor(b.student.id).length > 0 ? 1 : 0;
                  return ga - gb || studentDisplayName(a).localeCompare(studentDisplayName(b));
                })
                .map((e) => {
                  const inGroups = groupLabelsFor(e.student.id);
                  return (
                    <TouchableOpacity
                      key={e.id}
                      style={[styles.pickerRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }]}
                      onPress={() => addMemberTargetGroup && handleAddMember(addMemberTargetGroup, e.student.id)}
                    >
                      <Text style={[styles.pickerRowText, { flex: 1 }]}>{studentDisplayName(e)}</Text>
                      <Text style={[styles.pickerRowTag, inGroups.length === 0 && { color: GREEN }]}>
                        {inGroups.length === 0 ? 'No group' : `In ${inGroups.join(', ')}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setAddMemberTargetGroup(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardSafe>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: TOP_GAP },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: BROWN },
  headChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  headChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF1C7', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  headChipText: { fontSize: 11, fontWeight: '800', color: '#6B4A00' },
  subtitle: { fontSize: 12, color: T('#8A6A2A'), marginTop: 2 },

  tabRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, backgroundColor: T('#EADEC9'), borderRadius: 14, padding: 4 },
  tabButton: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabButtonActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 13, fontWeight: '600', color: T('#8A6A2A') },
  tabTextActive: { color: BROWN, fontWeight: '800' },

  errorText: { color: RED, marginBottom: 12, fontSize: 13 },
  emptyText: { fontSize: 13, color: T('#8A6A2A'), marginTop: 16 },

  card: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' },
  rosterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.08)',
  },
  avatarImage: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 14, fontWeight: '800' },
  rosterName: { flex: 1, fontSize: 14, fontWeight: '700', color: BROWN },
  groupPill: { backgroundColor: '#FFF1C7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  groupPillNone: { backgroundColor: '#F3F4F6' },
  groupPillText: { fontSize: 11, fontWeight: '800', color: '#6B4A00' },
  rosterSub: { fontSize: 11, color: T('#8A6A2A'), marginTop: 1 },

  addWrap: { alignSelf: 'flex-start', marginBottom: 14 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: CARD_BG, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  addButtonText: { color: BROWN, fontSize: 13, fontWeight: '800' },

  groupCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12 },
  groupCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  groupTitle: { fontSize: 16, fontWeight: '900', color: BROWN },
  groupCount: { fontSize: 11, color: T('#8A6A2A'), marginTop: 1 },
  memberAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 12, fontWeight: '800' },
  leaderPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E9F7EE', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  groupEmptyText: { fontSize: 12, color: T('#8A6A2A'), marginBottom: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  memberName: { flex: 1, fontSize: 13, color: BROWN, fontWeight: '600' },
  leaderTag: { fontSize: 10, fontWeight: '800', color: GREEN },
  addMemberButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#F6F0E1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  addMemberText: { fontSize: 12, fontWeight: '700', color: BROWN },

  questCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12 },
  questFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  stepsPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF1C7', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  stepsPillText: { fontSize: 11, fontWeight: '800', color: '#6B4A00' },
  questCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questTitle: { fontSize: 15, fontWeight: '800', color: BROWN, flex: 1, marginRight: 10 },
  questDesc: { fontSize: 12, color: T('#8A6A2A'), marginTop: 6 },
  questMeta: { fontSize: 11, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: BROWN, marginBottom: 16 },
  modalLabel: { fontSize: 11, fontWeight: '700', color: T('#8A6A2A'), letterSpacing: 0.5, marginBottom: 6, marginTop: 10 },
  modalInput: { borderWidth: 1, borderColor: T('#EADEC9'), borderRadius: 10, padding: 10, fontSize: 14, color: BROWN },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#F5F0E6' },
  modalCancelText: { color: T('#8A6A2A'), fontWeight: '700' },
  modalConfirmButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: T('#5C3A2E') },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
  pickerRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.08)' },
  pickerRowText: { fontSize: 14, color: BROWN, fontWeight: '600' },
  pickerRowTag: { fontSize: 11, color: T('#8A6A2A'), fontWeight: '700', maxWidth: '45%', textAlign: 'right' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sortLabel: { fontSize: 12, fontWeight: '700', color: T('#8A6A2A') },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(58,43,26,0.08)' },
  sortChipActive: { backgroundColor: T('#5C3A2E') },
  sortChipText: { fontSize: 12, fontWeight: '700', color: BROWN },
  sortChipTextActive: { color: '#fff' },
});