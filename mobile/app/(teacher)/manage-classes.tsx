// mobile/app/(teacher)/manage-classes.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getMediaUrl } from '../../src/utils/media';

import { getMyClasses, createClass, updateClass, getClassEnrollments } from '../../src/api/classrooms';
import { ClassSummary, ClassEnrollment, ClassCreatePayload, ClassUpdatePayload } from '../../src/types/classrooms';

const CREAM = '#F2E4C4';
const CARD_BG = '#F9C544';
const BROWN = '#3A2B1A';
const GREEN = '#2FA85B';

export default function ManageClasses() {
  const router = useRouter();

  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // ---- Create/Edit modal — shared form, different mode ----
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSummary | null>(null); // null = create mode
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formClassName, setFormClassName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formSchoolYear, setFormSchoolYear] = useState('');

  // ---- Selected class's roster ----
  const [selectedClass, setSelectedClass] = useState<ClassSummary | null>(null);
  const [roster, setRoster] = useState<ClassEnrollment[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  // ---- Copy feedback ----
  const [copiedClassId, setCopiedClassId] = useState<number | null>(null);

  async function loadClasses() {
    setError('');
    try {
      const data = await getMyClasses();
      setClasses(data);
    } catch (e) {
      setError('Could not load your classes. Pull down to try again.');
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadClasses().finally(() => setIsLoading(false));
    }, [])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadClasses();
    setIsRefreshing(false);
  }

  function resetForm() {
    setFormClassName('');
    setFormSubject('');
    setFormSection('');
    setFormSchoolYear('');
  }

  function openCreateModal() {
    setEditingClass(null);
    resetForm();
    setShowFormModal(true);
  }

  function openEditModal(classItem: ClassSummary) {
    setEditingClass(classItem);
    setFormClassName(classItem.class_name);
    setFormSubject(classItem.subject);
    setFormSection(classItem.section);
    setFormSchoolYear(classItem.school_year);
    setShowFormModal(true);
  }

  async function handleSubmitForm() {
    if (!formClassName.trim() || !formSubject.trim() || !formSection.trim() || !formSchoolYear.trim()) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }

    setIsSubmittingForm(true);
    try {
      if (editingClass) {
        // ---- Edit mode ----
        const payload: ClassUpdatePayload = {
          class_name: formClassName.trim(),
          subject: formSubject.trim(),
          section: formSection.trim(),
          school_year: formSchoolYear.trim(),
        };
        const updated = await updateClass(editingClass.id, payload);
        setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        // Keep the roster panel's header in sync if the edited class is currently selected
        if (selectedClass?.id === updated.id) {
          setSelectedClass(updated);
        }
      } else {
        // ---- Create mode ----
        const payload: ClassCreatePayload = {
          class_name: formClassName.trim(),
          subject: formSubject.trim(),
          section: formSection.trim(),
          school_year: formSchoolYear.trim(),
        };
        const created = await createClass(payload);
        setClasses((prev) => [created, ...prev]);
      }
      resetForm();
      setShowFormModal(false);
      setEditingClass(null);
    } catch (e: any) {
      const message =
        e?.response?.data?.class_name?.[0] ||
        e?.response?.data?.detail ||
        `Could not ${editingClass ? 'update' : 'create'} class. Please try again.`;
      Alert.alert(editingClass ? 'Update failed' : 'Create failed', message);
    } finally {
      setIsSubmittingForm(false);
    }
  }

  async function handleSelectClass(classItem: ClassSummary) {
    setSelectedClass(classItem);
    setIsLoadingRoster(true);
    setRoster([]);
    try {
      const data = await getClassEnrollments(classItem.id);
      setRoster(data);
    } catch (e) {
      Alert.alert('Error', 'Could not load the class roster.');
    } finally {
      setIsLoadingRoster(false);
    }
  }

  async function handleCopyCode(classItem: ClassSummary) {
    await Clipboard.setStringAsync(classItem.invite_code);
    setCopiedClassId(classItem.id);
    setTimeout(() => setCopiedClassId((prev) => (prev === classItem.id ? null : prev)), 1500);
  }

  function studentDisplayName(e: ClassEnrollment): string {
    const full = [e.student.first_name, e.student.last_name].filter(Boolean).join(' ');
    return full || e.student.username;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
      >
        {/* ---------------- Header ---------------- */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={BROWN} />
          </TouchableOpacity>
          <Text style={styles.title}>Class Management</Text>
        </View>

        {/* ---------------- Create button ---------------- */}
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.createButtonText}>Create A New Class</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* ---------------- My Classes ---------------- */}
        <Text style={styles.sectionLabel}>MY CLASSES</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={BROWN} style={{ marginTop: 20 }} />
        ) : classes.length === 0 ? (
          <Text style={styles.emptyText}>No classes yet — create one above to get started.</Text>
        ) : (
          classes.map((c) => {
            const isSelected = selectedClass?.id === c.id;
            const justCopied = copiedClassId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.classCard, isSelected && styles.classCardSelected]}
                onPress={() => handleSelectClass(c)}
                activeOpacity={0.8}
              >
                <View style={styles.classCardTopRow}>
                  <Text style={styles.className}>{c.class_name}</Text>
                  <TouchableOpacity
                    onPress={() => openEditModal(c)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color="#8A6A2A" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.codeRow}
                  onPress={() => handleCopyCode(c)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text style={styles.classCode}>{c.invite_code}</Text>
                  <Ionicons
                    name={justCopied ? 'checkmark' : 'copy-outline'}
                    size={14}
                    color={justCopied ? GREEN : '#8A6A2A'}
                  />
                  {justCopied && <Text style={styles.copiedText}>Copied!</Text>}
                </TouchableOpacity>

                <View style={styles.classStatsRow}>
                  <View style={styles.classStatPill}>
                    <Text style={styles.classStatText}>{c.student_count} Students</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* ---------------- Roster for selected class ---------------- */}
        {selectedClass && (
          <>
            <Text style={styles.sectionLabel}>
              STUDENTS — {selectedClass.class_name.toUpperCase()}
            </Text>

            {isLoadingRoster ? (
              <ActivityIndicator size="small" color={BROWN} style={{ marginTop: 12 }} />
            ) : roster.length === 0 ? (
              <Text style={styles.emptyText}>
                No students enrolled yet. Share the invite code above.
              </Text>
            ) : (
              <View style={styles.rosterCard}>
                {roster.map((enrollment) => {
                  const name = studentDisplayName(enrollment);
                  const avatarUrl = getMediaUrl(enrollment.student.profile_picture);
                  return (
                    <View key={enrollment.id} style={styles.rosterRow}>
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.rosterAvatarImage} />
                      ) : (
                        <View style={styles.rosterAvatar}>
                          <Text style={styles.rosterAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rosterName}>{name}</Text>
                        <Text style={styles.rosterSub}>
                          {selectedClass!.class_name}
                          {enrollment.student.section ? ` • ${enrollment.student.section}` : ''}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ---------------- Create / Edit class modal ---------------- */}
      <Modal visible={showFormModal} transparent animationType="fade" onRequestClose={() => setShowFormModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingClass ? 'Edit Class Details' : 'Create A New Class'}
            </Text>

            <Text style={styles.modalLabel}>CLASS NAME</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Grade 8 TLE8 - A"
              value={formClassName}
              onChangeText={setFormClassName}
            />

            <Text style={styles.modalLabel}>SUBJECT</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. TLE"
              value={formSubject}
              onChangeText={setFormSubject}
            />

            <Text style={styles.modalLabel}>SECTION</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. A"
              value={formSection}
              onChangeText={setFormSection}
            />

            <Text style={styles.modalLabel}>SCHOOL YEAR</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 2026-2027"
              value={formSchoolYear}
              onChangeText={setFormSchoolYear}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  resetForm();
                  setEditingClass(null);
                  setShowFormModal(false);
                }}
                disabled={isSubmittingForm}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreateButton} onPress={handleSubmitForm} disabled={isSubmittingForm}>
                {isSubmittingForm ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalCreateText}>{editingClass ? 'Save' : 'Create'}</Text>
                )}
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  backButton: { padding: 6, borderRadius: 20, backgroundColor: CARD_BG },
  title: { fontSize: 20, fontWeight: '800', color: BROWN },

  createButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: GREEN, borderRadius: 16, paddingVertical: 14, marginBottom: 24,
  },
  createButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  errorText: { color: '#B3261E', marginBottom: 12, fontSize: 13 },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#8A6A2A',
    letterSpacing: 0.5, marginBottom: 10, marginTop: 4,
  },
  emptyText: { fontSize: 13, color: '#8A6A2A', marginBottom: 20 },

  classCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#EADEC9',
    padding: 16, marginBottom: 12,
  },
  classCardSelected: { borderColor: GREEN },
  classCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  className: { fontSize: 16, fontWeight: '800', color: BROWN, flex: 1 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, marginBottom: 10 },
  classCode: { fontSize: 12, color: '#8A6A2A' },
  copiedText: { fontSize: 11, color: GREEN, fontWeight: '700', marginLeft: 2 },
  classStatsRow: { flexDirection: 'row', gap: 10 },
  classStatPill: { backgroundColor: CREAM, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  classStatText: { fontSize: 12, fontWeight: '700', color: BROWN },

  rosterCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#EADEC9',
    marginBottom: 20, overflow: 'hidden',
  },
  rosterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.08)',
  },
  rosterAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: CARD_BG,
    alignItems: 'center', justifyContent: 'center',
  },
  rosterAvatarImage: { width: 30, height: 30, borderRadius: 15 },
  rosterAvatarText: { fontSize: 12, fontWeight: '800', color: BROWN },
  rosterName: { fontSize: 14, fontWeight: '700', color: '#C2551A' },
  rosterSub: { fontSize: 11, color: '#8A6A2A', marginTop: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: BROWN, marginBottom: 16 },
  modalLabel: { fontSize: 11, fontWeight: '700', color: '#8A6A2A', letterSpacing: 0.5, marginBottom: 6, marginTop: 10 },
  modalInput: {
    borderWidth: 1, borderColor: '#EADEC9', borderRadius: 10,
    padding: 10, fontSize: 14, color: BROWN,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#F5F0E6' },
  modalCancelText: { color: '#8A6A2A', fontWeight: '700' },
  modalCreateButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#5C3A2E' },
  modalCreateText: { color: '#fff', fontWeight: '700' },
});