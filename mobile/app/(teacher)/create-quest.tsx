// mobile/app/(teacher)/create-quest.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createQuest, createQuestStep, createChecklistItem, updateQuest,
} from '../../src/api/quests';
import { assignQuest } from '../../src/api/assignments';
import { getMyClasses } from '../../src/api/classrooms';
import { createReward, attachRewardToStep } from '../../src/api/rewards';
import { TableSettingType } from '../../src/types/quests';
import { ClassSummary } from '../../src/types/classrooms';
import KeyboardSafe from '../../src/components/KeyboardSafe';
import CoverPhotoPicker from '../../src/components/CoverPhotoPicker';
import { useToast } from '../../src/components/Toast';
import DatePickerField from '../../src/components/DatePickerField';
import { startOfDay, startOfDayISO, endOfDayISO } from '../../src/utils/dates';

const CREAM = '#F2E4C4';
const BROWN = '#3A2B1A';
const GREEN = '#2FA85B';
const ORANGE = '#EA580C';
const GOLD = '#F5B921';

interface DraftChecklistItem {
  text: string;
}

interface DraftStep {
  title: string;
  instruction: string;
  is_final_step: boolean;
  is_required: boolean;
  checklist: DraftChecklistItem[];
  points: number;     // 0 = no points reward
  badgeName: string;  // '' = no badge
}

function extractErrorMessage(e: any, fallback: string): string {
  const data = e?.response?.data;
  if (!data) return fallback;
  if (data.detail) return data.detail;
  const firstKey = Object.keys(data)[0];
  if (firstKey && Array.isArray(data[firstKey])) return data[firstKey][0];
  if (typeof data === 'string') return data;
  return fallback;
}

// Raw server response, so a failed reward tells us exactly which field complained
function describeError(e: any): string {
  const data = e?.response?.data;
  if (data) {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    return text.length > 160 ? `${text.slice(0, 160)}...` : text;
  }
  return e?.message || 'network error';
}

function stepMeta(s: DraftStep): string {
  const parts = [`${s.checklist.length} checklist items`];
  if (s.points > 0) parts.push(`+${s.points} pts`);
  if (s.badgeName) parts.push(`Badge: ${s.badgeName}`);
  return parts.join(' • ');
}

// Creates the Reward rows and links them to the step. A failure here is
// reported at the end instead of aborting, because the quest itself is already saved.
async function createStepRewards(stepId: number, step: DraftStep): Promise<string[]> {
  const warnings: string[] = [];

  if (step.points > 0) {
    try {
      const reward = await createReward({
        reward_name: `${step.title} points`.slice(0, 80),
        reward_type: 'points',
        points_value: step.points,
        description: `Points for completing "${step.title}"`,
      });
      await attachRewardToStep(stepId, {
        reward: reward.id,
        reward_condition: 'Complete all checklist items',
      });
    } catch (e: any) {
      warnings.push(`points for "${step.title}" (${describeError(e)})`);
    }
  }

  if (step.badgeName) {
    try {
      const reward = await createReward({
        reward_name: step.badgeName.slice(0, 80),
        reward_type: 'badge',
        points_value: 0,
        description: `Badge for completing "${step.title}"`,
      });
      await attachRewardToStep(stepId, {
        reward: reward.id,
        reward_condition: 'Complete all checklist items',
      });
    } catch (e: any) {
      warnings.push(`badge for "${step.title}" (${describeError(e)})`);
    }
  }

  return warnings;
}

