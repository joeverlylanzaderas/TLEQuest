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
} from 'react-native';
import { T, HEADER_BG, HEADER_TEXT, activeTheme } from '../../src/theme/theme';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { thumbUrl } from '../../src/utils/media';

import { getMyClasses, createClass, updateClass, getClassEnrollments } from '../../src/api/classrooms';
import { ClassSummary, ClassEnrollment, ClassCreatePayload, ClassUpdatePayload } from '../../src/types/classrooms';
import KeyboardSafe from '../../src/components/KeyboardSafe';
import CachedImage from '../../src/components/CachedImage';
import { useToast } from '../../src/components/Toast';
import { FadeIn, PressableScale } from '../../src/components/Motion';
import { TOP_GAP } from '../../src/theme/layout';

const CREAM = T('#F5EDD8');
const CARD_BG = T('#F5B921');
const BROWN = T('#3A2B1A');
const GREEN = '#2FA85B';

// School Blue colors (Default theme keeps the original colors)
const IS_SCHOOL = activeTheme === 'school';
const BLUE = '#1E4D8F';
const LIGHT_BLUE = '#EAF3FE';
const HEADER_AREA_BG = IS_SCHOOL ? HEADER_BG : CREAM;
const TITLE_COLOR = IS_SCHOOL ? '#FFFFFF' : BROWN;
const BACK_BG = IS_SCHOOL ? '#FFFFFF' : CARD_BG;
const BACK_ICON = IS_SCHOOL ? BLUE : BROWN;
const CREATE_BG = IS_SCHOOL ? BLUE : GREEN;

