// mobile/app/(teacher)/quest/[id].tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getQuestDetail, updateQuest, deleteQuest, createQuestStep, updateQuestStep, deleteQuestStep,
  createChecklistItem, updateChecklistItem, deleteChecklistItem,
} from '../../../src/api/quests';
import { getAssignmentsForQuest, updateAssignmentDueDate, assignQuest } from '../../../src/api/assignments';
import { getMyClasses, getClassGroups } from '../../../src/api/classrooms';
import { Quest, QuestStep } from '../../../src/types/quests';
import { QuestAssignment } from '../../../src/types/assignments';
import { ClassSummary } from '../../../src/types/classrooms';

const CREAM = '#F2E4C4';
const BROWN = '#3A2B1A';
const GREEN = '#2FA85B';
const ORANGE = '#EA580C';
const GOLD = '#F5B921';

interface GroupOption {
  id: number;
  name: string;
  className: string;
}

export default function QuestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const questId = Number(id);

  const [quest, setQuest] = useState<Quest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [isSavingHeader, setIsSavingHeader] = useState(false);

  // ---- Classes multi-select ----
  const [myClasses, setMyClasses] = useState<ClassSummary[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [classPickerVisible, setClassPickerVisible] = useState(false);
  const [isSavingClasses, setIsSavingClasses] = useState(false);

  // ---- Due dates (one per group assignment) ----
  const [assignments, setAssignments] = useState<QuestAssignment[]>([]);
  const [editingDueDates, setEditingDueDates] = useState<Record<number, string>>({});
  const [savingAssignmentId, setSavingAssignmentId] = useState<number | null>(null);
  const [savedAssignmentId, setSavedAssignmentId] = useState<number | null>(null);

  // ---- Assign to chosen groups ----
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [pickedGroupIds, setPickedGroupIds] = useState<number[]>([]);
  const [groupPickerVisible, setGroupPickerVisible] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // ---- Step modal (add or edit) ----
  const [stepModalVisible, setStepModalVisible] = useState(false);
  const [editingStep, setEditingStep] = useState<QuestStep | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalInstruction, setModalInstruction] = useState('');
  const [modalChecklist, setModalChecklist] = useState<{ id?: number; text: string }[]>([]);
  const [modalChecklistInput, setModalChecklistInput] = useState('');
  const [isSavingStep, setIsSavingStep] = useState(false);

  function extractErrorMessage(e: any, fallback: string): string {
    const data = e?.response?.data;
    if (!data) return fallback;
    if (data.detail) return data.detail;
    const firstKey = Object.keys(data)[0];
    if (firstKey && Array.isArray(data[firstKey])) return data[firstKey][0];
    return fallback;
  }

  async function loadQuest() {
    setError('');
    try {
      const data = await getQuestDetail(questId);
      setQuest(data);
      setTitleDraft(data.title);
      setDescriptionDraft(data.description);
      setSelectedClassIds(data.classes);
    } catch (e: any) {
      setError(extractErrorMessage(e, 'Could not load this quest.'));
    }
  }

  async function loadAssignments() {
    try {
      const data = await getAssignmentsForQuest(questId);
      setAssignments(data);
      const dates: Record<number, string> = {};
      data.forEach((a) => { dates[a.id] = a.due_date ? a.due_date.slice(0, 10) : ''; });
      setEditingDueDates(dates);
    } catch {
      // due dates are supplementary info, fail quietly
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      Promise.all([loadQuest(), loadAssignments()]).finally(() => setIsLoading(false));
    }, [questId])
  );

  useEffect(() => {
    getMyClasses().then(setMyClasses).catch(() => {});
  }, []);

  // Groups that belong to this quest's classes, for the group picker
  const questClassKey = quest?.classes?.join(',') ?? '';
  useEffect(() => {
    if (!quest || myClasses.length === 0) return;
    Promise.all(
      quest.classes.map(async (cid) => {
        const cls = myClasses.find((c) => c.id === cid);
        try {
          const groups = await getClassGroups(cid);
          return groups.map((g) => ({
            id: g.id,
            name: g.group_name || `Group ${g.group_number}`,
            className: cls?.class_name || `#${cid}`,
          }));
        } catch {
          return [] as GroupOption[];
        }
      })
    ).then((lists) => setGroupOptions(lists.flat()));
  }, [questClassKey, myClasses.length]);

  function toggleClassSelection(classId: number) {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((cid) => cid !== classId) : [...prev, classId]
    );
  }

  function toggleGroupPick(groupId: number) {
    setPickedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((g) => g !== groupId) : [...prev, groupId]
    );
  }

  async function handleSaveClasses() {
    if (!quest) return;
    if (selectedClassIds.length === 0) {
      Alert.alert('No classes selected', 'A quest must belong to at least one class.');
      return;
    }
    setIsSavingClasses(true);
    try {
      const updated = await updateQuest(quest.id, { classes: selectedClassIds });
      setQuest(updated);
      setClassPickerVisible(false);
    } catch (e: any) {
      Alert.alert('Error', extractErrorMessage(e, 'Could not update classes.'));
    } finally {
      setIsSavingClasses(false);
    }
  }

  async function handleSaveHeader() {
    if (!titleDraft.trim()) {
      Alert.alert('Missing title', 'Quest title cannot be empty.');
      return;
    }
    setIsSavingHeader(true);
    try {
      const updated = await updateQuest(questId, {
        title: titleDraft.trim(),
        description: descriptionDraft.trim(),
      });
      setQuest(updated);
    } catch (e: any) {
      Alert.alert('Error', extractErrorMessage(e, 'Could not save changes.'));
    } finally {
      setIsSavingHeader(false);
    }
  }

  async function handleTogglePublish() {
    if (!quest) return;
    try {
      const updated = await updateQuest(quest.id, { is_published: !quest.is_published });
      setQuest(updated);
    } catch (e: any) {
      Alert.alert('Error', extractErrorMessage(e, 'Could not update publish status.'));
    }
  }

  async function handleSaveDueDate(assignmentId: number) {
    const raw = (editingDueDates[assignmentId] || '').trim();
    if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      Alert.alert('Invalid date', 'Please use the format YYYY-MM-DD (e.g. 2026-10-15), or leave it empty.');
      return;
    }
    setSavingAssignmentId(assignmentId);
    try {
      const updated = await updateAssignmentDueDate(assignmentId, raw || null);
      setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? updated : a)));
      setSavedAssignmentId(assignmentId);
      setTimeout(() => setSavedAssignmentId(null), 1500);
    } catch (e: any) {
      Alert.alert('Error', extractErrorMessage(e, 'Could not update the due date.'));
    } finally {
      setSavingAssignmentId(null);
    }
  }

  // Safe to run again: the backend uses get_or_create, so already-assigned groups are skipped
  async function handleAssignToGroups() {
    if (!quest) return;
    if (!quest.is_published) {
      Alert.alert('Not published', 'Publish the quest first, then assign it to groups.');
      return;
    }
    if (pickedGroupIds.length === 0) {
      Alert.alert('No groups selected', 'Choose at least one group to assign this quest to.');
      return;
    }
    setIsAssigning(true);
    try {
      const before = assignments.length;
      const result = await assignQuest({
        quest: quest.id,
        quest_mode: 'group',
        due_date: null,
        group_ids: pickedGroupIds,
      });
      await loadAssignments();
      const added = Math.max(0, assignments.length === before ? result.filter((r) => !assignments.some((a) => a.id === r.id)).length : 0);
      setPickedGroupIds([]);
      Alert.alert(
        'Assigned',
        added > 0 ? `Assigned to ${added} new group(s).` : 'The selected groups now have this quest.'
      );
    } catch (e: any) {
      Alert.alert('Error', extractErrorMessage(e, 'Could not assign. Make sure the groups have members.'));
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleDeleteQuest() {
    if (!quest) return;
    Alert.alert(
      'Delete Quest',
      `Delete "${quest.title}"? This permanently removes the quest, all its steps, and checklist items.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteQuest(quest.id);
              router.back();
            } catch (e: any) {
              Alert.alert('Error', extractErrorMessage(e, 'Could not delete this quest.'));
            }
          },
        },
      ]
    );
  }

  function openAddStep() {
    setEditingStep(null);
    setModalTitle('');
    setModalInstruction('');
    setModalChecklist([]);
    setModalChecklistInput('');
    setStepModalVisible(true);
  }

  function openEditStep(step: QuestStep) {
    setEditingStep(step);
    setModalTitle(step.title);
    setModalInstruction(step.instruction);
    setModalChecklist(step.checklist_items.map((c) => ({ id: c.id, text: c.checklist_text })));
    setModalChecklistInput('');
    setStepModalVisible(true);
  }

  function addModalChecklistItem() {
    if (!modalChecklistInput.trim()) return;
    setModalChecklist((prev) => [...prev, { text: modalChecklistInput.trim() }]);
    setModalChecklistInput('');
  }

  function removeModalChecklistItem(index: number) {
    setModalChecklist((prev) => prev.filter((_, i) => i !== index));
  }

  async function confirmStepModal() {
    if (!modalTitle.trim() || !modalInstruction.trim()) {
      Alert.alert('Missing info', 'Please enter a step title and description.');
      return;
    }
    if (modalChecklist.length === 0) {
      Alert.alert('Missing checklist', 'Add at least one checklist item.');
      return;
    }
    if (!quest) return;

    setIsSavingStep(true);
    try {
      if (editingStep) {
        await updateQuestStep(editingStep.id, {
          title: modalTitle.trim(),
          instruction: modalInstruction.trim(),
        });
        for (let i = 0; i < modalChecklist.length; i++) {
          const item = modalChecklist[i];
          if (item.id) {
            await updateChecklistItem(item.id, { checklist_text: item.text, order_index: i + 1 });
          } else {
            await createChecklistItem(editingStep.id, { checklist_text: item.text, order_index: i + 1 });
          }
        }
        const keptIds = new Set(modalChecklist.filter((c) => c.id).map((c) => c.id));
        for (const original of editingStep.checklist_items) {
          if (!keptIds.has(original.id)) {
            await deleteChecklistItem(original.id);
          }
        }
      } else {
        const nextOrder = (quest.steps?.length || 0) + 1;
        const createdStep = await createQuestStep(quest.id, {
          step_order: nextOrder,
          title: modalTitle.trim(),
          instruction: modalInstruction.trim(),
          is_final_step: false,
          is_required: true,
        });
        for (let i = 0; i < modalChecklist.length; i++) {
          await createChecklistItem(createdStep.id, {
            checklist_text: modalChecklist[i].text,
            order_index: i + 1,
          });
        }
      }

      setStepModalVisible(false);
      await loadQuest();
    } catch (e: any) {
      Alert.alert('Error', extractErrorMessage(e, 'Could not save this step.'));
    } finally {
      setIsSavingStep(false);
    }
  }

  function handleDeleteStep(step: QuestStep) {
    Alert.alert('Delete Step', `Delete "${step.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteQuestStep(step.id);
            await loadQuest();
          } catch (e: any) {
            Alert.alert('Error', extractErrorMessage(e, 'Could not delete this step.'));
          }
        },
      },
    ]);
  }

  if (isLoading || !quest) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  const pickedNames = groupOptions.filter((g) => pickedGroupIds.includes(g.id)).map((g) => g.name).join(', ');

  return (
    <View style={{ flex: 1, backgroundColor: CREAM }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={20} color={BROWN} />
          <Text style={styles.headerTitle}>Edit Quest</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.detailsCard}>
          <View style={styles.publishRow}>
            <Text style={[styles.statusBadge, quest.is_published ? styles.statusPublished : styles.statusDraft]}>
              {quest.is_published ? 'Published' : 'Draft'}
            </Text>
            <Switch value={quest.is_published} onValueChange={handleTogglePublish} trackColor={{ false: '#EADEC9', true: GREEN }} />
          </View>

          <Text style={styles.label}>Assigned Classes:</Text>
          <TouchableOpacity
            style={styles.classSummaryBox}
            onPress={() => { setSelectedClassIds(quest.classes); setClassPickerVisible(true); }}
          >
            <Text style={styles.classSummaryText} numberOfLines={2}>
              {myClasses.length > 0
                ? quest.classes.map((cid) => myClasses.find((c) => c.id === cid)?.class_name || `#${cid}`).join(', ') || 'No classes assigned'
                : 'Loading...'}
            </Text>
            <Ionicons name="create-outline" size={16} color="#8A6A2A" />
          </TouchableOpacity>

          {/* ---- Due dates, one per group assignment ---- */}
          <Text style={styles.label}>Due Dates:</Text>
          {assignments.length === 0 ? (
            <Text style={styles.emptyText}>Not yet assigned to any group.</Text>
          ) : (
            assignments.map((a) => (
              <View key={a.id} style={styles.dueDateCard}>
                <View style={styles.dueDateHeaderRow}>
                  <Text style={styles.dueDateGroupName}>{a.group_name || `Group #${a.group}`}</Text>
                  {savedAssignmentId === a.id && <Text style={styles.savedText}>Saved ✓</Text>}
                </View>
                <View style={styles.dueDateInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={editingDueDates[a.id] || ''}
                    onChangeText={(text) => setEditingDueDates((prev) => ({ ...prev, [a.id]: text }))}
                    placeholder="YYYY-MM-DD"
                  />
                  <TouchableOpacity
                    style={styles.dueDateSaveButton}
                    onPress={() => handleSaveDueDate(a.id)}
                    disabled={savingAssignmentId === a.id}
                  >
                    {savingAssignmentId === a.id
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Ionicons name="checkmark" size={18} color="#fff" />}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* ---- Assign to chosen groups ---- */}
          <Text style={styles.label}>Assign to groups:</Text>
          <TouchableOpacity style={styles.classSummaryBox} onPress={() => setGroupPickerVisible(true)}>
            <Text style={styles.classSummaryText} numberOfLines={2}>
              {pickedGroupIds.length === 0 ? 'Choose groups...' : pickedNames}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#8A6A2A" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.assignButton, pickedGroupIds.length === 0 && { opacity: 0.5 }]}
            onPress={handleAssignToGroups}
            disabled={isAssigning || pickedGroupIds.length === 0}
          >
            {isAssigning
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.assignButtonText}>Assign to selected groups</Text>}
          </TouchableOpacity>

          <Text style={styles.label}>Quest Title:</Text>
          <TextInput style={styles.input} value={titleDraft} onChangeText={setTitleDraft} />

          <Text style={styles.label}>Quest Description:</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={descriptionDraft}
            onChangeText={setDescriptionDraft}
            multiline
          />

          <TouchableOpacity style={styles.saveHeaderButton} onPress={handleSaveHeader} disabled={isSavingHeader}>
            {isSavingHeader ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveHeaderButtonText}>Save Changes</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteQuestButton} onPress={handleDeleteQuest}>
            <Ionicons name="trash-outline" size={16} color="#B3261E" />
            <Text style={styles.deleteQuestButtonText}>Delete Quest</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Steps ({quest.steps?.length || 0})</Text>
        {(quest.steps || []).map((step, i) => (
          <View key={step.id} style={styles.stepCard}>
            <View style={styles.stepNumberCircle}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepCardTitle}>{step.title}</Text>
              <Text style={styles.stepCardMeta}>{step.checklist_items.length} checklist items</Text>
            </View>
            <TouchableOpacity onPress={() => openEditStep(step)} style={{ padding: 4 }}>
              <Ionicons name="create-outline" size={20} color={BROWN} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteStep(step)} style={{ padding: 4 }}>
              <Ionicons name="trash-outline" size={18} color="#B3261E" />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addStepButton} onPress={openAddStep}>
          <Text style={styles.addStepButtonText}>+ Add another step</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ---- Group picker modal ---- */}
      <Modal visible={groupPickerVisible} transparent animationType="slide" onRequestClose={() => setGroupPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Groups</Text>
              <TouchableOpacity onPress={() => setGroupPickerVisible(false)}>
                <Ionicons name="checkmark" size={26} color={ORANGE} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Groups that already have this quest are skipped.</Text>
            <ScrollView>
              {groupOptions.length === 0 ? (
                <Text style={styles.emptyText}>No groups in this quest's classes yet.</Text>
              ) : (
                groupOptions.map((g) => {
                  const picked = pickedGroupIds.includes(g.id);
                  const already = assignments.some((a) => a.group === g.id);
                  return (
                    <TouchableOpacity key={g.id} style={styles.classRow} onPress={() => toggleGroupPick(g.id)}>
                      <Ionicons
                        name={picked ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={picked ? GREEN : '#B8A671'}
                      />
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.classRowName}>{g.name}</Text>
                        <Text style={styles.classRowMeta}>
                          {g.className}{already ? ' • already assigned' : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ---- Classes picker modal ---- */}
      <Modal visible={classPickerVisible} transparent animationType="slide" onRequestClose={() => setClassPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Assigned Classes</Text>
              <TouchableOpacity onPress={handleSaveClasses} disabled={isSavingClasses}>
                {isSavingClasses ? <ActivityIndicator color={ORANGE} /> : <Ionicons name="checkmark" size={26} color={ORANGE} />}
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Tap to select one or more classes.</Text>
            <ScrollView>
              {myClasses.map((c) => {
                const isSelected = selectedClassIds.includes(c.id);
                return (
                  <TouchableOpacity key={c.id} style={styles.classRow} onPress={() => toggleClassSelection(c.id)}>
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isSelected ? GREEN : '#B8A671'}
                    />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.classRowName}>{c.class_name}</Text>
                      <Text style={styles.classRowMeta}>{c.student_count} students</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ---- Step edit/add modal ---- */}
      <Modal visible={stepModalVisible} transparent animationType="slide" onRequestClose={() => setStepModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{editingStep ? 'Edit Step' : 'New Step'}</Text>
              <TouchableOpacity onPress={confirmStepModal} disabled={isSavingStep}>
                {isSavingStep ? <ActivityIndicator color={ORANGE} /> : <Ionicons name="checkmark" size={26} color={ORANGE} />}
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Step Title:</Text>
              <TextInput style={styles.input} value={modalTitle} onChangeText={setModalTitle} />

              <Text style={styles.label}>Step Description:</Text>
              <TextInput style={[styles.input, styles.multiline]} value={modalInstruction} onChangeText={setModalInstruction} multiline />

              <Text style={styles.label}>Step Checklist:</Text>
              {modalChecklist.map((item, i) => (
                <View key={i} style={styles.checklistRow}>
                  <Ionicons name="checkbox" size={18} color={GREEN} />
                  <Text style={styles.checklistText}>{item.text}</Text>
                  <TouchableOpacity onPress={() => removeModalChecklistItem(i)}>
                    <Ionicons name="close-circle-outline" size={18} color="#B8A671" />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.checklistInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={modalChecklistInput}
                  onChangeText={setModalChecklistInput}
                  placeholder="Add a checklist item"
                  onSubmitEditing={addModalChecklistItem}
                />
                <TouchableOpacity style={styles.addChecklistButton} onPress={addModalChecklistItem}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM },
  header: { backgroundColor: GOLD, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: BROWN },

  content: { padding: 20, paddingBottom: 60 },
  error: { color: '#B3261E', marginBottom: 12 },
  emptyText: { fontSize: 12, color: '#8A6A2A', fontStyle: 'italic', marginBottom: 4 },

  detailsCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: ORANGE, padding: 16, marginBottom: 20 },
  publishRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  statusPublished: { backgroundColor: '#DCFCE7', color: '#166534' },
  statusDraft: { backgroundColor: '#F3F4F6', color: BROWN },

  label: { fontSize: 11, fontWeight: '700', color: '#8A6A2A', letterSpacing: 0.3, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#EADEC9', borderRadius: 10, padding: 10, fontSize: 14, color: BROWN },
  multiline: { minHeight: 70, textAlignVertical: 'top' },

  classSummaryBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#EADEC9', borderRadius: 10, padding: 12,
  },
  classSummaryText: { flex: 1, fontSize: 13, color: BROWN, fontWeight: '600' },

  dueDateCard: { backgroundColor: '#FBF6EA', borderWidth: 1, borderColor: '#EADEC9', borderRadius: 10, padding: 10, marginBottom: 6 },
  dueDateHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dueDateGroupName: { fontSize: 12, fontWeight: '700', color: BROWN },
  savedText: { fontSize: 11, fontWeight: '700', color: GREEN },
  dueDateInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dueDateSaveButton: { backgroundColor: GREEN, borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  assignButton: { backgroundColor: GREEN, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 8, marginBottom: 4 },
  assignButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  saveHeaderButton: { backgroundColor: '#5C3A2E', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  saveHeaderButtonText: { color: '#fff', fontWeight: '700' },

  deleteQuestButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#B3261E', borderRadius: 12, paddingVertical: 12, marginTop: 10,
  },
  deleteQuestButtonText: { color: '#B3261E', fontWeight: '700' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: BROWN, marginBottom: 10 },
  stepCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  stepNumberCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#fff', fontWeight: '800' },
  stepCardTitle: { fontSize: 13, fontWeight: '700', color: ORANGE },
  stepCardMeta: { fontSize: 11, color: '#8A6A2A', marginTop: 2 },

  addStepButton: { borderWidth: 1.5, borderColor: '#B8A671', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addStepButtonText: { color: '#8A6A2A', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: CREAM, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: BROWN },
  modalSubtitle: { fontSize: 12, color: '#8A6A2A', marginBottom: 10 },

  classRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.08)' },
  classRowName: { fontSize: 14, fontWeight: '700', color: BROWN },
  classRowMeta: { fontSize: 11, color: '#8A6A2A' },

  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  checklistText: { flex: 1, fontSize: 13, color: BROWN },
  checklistInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6 },
  addChecklistButton: { backgroundColor: ORANGE, borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});