export default function CreateQuestScreen() {
  const router = useRouter();
  const toast = useToast();
  const { classId: classIdParam } = useLocalSearchParams<{ classId?: string }>();

  const [myClasses, setMyClasses] = useState<ClassSummary[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  // ---- Multi-select class assignment ----
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>(
    classIdParam ? [Number(classIdParam)] : []
  );
  const [classPickerVisible, setClassPickerVisible] = useState(false);

  useEffect(() => {
    getMyClasses()
      .then(setMyClasses)
      .finally(() => setIsLoadingClasses(false));
  }, []);

  function toggleClassSelection(id: number) {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  }

  function selectedClassNames(): string {
    if (selectedClassIds.length === 0) return 'No classes selected';
    return myClasses
      .filter((c) => selectedClassIds.includes(c.id))
      .map((c) => c.class_name)
      .join(', ');
  }

  // ---- Quest basics ----
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [tableSettingType, setTableSettingType] = useState<TableSettingType>('table_setting');
  // Start = students can see the quest from this day (empty = right away). Due = last day to finish it.
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [questMode, setQuestMode] = useState<'individual' | 'group'>('group');

  const [steps, setSteps] = useState<DraftStep[]>([]);

  // ---- Step modal ----
  const [stepModalVisible, setStepModalVisible] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [modalStepTitle, setModalStepTitle] = useState('');
  const [modalStepInstruction, setModalStepInstruction] = useState('');
  const [modalChecklist, setModalChecklist] = useState<DraftChecklistItem[]>([]);
  const [modalChecklistInput, setModalChecklistInput] = useState('');
  const [modalPoints, setModalPoints] = useState('');
  const [modalBadgeOn, setModalBadgeOn] = useState(false);
  const [modalBadgeName, setModalBadgeName] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  function openAddStepModal() {
    setEditingStepIndex(null);
    setModalStepTitle('');
    setModalStepInstruction('');
    setModalChecklist([]);
    setModalChecklistInput('');
    setModalPoints('');
    setModalBadgeOn(false);
    setModalBadgeName('');
    setStepModalVisible(true);
  }

  function openEditStepModal(index: number) {
    const s = steps[index];
    setEditingStepIndex(index);
    setModalStepTitle(s.title);
    setModalStepInstruction(s.instruction);
    setModalChecklist(s.checklist);
    setModalChecklistInput('');
    setModalPoints(s.points > 0 ? String(s.points) : '');
    setModalBadgeOn(!!s.badgeName);
    setModalBadgeName(s.badgeName);
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

  function confirmStepModal() {
    if (!modalStepTitle.trim() || !modalStepInstruction.trim()) {
      Alert.alert('Missing info', 'Please enter a step title and description.');
      return;
    }
    if (modalChecklist.length === 0) {
      Alert.alert('Missing checklist', 'Add at least one checklist item for this step.');
      return;
    }

    const pointsNumber = modalPoints.trim() === '' ? 0 : Number(modalPoints);
    if (!Number.isInteger(pointsNumber) || pointsNumber < 0 || pointsNumber > 1000) {
      Alert.alert('Invalid points', 'Points must be a whole number from 0 to 1000.');
      return;
    }
    if (modalBadgeOn && !modalBadgeName.trim()) {
      Alert.alert('Badge name needed', 'Enter a name for the badge, or turn the badge off.');
      return;
    }

    const newStep: DraftStep = {
      title: modalStepTitle.trim(),
      instruction: modalStepInstruction.trim(),
      is_final_step: false,
      is_required: true,
      checklist: modalChecklist,
      points: pointsNumber,
      badgeName: modalBadgeOn ? modalBadgeName.trim() : '',
    };

    setSteps((prev) => {
      const updated = editingStepIndex !== null
        ? prev.map((s, i) => (i === editingStepIndex ? newStep : s))
        : [...prev, newStep];
      return updated.map((s, i) => ({ ...s, is_final_step: i === updated.length - 1 }));
    });

    setStepModalVisible(false);
  }

  function removeStep(index: number) {
    setSteps((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((s, i) => ({ ...s, is_final_step: i === updated.length - 1 }));
    });
  }

  // Assigns the quest to the groups of the selected classes. On failure the teacher can try
  // again right away; resolves to true when the quest is assigned, false if they chose "Later".
  async function assignWithRetry(questId: number): Promise<boolean> {
    while (true) {
      try {
        await assignQuest({
          quest: questId,
          quest_mode: questMode,
          start_date: startOfDayISO(startDate),
          due_date: endOfDayISO(dueDate),
        });
        return true;
      } catch (assignError: any) {
        const reason = extractErrorMessage(
          assignError,
          'Could not assign it to the groups. Make sure the class has groups with members.'
        );
        const retry = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Quest saved, but students cannot see it yet',
            `${reason}\n\nStudents only see a quest once it is assigned to their group.`,
            [
              { text: 'Later', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Try again', onPress: () => resolve(true) },
            ],
            { cancelable: false }
          );
        });
        if (!retry) return false;
      }
    }
  }

  async function handlePublishQuest() {
    if (selectedClassIds.length === 0) {
      Alert.alert('No classes selected', 'Please select at least one class for this quest.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing info', 'Please enter a quest title.');
      return;
    }
    if (steps.length === 0) {
      Alert.alert('No steps yet', 'Add at least one step before publishing.');
      return;
    }
    if (startDate && dueDate && startOfDay(dueDate) < startOfDay(startDate)) {
      Alert.alert('Check the dates', 'The due date cannot be before the start date.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const quest = await createQuest({
        classes: selectedClassIds,
        title: title.trim(),
        description: description.trim(),
        table_setting_type: tableSettingType,
        order_index: 0,
        is_published: false,
        cover_image_url: coverUrl,
      });

      const rewardWarnings: string[] = [];

      for (let i = 0; i < steps.length; i++) {
        const draftStep = steps[i];
        const createdStep = await createQuestStep(quest.id, {
          step_order: i + 1,
          title: draftStep.title,
          instruction: draftStep.instruction,
          is_final_step: draftStep.is_final_step,
          is_required: draftStep.is_required,
        });

        for (let j = 0; j < draftStep.checklist.length; j++) {
          await createChecklistItem(createdStep.id, {
            checklist_text: draftStep.checklist[j].text,
            order_index: j + 1,
          });
        }

        rewardWarnings.push(...(await createStepRewards(createdStep.id, draftStep)));
      }

      await updateQuest(quest.id, { is_published: true });

      // assignQuest loops over ALL of this quest's classes on the backend,
      // so one call covers every selected class. This is the step that makes the quest
      // appear on the students' side, so if it fails the teacher must be told clearly.
      const assignedOk = await assignWithRetry(quest.id);

      const notes: string[] = [];
      if (rewardWarnings.length > 0) {
        notes.push(`Some rewards could not be saved: ${rewardWarnings.join('; ')}.`);
      }

      if (!assignedOk) {
        // Already handled in assignWithRetry (the teacher chose "Later"); leave the screen.
        if (notes.length > 0) Alert.alert('Note', notes.join(' '));
        router.back();
      } else if (notes.length > 0) {
        // Partial problems need to be read, so keep a blocking dialog here
        Alert.alert(
          'Quest Published',
          `The quest was created successfully. However: ${notes.join(' ')}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        toast.success(startDate && startDate > new Date()
          ? 'Quest published. Students will see it on the start date.'
          : 'Quest published and visible to your students');
        router.back();
      }
    } catch (e: any) {
      setError(extractErrorMessage(e, 'Could not save the quest. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoadingClasses) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: CREAM }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={20} color={BROWN} />
          <Text style={styles.headerTitle}>Quest Builder</Text>
        </TouchableOpacity>
      </View>

      <KeyboardSafe>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Quest Details</Text>

          <Text style={styles.label}>Assign to Class(es):</Text>
          <TouchableOpacity style={styles.classSummaryBox} onPress={() => setClassPickerVisible(true)}>
            <Text style={styles.classSummaryText} numberOfLines={2}>{selectedClassNames()}</Text>
            <Ionicons name="chevron-forward" size={16} color="#8A6A2A" />
          </TouchableOpacity>

          <Text style={styles.label}>Cover Photo (optional):</Text>
          <CoverPhotoPicker value={coverUrl} onChange={setCoverUrl} />

          <Text style={styles.label}>Quest Title:</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. One Course Meal Prep" />

          <Text style={styles.label}>Start Date:</Text>
          <DatePickerField
            value={startDate}
            onChange={(d) => {
              setStartDate(d);
              // keep the due date from ending up before the start date
              if (d && dueDate && startOfDay(dueDate) < startOfDay(d)) setDueDate(null);
            }}
            placeholder="Right away"
          />
          <Text style={styles.helpText}>Students see the quest from this day. Leave empty to open it right away.</Text>

          <Text style={[styles.label, { marginTop: 12 }]}>Due Date:</Text>
          <DatePickerField value={dueDate} onChange={setDueDate} minDate={startDate} placeholder="No due date" />

          <Text style={styles.label}>Quest Mode:</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pill, questMode === 'individual' && styles.pillActive]}
              onPress={() => setQuestMode('individual')}
            >
              <Text style={[styles.pillText, questMode === 'individual' && styles.pillTextActive]}>Individual</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, questMode === 'group' && styles.pillActive]}
              onPress={() => setQuestMode('group')}
            >
              <Text style={[styles.pillText, questMode === 'group' && styles.pillTextActive]}>Group</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Type:</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pill, tableSettingType === 'table_setting' && styles.pillActive]}
              onPress={() => setTableSettingType('table_setting')}
            >
              <Text style={[styles.pillText, tableSettingType === 'table_setting' && styles.pillTextActive]}>Table Setting</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, tableSettingType === 'napkin_folding' && styles.pillActive]}
              onPress={() => setTableSettingType('napkin_folding')}
            >
              <Text style={[styles.pillText, tableSettingType === 'napkin_folding' && styles.pillTextActive]}>Napkin Folding</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Quest Description:</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this quest about?"
            multiline
          />
        </View>

        <Text style={styles.sectionTitle}>Steps ({steps.length} added)</Text>
        {steps.map((s, i) => (
          <View key={i} style={styles.stepCard}>
            <View style={styles.stepNumberCircle}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepCardTitle}>{s.title}</Text>
              <Text style={styles.stepCardMeta}>{stepMeta(s)}</Text>
            </View>
            <TouchableOpacity onPress={() => openEditStepModal(i)} style={{ padding: 4 }}>
              <Ionicons name="create-outline" size={20} color={BROWN} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeStep(i)} style={{ padding: 4 }}>
              <Ionicons name="trash-outline" size={18} color="#B3261E" />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addStepButton} onPress={openAddStepModal}>
          <Text style={styles.addStepButtonText}>Add another step</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.publishButton} onPress={handlePublishQuest} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishButtonText}>Publish Quest</Text>}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardSafe>

      {/* ---- Multi-select class picker modal ---- */}
      <Modal visible={classPickerVisible} transparent animationType="slide" onRequestClose={() => setClassPickerVisible(false)}>
        <KeyboardSafe style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Class(es)</Text>
              <TouchableOpacity onPress={() => setClassPickerVisible(false)}>
                <Ionicons name="checkmark" size={26} color={ORANGE} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Tap to select one or more classes.</Text>
            <ScrollView>
              {myClasses.length === 0 ? (
                <Text style={styles.emptyText}>You don't have any classes yet.</Text>
              ) : (
                myClasses.map((c) => {
                  const isSelected = selectedClassIds.includes(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.classRow}
                      onPress={() => toggleClassSelection(c.id)}
                    >
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
                })
              )}
            </ScrollView>
          </View>
        </KeyboardSafe>
      </Modal>

      {/* ---- Step edit/add modal ---- */}
      <Modal visible={stepModalVisible} transparent animationType="slide" onRequestClose={() => setStepModalVisible(false)}>
        <KeyboardSafe style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Step Details</Text>
              <TouchableOpacity onPress={confirmStepModal}>
                <Ionicons name="checkmark" size={26} color={ORANGE} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Step Title:</Text>
              <TextInput style={styles.input} value={modalStepTitle} onChangeText={setModalStepTitle} placeholder="e.g. Position the Dinner Plate" />

              <Text style={styles.label}>Step Description:</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={modalStepInstruction}
                onChangeText={setModalStepInstruction}
                placeholder="Detailed instructions for this step"
                multiline
              />

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

              <Text style={styles.label}>Rewards (optional):</Text>
              <Text style={styles.rewardHint}>
                Step points are given when the checklist is complete. The last step's points and any badge are given to every group member after you send feedback on the final submission.
              </Text>
              <View style={styles.rewardsBox}>
                <Text style={styles.rewardLabel}>Points for completing this step</Text>
                <TextInput
                  style={styles.input}
                  value={modalPoints}
                  onChangeText={setModalPoints}
                  placeholder="0"
                  keyboardType="number-pad"
                />

                <View style={styles.badgeToggleRow}>
                  <Text style={styles.rewardLabel}>Award a badge</Text>
                  <Switch
                    value={modalBadgeOn}
                    onValueChange={setModalBadgeOn}
                    trackColor={{ false: '#EADEC9', true: GREEN }}
                  />
                </View>
                {modalBadgeOn && (
                  <TextInput
                    style={styles.input}
                    value={modalBadgeName}
                    onChangeText={setModalBadgeName}
                    placeholder="Badge name, e.g. Table Setting Pro"
                  />
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardSafe>
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

  detailsCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: ORANGE, padding: 16, marginBottom: 20 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: BROWN, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '700', color: '#8A6A2A', letterSpacing: 0.3, marginBottom: 6, marginTop: 10 },
  helpText: { fontSize: 11, color: '#8A6A2A', marginTop: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#EADEC9', borderRadius: 10, padding: 10, fontSize: 14, color: BROWN },
  multiline: { minHeight: 70, textAlignVertical: 'top' },

  classSummaryBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#EADEC9', borderRadius: 10, padding: 12,
  },
  classSummaryText: { flex: 1, fontSize: 13, color: BROWN, fontWeight: '600' },

  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#EADEC9' },
  pillActive: { backgroundColor: BROWN, borderColor: BROWN },
  pillText: { fontSize: 12, fontWeight: '700', color: BROWN },
  pillTextActive: { color: '#fff' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: BROWN, marginBottom: 10 },
  stepCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  stepNumberCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#fff', fontWeight: '800' },
  stepCardTitle: { fontSize: 13, fontWeight: '700', color: ORANGE },
  stepCardMeta: { fontSize: 11, color: '#8A6A2A', marginTop: 2 },

  addStepButton: { borderWidth: 1.5, borderColor: '#B8A671', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 20 },
  addStepButtonText: { color: '#8A6A2A', fontWeight: '700' },

  publishButton: { backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  publishButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: CREAM, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: BROWN },
  modalSubtitle: { fontSize: 12, color: '#8A6A2A', marginBottom: 10 },

  classRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.08)' },
  classRowName: { fontSize: 14, fontWeight: '700', color: BROWN },
  classRowMeta: { fontSize: 11, color: '#8A6A2A' },
  emptyText: { color: '#8A6A2A', fontStyle: 'italic', marginTop: 20, textAlign: 'center' },

  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  checklistText: { flex: 1, fontSize: 13, color: BROWN },
  checklistInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6 },
  addChecklistButton: { backgroundColor: ORANGE, borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  rewardsBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#EADEC9', padding: 12, gap: 8, marginBottom: 20 },
  rewardLabel: { fontSize: 12, fontWeight: '700', color: BROWN },
  rewardHint: { fontSize: 11, color: '#8A6A2A', lineHeight: 16, marginBottom: 8 },
  badgeToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
});