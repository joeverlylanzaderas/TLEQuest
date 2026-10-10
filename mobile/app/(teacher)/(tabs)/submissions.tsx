// mobile/app/(teacher)/(tabs)/submissions.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
  StyleSheet, Image, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyProfile } from '../../../src/api/accounts';
import { getMyClasses, getClassGroups } from '../../../src/api/classrooms';
import { getSubmissions } from '../../../src/api/submissions';
import { ClassSummary } from '../../../src/types/classrooms';
import { Submission } from '../../../src/types/submissions';

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const ORANGE = '#EA580C';

type Status = 'all' | 'pending' | 'reviewed';
type PickerKind = 'class' | 'group' | 'status' | null;

interface GroupInfo {
  id: number;
  name: string;
  classId: number;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function TeacherSubmissions() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('pending');
  const [search, setSearch] = useState('');
  const [picker, setPicker] = useState<PickerKind>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [p, s, c] = await Promise.all([getMyProfile(), getSubmissions(), getMyClasses()]);
      setTeacherName(p.profile.first_name || p.username);
      setSubmissions(s);
      setClasses(c);

      // group -> class lookup, so each submission can be filtered by section
      const perClass = await Promise.all(
        c.map(async (cl) => {
          try {
            const g = await getClassGroups(cl.id);
            return g.map((x) => ({
              id: x.id,
              name: x.group_name || `Group ${x.group_number}`,
              classId: cl.id,
            }));
          } catch {
            return [] as GroupInfo[];
          }
        })
      );
      setGroups(perClass.flat());
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not load submissions.');
    }
  }, []);

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

  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const groupsForPicker = groups.filter((g) => classId === null || g.classId === classId);

  const visible = submissions.filter((s) => {
    const g = groupById.get(s.group);
    if (classId !== null && g?.classId !== classId) return false;
    if (groupId !== null && s.group !== groupId) return false;
    if (status === 'pending' && s.is_reviewed) return false;
    if (status === 'reviewed' && !s.is_reviewed) return false;
    const q = search.trim().toLowerCase();
    if (q && !`${s.quest_title} ${s.group_name} ${s.student_username}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const pendingCount = submissions.filter((s) => !s.is_reviewed).length;
  const activeFilters = (classId !== null ? 1 : 0) + (groupId !== null ? 1 : 0) + (status !== 'pending' ? 1 : 0);

  function clearFilters() {
    setClassId(null);
    setGroupId(null);
    setStatus('pending');
    setSearch('');
  }

  const classLabel = classId !== null ? classById.get(classId)?.class_name ?? 'Class' : 'All classes';
  const groupLabel = groupId !== null ? groupById.get(groupId)?.name ?? 'Group' : 'All groups';
  const statusLabel = status === 'pending' ? 'Needs review' : status === 'reviewed' ? 'Reviewed' : 'All status';

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const options: { key: string; label: string; selected: boolean; onPick: () => void }[] =
    picker === 'class'
      ? [
          { key: 'all', label: 'All classes', selected: classId === null, onPick: () => { setClassId(null); setGroupId(null); } },
          ...classes.map((c) => ({
            key: String(c.id),
            label: c.class_name,
            selected: classId === c.id,
            onPick: () => { setClassId(c.id); setGroupId(null); },
          })),
        ]
      : picker === 'group'
        ? [
            { key: 'all', label: 'All groups', selected: groupId === null, onPick: () => setGroupId(null) },
            ...groupsForPicker.map((g) => ({
              key: String(g.id),
              label: classId === null ? `${g.name} (${classById.get(g.classId)?.class_name ?? ''})` : g.name,
              selected: groupId === g.id,
              onPick: () => setGroupId(g.id),
            })),
          ]
        : picker === 'status'
          ? (['pending', 'reviewed', 'all'] as Status[]).map((k) => ({
              key: k,
              label: k === 'pending' ? 'Needs review' : k === 'reviewed' ? 'Reviewed' : 'All status',
              selected: status === k,
              onPick: () => setStatus(k),
            }))
          : [];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={20} color={BROWN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeSmall}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{teacherName || '...'}!</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.dateText}>{today}</Text>
            <Text style={styles.classText}>Teacher's Portal</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BROWN} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>Submissions</Text>
            <Text style={styles.countText}>{pendingCount} need review</Text>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#B8A671" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search quest, group, or student"
              placeholderTextColor="#B8A671"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#B8A671" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.dropdown, classId !== null && styles.dropdownActive]}
              onPress={() => setPicker('class')}
            >
              <Text style={[styles.dropdownText, classId !== null && styles.dropdownTextActive]} numberOfLines={1}>
                {classLabel}
              </Text>
              <Ionicons name="chevron-down" size={14} color={classId !== null ? '#fff' : BROWN} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdown, groupId !== null && styles.dropdownActive]}
              onPress={() => setPicker('group')}
            >
              <Text style={[styles.dropdownText, groupId !== null && styles.dropdownTextActive]} numberOfLines={1}>
                {groupLabel}
              </Text>
              <Ionicons name="chevron-down" size={14} color={groupId !== null ? '#fff' : BROWN} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.dropdown, status !== 'pending' && styles.dropdownActive]}
              onPress={() => setPicker('status')}
            >
              <Text style={[styles.dropdownText, status !== 'pending' && styles.dropdownTextActive]} numberOfLines={1}>
                {statusLabel}
              </Text>
              <Ionicons name="chevron-down" size={14} color={status !== 'pending' ? '#fff' : BROWN} />
            </TouchableOpacity>
            {activeFilters > 0 || search ? (
              <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                <Ionicons name="refresh" size={14} color={ORANGE} />
                <Text style={styles.clearText}>Reset</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}
          </View>

          <Text style={styles.resultText}>{visible.length} of {submissions.length} submissions</Text>

          {visible.length === 0 ? (
            <Text style={styles.emptyText}>
              {submissions.length === 0
                ? 'No submissions yet. They appear here when a group leader submits an output.'
                : 'No submissions match these filters.'}
            </Text>
          ) : (
            visible.map((s) => {
              const accepted = s.classifier_result === 'ACCEPTED';
              const cls = classById.get(groupById.get(s.group)?.classId ?? -1);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.card}
                  onPress={() => router.push(`/(teacher)/submission/${s.id}` as any)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: s.image_url }} style={styles.thumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.questTitle} numberOfLines={1}>{s.quest_title}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {cls ? `${cls.class_name} • ` : ''}{s.group_name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {s.student_username} • {formatDateTime(s.submitted_at)}
                    </Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, { backgroundColor: accepted ? '#DCFCE7' : '#FFEDD5' }]}>
                        <Text style={[styles.badgeText, { color: accepted ? '#166534' : '#9A3412' }]}>
                          AI: {s.classifier_result}
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: s.is_reviewed ? '#DBEAFE' : '#FEF3C7' }]}>
                        <Text style={[styles.badgeText, { color: s.is_reviewed ? '#1E40AF' : '#92400E' }]}>
                          {s.is_reviewed ? 'Reviewed' : 'Needs review'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#B8A671" />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPicker(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {picker === 'class' ? 'Select class' : picker === 'group' ? 'Select group' : 'Select status'}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {options.length === 0 ? (
                <Text style={styles.emptyText}>Nothing to choose.</Text>
              ) : (
                options.map((o) => (
                  <TouchableOpacity
                    key={o.key}
                    style={styles.optionRow}
                    onPress={() => { o.onPick(); setPicker(null); }}
                  >
                    <Text style={[styles.optionText, o.selected && styles.optionTextActive]}>{o.label}</Text>
                    {o.selected && <Ionicons name="checkmark" size={20} color={ORANGE} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: GOLD, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  welcomeSmall: { fontSize: 12, color: BROWN, opacity: 0.8 },
  welcomeName: { fontSize: 16, fontWeight: '800', color: BROWN },
  dateText: { fontSize: 11, color: BROWN, fontWeight: '600' },
  classText: { fontSize: 11, color: BROWN, fontWeight: '700', marginTop: 2 },

  scrollContent: { padding: 20, paddingBottom: 60 },
  errorText: { color: '#B3261E', marginBottom: 12, fontSize: 13 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: BROWN },
  countText: { fontSize: 12, fontWeight: '700', color: ORANGE },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EADEC9', borderRadius: 14, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: BROWN },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dropdown: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EADEC9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  dropdownActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  dropdownText: { flex: 1, fontSize: 12, fontWeight: '700', color: BROWN },
  dropdownTextActive: { color: '#fff' },
  clearBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: ORANGE, borderRadius: 12, paddingVertical: 10 },
  clearText: { fontSize: 12, fontWeight: '800', color: ORANGE },

  resultText: { fontSize: 11, color: '#8A6A2A', marginVertical: 6 },
  emptyText: { color: '#8A6A2A', fontStyle: 'italic', textAlign: 'center', marginTop: 24, lineHeight: 20 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 12 },
  thumb: { width: 78, height: 78, borderRadius: 12, backgroundColor: '#EADEC9' },
  questTitle: { fontSize: 14, fontWeight: '800', color: '#7c2d12' },
  meta: { fontSize: 11, color: '#8A6A2A', marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '800' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: CREAM, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: BROWN, marginBottom: 10 },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.08)' },
  optionText: { fontSize: 14, color: BROWN, fontWeight: '600', flex: 1 },
  optionTextActive: { color: ORANGE, fontWeight: '800' },
});