export default function ManageClasses() {
  const router = useRouter();
  const toast = useToast();

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
  const [rosterSort, setRosterSort] = useState<'az' | 'za'>('az');
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
        toast.success('Class updated');
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
        toast.success('Class created');
      }
      resetForm();
      setShowFormModal(false);
      setEditingClass(null);
    } catch (e: any) {
      const message =
        e?.response?.data?.class_name?.[0] ||
        e?.response?.data?.detail ||
        `Could not ${editingClass ? 'update' : 'create'} class. Please try again.`;
      toast.error(message);
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
    <SafeAreaView style={[styles.screen, { backgroundColor: HEADER_AREA_BG }]} edges={['top']}>
      {/* ---------------- Header ---------------- */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={BACK_ICON} />
        </TouchableOpacity>
        <Text style={styles.title}>My classes</Text>
        <PressableScale style={styles.createButton} scaleTo={0.94} onPress={openCreateModal}>
          <Ionicons name="add" size={18} color={IS_SCHOOL ? '#fff' : BROWN} />
          <Text style={styles.createButtonText}>New class</Text>
        </PressableScale>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: CREAM }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
      >

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* ---------------- My Classes ---------------- */}
        <Text style={styles.sectionLabel}>TAP A CLASS TO SEE ITS STUDENTS</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={BROWN} style={{ marginTop: 20 }} />
        ) : classes.length === 0 ? (
          <Text style={styles.emptyText}>No classes yet — create one above to get started.</Text>
        ) : (
          classes.map((c, ci) => {
            const isSelected = selectedClass?.id === c.id;
            const justCopied = copiedClassId === c.id;
            return (
              <FadeIn key={c.id} delay={Math.min(ci, 6) * 70}>
              <TouchableOpacity
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
                    <Ionicons name="ellipsis-vertical" size={18} color={T('#8A6A2A')} />
                  </TouchableOpacity>
                </View>

                <View style={styles.classStatsRow}>
                  <TouchableOpacity
                    style={styles.codeChip}
                    onPress={() => handleCopyCode(c)}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <Ionicons name="key" size={12} color={justCopied ? GREEN : '#6B4A00'} />
                    <Text style={styles.classCode}>{justCopied ? 'Copied!' : c.invite_code}</Text>
                    {!justCopied && <Ionicons name="copy-outline" size={12} color="#6B4A00" />}
                  </TouchableOpacity>
                  <View style={styles.classStatPill}>
                    <Ionicons name="people" size={12} color={IS_SCHOOL ? '#fff' : '#1F4D7A'} />
                    <Text style={styles.classStatText}>{c.student_count} {c.student_count === 1 ? 'student' : 'students'}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() => router.push(`/(teacher)/class/${c.id}` as any)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.openBtnText}>Open</Text>
                    <Ionicons name="chevron-forward" size={14} color={BROWN} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
              </FadeIn>
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
              <>
              <View style={styles.sortRow}>
                <Text style={styles.sortLabel}>Sort</Text>
                {([['az', 'A–Z'], ['za', 'Z–A']] as const).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.sortChip, rosterSort === key && styles.sortChipActive]}
                    onPress={() => setRosterSort(key)}
                  >
                    <Text style={[styles.sortChipText, rosterSort === key && styles.sortChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.rosterCard}>
                {[...roster]
                  .sort((a, b) => {
                    const cmp = studentDisplayName(a).localeCompare(studentDisplayName(b));
                    return rosterSort === 'za' ? -cmp : cmp;
                  })
                  .map((enrollment) => {
                  const name = studentDisplayName(enrollment);
                  const avatarUrl = thumbUrl(enrollment.student.profile_picture, 32);
                  return (
                    <View key={enrollment.id} style={styles.rosterRow}>
                      {avatarUrl ? (
                        <CachedImage uri={avatarUrl} size={160} square style={styles.rosterAvatarImage} />
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
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* ---------------- Create / Edit class modal ---------------- */}
      <Modal visible={showFormModal} transparent animationType="fade" onRequestClose={() => setShowFormModal(false)}>
        <KeyboardSafe style={styles.modalOverlay}>
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
        </KeyboardSafe>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },

  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: TOP_GAP, paddingBottom: 14, gap: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: IS_SCHOOL ? '#fff' : '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '900', color: TITLE_COLOR },

  createButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: IS_SCHOOL ? BLUE : CARD_BG, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  createButtonText: { color: IS_SCHOOL ? '#fff' : BROWN, fontSize: 13, fontWeight: '800' },

  errorText: { color: '#B3261E', marginBottom: 12, fontSize: 13 },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: T('#8A6A2A'),
    letterSpacing: 0.5, marginBottom: 10, marginTop: 4,
  },
  emptyText: { fontSize: 13, color: T('#8A6A2A'), marginBottom: 20 },

  classCard: {
    backgroundColor: IS_SCHOOL ? LIGHT_BLUE : '#fff', borderRadius: 18, borderWidth: 2, borderColor: 'transparent',
    padding: 16, marginBottom: 12, gap: 12,
  },
  classCardSelected: { borderColor: IS_SCHOOL ? BLUE : CARD_BG },
  classCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  className: { fontSize: 17, fontWeight: '900', color: BROWN, flex: 1 },
  codeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF1C7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  classCode: { fontSize: 12, fontWeight: '800', color: '#6B4A00' },
  openBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: CARD_BG, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  openBtnText: { fontSize: 12, fontWeight: '800', color: BROWN },
  copiedText: { fontSize: 11, color: GREEN, fontWeight: '700', marginLeft: 2 },
  classStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  classStatPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: IS_SCHOOL ? BLUE : '#D6E6F8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  classStatText: { fontSize: 12, fontWeight: '800', color: IS_SCHOOL ? '#FFFFFF' : '#1F4D7A' },

  rosterCard: {
    backgroundColor: '#fff', borderRadius: 18,
    marginBottom: 20, overflow: 'hidden',
  },
  rosterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.08)',
  },
  rosterAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: IS_SCHOOL ? BLUE : CARD_BG,
    alignItems: 'center', justifyContent: 'center',
  },
  rosterAvatarImage: { width: 30, height: 30, borderRadius: 15 },
  rosterAvatarText: { fontSize: 12, fontWeight: '800', color: IS_SCHOOL ? '#FFFFFF' : BROWN },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sortLabel: { fontSize: 12, fontWeight: '700', color: T('#8A6A2A') },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(58,43,26,0.08)' },
  sortChipActive: { backgroundColor: IS_SCHOOL ? BLUE : T('#5C3A2E') },
  sortChipText: { fontSize: 12, fontWeight: '700', color: BROWN },
  sortChipTextActive: { color: '#fff' },
  rosterName: { fontSize: 14, fontWeight: '700', color: BROWN },
  rosterSub: { fontSize: 11, color: T('#8A6A2A'), marginTop: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: BROWN, marginBottom: 16 },
  modalLabel: { fontSize: 11, fontWeight: '700', color: T('#8A6A2A'), letterSpacing: 0.5, marginBottom: 6, marginTop: 10 },
  modalInput: {
    borderWidth: 1, borderColor: T('#EADEC9'), borderRadius: 10,
    padding: 10, fontSize: 14, color: BROWN,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: IS_SCHOOL ? LIGHT_BLUE : '#F5F0E6' },
  modalCancelText: { color: T('#8A6A2A'), fontWeight: '700' },
  modalCreateButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: IS_SCHOOL ? BLUE : T('#5C3A2E') },
  modalCreateText: { color: '#fff', fontWeight: '700' },
});