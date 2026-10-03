// mobile/app/(teacher)/class/[id].tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, Alert, Image, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  getClassDetail, getClassEnrollments, getClassGroups,
  createGroup, updateGroup, deleteGroup, addGroupMember, removeGroupMember,
} from '../../../src/api/classrooms';
import { getMyQuests, createQuest, updateQuest } from '../../../src/api/quests';
import { getMediaUrl } from '../../../src/utils/media';
import {
  ClassSummary, ClassEnrollment, Group, GroupCreatePayload,
} from '../../../src/types/classrooms';
import { Quest, QuestCreatePayload } from '../../../src/types/quests';

const CREAM = '#F2E4C4';
const CARD_BG = '#F9C544';
const BROWN = '#3A2B1A';
const GREEN = '#2FA85B';
const RED = '#B3261E';

type Tab = 'roster' | 'groups' | 'quests';

export default function ClassOverview() {
  const router = useRouter();
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

  // ---- Quest create modal ----
  const [showCreateQuestModal, setShowCreateQuestModal] = useState(false);
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestDescription, setNewQuestDescription] = useState('');
  const [newQuestType, setNewQuestType] = useState('');
  const [isSubmittingQuest, setIsSubmittingQuest] = useState(false);

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
      setQuests(allQuests.filter((q) => q.class_obj === classId));
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
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not create group.');
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
          } catch {
            Alert.alert('Error', 'Could not delete group.');
          }
        },
      },
    ]);
  }

  async function handleSetLeader(group: Group, studentId: number) {
    try {
      const updated = await updateGroup(group.id, { leader: studentId });
      setGroups((prev) => prev.map((g) => (g.id === group.id ? updated : g)));
    } catch {
      Alert.alert('Error', 'Could not set leader — they must be enrolled in this class.');
    }
  }

  async function handleAddMember(group: Group, studentId: number) {
    try {
      const member = await addGroupMember(group.id, { student: studentId });
      setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, members: [...g.members, member] } : g)));
      setAddMemberTargetGroup(null);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not add member.');
    }
  }

  async function handleRemoveMember(group: Group, memberId: number) {
    try {
      await removeGroupMember(memberId);
      setGroups((prev) =>
        prev.map((g) => (g.id === group.id ? { ...g, members: g.members.filter((m) => m.id !== memberId) } : g))
      );
    } catch {
      Alert.alert('Error', 'Could not remove member.');
    }
  }

  // ---------------- Quests ----------------
  async function handleCreateQuest() {
    if (!newQuestTitle.trim()) {
      Alert.alert('Missing info', 'Please enter a quest title.');
      return;
    }
    setIsSubmittingQuest(true);
    try {
      const nextOrder = quests.length > 0 ? Math.max(...quests.map((q) => q.order_index)) + 1 : 1;
      const payload: QuestCreatePayload = {
        class_obj: classId,
        title: newQuestTitle.trim(),
        description: newQuestDescription.trim(),
        table_setting_type: newQuestType.trim() || 'general',
        order_index: nextOrder,
        is_published: false,
      };
      const created = await createQuest(payload);
      setQuests((prev) => [...prev, created]);
      setNewQuestTitle('');
      setNewQuestDescription('');
      setNewQuestType('');
      setShowCreateQuestModal(false);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not create quest.');
    } finally {
      setIsSubmittingQuest(false);
    }
  }

  async function handleTogglePublish(quest: Quest) {
    try {
      const updated = await updateQuest(quest.id, { is_published: !quest.is_published });
      setQuests((prev) => prev.map((q) => (q.id === quest.id ? updated : q)));
    } catch {
      Alert.alert('Error', 'Could not update quest.');
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
          <Text style={styles.title}>{classDetail.class_name}</Text>
          <Text style={styles.subtitle}>{classDetail.invite_code} • {classDetail.student_count} Students</Text>
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
            <View style={styles.card}>
              {roster.map((enrollment) => {
                const name = studentDisplayName(enrollment);
                const avatarUrl = getMediaUrl(enrollment.student.profile_picture);
                const groupNum = groupNumberFor(enrollment.student.id);
                return (
                  <View key={enrollment.id} style={styles.rosterRow}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>{name.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rosterName}>{name}</Text>
                      <Text style={styles.rosterSub}>
                        {groupNum !== null ? `Group ${groupNum}` : 'No group yet'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        )}

        {/* ================= GROUPS ================= */}
        {activeTab === 'groups' && (
          <>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateGroupModal(true)}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addButtonText}>Create Group</Text>
            </TouchableOpacity>

            {groups.length === 0 ? (
              <Text style={styles.emptyText}>No groups yet.</Text>
            ) : (
              groups.map((group) => (
                <View key={group.id} style={styles.groupCard}>
                  <View style={styles.groupCardHeader}>
                    <Text style={styles.groupTitle}>
                      {group.group_name || `Group ${group.group_number}`}
                    </Text>
                    <TouchableOpacity onPress={() => handleDeleteGroup(group)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={18} color={RED} />
                    </TouchableOpacity>
                  </View>

                  {group.members.length === 0 ? (
                    <Text style={styles.groupEmptyText}>No members yet.</Text>
                  ) : (
                    group.members.map((member) => {
                      const isLeader = group.leader?.id === member.student.id;
                      return (
                        <View key={member.id} style={styles.memberRow}>
                          <TouchableOpacity onPress={() => handleSetLeader(group, member.student.id)}>
                            <Ionicons
                              name={isLeader ? 'star' : 'star-outline'}
                              size={16}
                              color={isLeader ? GREEN : '#B8A671'}
                            />
                          </TouchableOpacity>
                          <Text style={styles.memberName}>{memberDisplayName(member)}</Text>
                          {isLeader && <Text style={styles.leaderTag}>Leader</Text>}
                          <TouchableOpacity onPress={() => handleRemoveMember(group, member.id)}>
                            <Ionicons name="close-circle-outline" size={18} color="#B8A671" />
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}

                  <TouchableOpacity style={styles.addMemberButton} onPress={() => setAddMemberTargetGroup(group)}>
                    <Ionicons name="person-add-outline" size={14} color={BROWN} />
                    <Text style={styles.addMemberText}>Add Member</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {/* ================= QUESTS ================= */}
        {activeTab === 'quests' && (
          <>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateQuestModal(true)}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addButtonText}>Create Quest</Text>
            </TouchableOpacity>

            {quests.length === 0 ? (
              <Text style={styles.emptyText}>No quests assigned to this class yet.</Text>
            ) : (
              quests.map((quest) => (
                <View key={quest.id} style={styles.questCard}>
                  <View style={styles.questCardTop}>
                    <Text style={styles.questTitle}>{quest.title}</Text>
                    <Switch
                      value={quest.is_published}
                      onValueChange={() => handleTogglePublish(quest)}
                      trackColor={{ false: '#EADEC9', true: GREEN }}
                      thumbColor="#fff"
                    />
                  </View>
                  {quest.description ? <Text style={styles.questDesc}>{quest.description}</Text> : null}
                  <Text style={styles.questMeta}>
                    {quest.total_steps} step{quest.total_steps === 1 ? '' : 's'} • {quest.is_published ? 'Published' : 'Draft'}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* ---------------- Create Group modal ---------------- */}
      <Modal visible={showCreateGroupModal} transparent animationType="fade" onRequestClose={() => setShowCreateGroupModal(false)}>
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>

      {/* ---------------- Add Member modal ---------------- */}
      <Modal visible={addMemberTargetGroup !== null} transparent animationType="fade" onRequestClose={() => setAddMemberTargetGroup(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Member</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {roster
                .filter((e) => !addMemberTargetGroup?.members.some((m) => m.student.id === e.student.id))
                .map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    style={styles.pickerRow}
                    onPress={() => addMemberTargetGroup && handleAddMember(addMemberTargetGroup, e.student.id)}
                  >
                    <Text style={styles.pickerRowText}>{studentDisplayName(e)}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setAddMemberTargetGroup(null)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---------------- Create Quest modal ---------------- */}
      <Modal visible={showCreateQuestModal} transparent animationType="fade" onRequestClose={() => setShowCreateQuestModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Quest</Text>

            <Text style={styles.modalLabel}>TITLE</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. Setup Table Setting" value={newQuestTitle} onChangeText={setNewQuestTitle} />

            <Text style={styles.modalLabel}>DESCRIPTION</Text>
            <TextInput style={styles.modalInput} placeholder="Short description" value={newQuestDescription} onChangeText={setNewQuestDescription} multiline />

            <Text style={styles.modalLabel}>TYPE (E.G. "INDIVIDUAL", "GROUP")</Text>
            <TextInput style={styles.modalInput} placeholder="general" value={newQuestType} onChangeText={setNewQuestType} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowCreateQuestModal(false)} disabled={isSubmittingQuest}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleCreateQuest} disabled={isSubmittingQuest}>
                {isSubmittingQuest ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  backButton: { padding: 6, borderRadius: 20, backgroundColor: CARD_BG },
  title: { fontSize: 18, fontWeight: '800', color: BROWN },
  subtitle: { fontSize: 12, color: '#8A6A2A', marginTop: 2 },

  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 16 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#EADEC9' },
  tabButtonActive: { backgroundColor: BROWN, borderColor: BROWN },
  tabText: { fontSize: 13, fontWeight: '700', color: BROWN },
  tabTextActive: { color: '#fff' },

  errorText: { color: RED, marginBottom: 12, fontSize: 13 },
  emptyText: { fontSize: 13, color: '#8A6A2A', marginTop: 16 },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#EADEC9', overflow: 'hidden' },
  rosterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.08)',
  },
  avatarImage: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: CARD_BG, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 12, fontWeight: '800', color: BROWN },
  rosterName: { fontSize: 14, fontWeight: '700', color: '#C2551A' },
  rosterSub: { fontSize: 11, color: '#8A6A2A', marginTop: 1 },

  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 12, marginBottom: 16,
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  groupCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#EADEC9', padding: 14, marginBottom: 12 },
  groupCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  groupTitle: { fontSize: 15, fontWeight: '800', color: BROWN },
  groupEmptyText: { fontSize: 12, color: '#8A6A2A', marginBottom: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  memberName: { flex: 1, fontSize: 13, color: BROWN, fontWeight: '600' },
  leaderTag: { fontSize: 10, fontWeight: '800', color: GREEN, backgroundColor: '#E9F7EE', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  addMemberButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  addMemberText: { fontSize: 12, fontWeight: '700', color: BROWN },

  questCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#EADEC9', padding: 14, marginBottom: 12 },
  questCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questTitle: { fontSize: 15, fontWeight: '800', color: BROWN, flex: 1, marginRight: 10 },
  questDesc: { fontSize: 12, color: '#8A6A2A', marginTop: 6 },
  questMeta: { fontSize: 11, color: '#B8A671', marginTop: 8, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: BROWN, marginBottom: 16 },
  modalLabel: { fontSize: 11, fontWeight: '700', color: '#8A6A2A', letterSpacing: 0.5, marginBottom: 6, marginTop: 10 },
  modalInput: { borderWidth: 1, borderColor: '#EADEC9', borderRadius: 10, padding: 10, fontSize: 14, color: BROWN },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#F5F0E6' },
  modalCancelText: { color: '#8A6A2A', fontWeight: '700' },
  modalConfirmButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#5C3A2E' },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
  pickerRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.08)' },
  pickerRowText: { fontSize: 14, color: BROWN, fontWeight: '600' },
});