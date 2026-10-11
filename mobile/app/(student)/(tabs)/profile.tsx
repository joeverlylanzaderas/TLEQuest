// mobile/app/(student)/(tabs)/profile.tsx
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, Image, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Modal, Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../../src/context/AuthContext';
import { useToast } from '../../../src/components/Toast';
import { getMyProfile, updateMyProfile } from '../../../src/api/accounts';
import { getMyRewards, getMyRewardSummary } from '../../../src/api/rewards';
import { FullUser, ProfileUpdatePayload } from '../../../src/types/accounts';
import { StudentReward } from '../../../src/types/rewards';
import { getMediaUrl } from '../../../src/utils/media';

const CREAM = '#F2E4C4';
const FIELD_BG = '#F7EBD0';
const GOLD = '#F9C544';
const BROWN = '#3A2B1A';
const BUTTON = '#5C3A2E';
const MUTED = '#8A6A2A';
const BORDER = '#EADEC9';
const RED = '#B3261E';

interface BadgeSummary {
  rewardId: number;
  name: string;
  imageUrl: string | null;
  description: string;
  count: number;
  earliestEarnedAt: string;
}

interface EditableFields {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  school: string;
  grade_level: string;
  section: string;
}

const EMPTY_FIELDS: EditableFields = {
  first_name: '', middle_name: '', last_name: '', email: '', school: '', grade_level: '', section: '',
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function StudentProfile() {
  const { signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [profile, setProfile] = useState<FullUser | null>(null);
  const [rewards, setRewards] = useState<StudentReward[]>([]);
  const [summary, setSummary] = useState<{ points: number; badges: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fields, setFields] = useState<EditableFields>(EMPTY_FIELDS);
  const [initialFields, setInitialFields] = useState<EditableFields>(EMPTY_FIELDS);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EditableFields, string>>>({});
  const [pendingImage, setPendingImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeSummary | null>(null);

  async function loadData() {
    setError('');
    try {
      const [profileData, rewardsData, summaryData] = await Promise.all([
        getMyProfile(),
        getMyRewards(),
        getMyRewardSummary().catch(() => null),
      ]);
      setProfile(profileData);
      setRewards(rewardsData);
      setSummary(summaryData ? { points: summaryData.total_points, badges: summaryData.total_badges } : null);
    } catch {
      setError('Could not load your profile. Pull down to try again.');
    }
  }

  // Refetch when the tab gains focus, but never overwrite the form while editing.
  const editingRef = useRef(false);
  editingRef.current = isEditing;
  useFocusEffect(
    useCallback(() => {
      if (!editingRef.current) loadData();
    }, [])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }

  const isDirty =
    pendingImage !== null || (Object.keys(fields) as (keyof EditableFields)[]).some((k) => fields[k] !== initialFields[k]);

  function startEditing() {
    if (!profile) return;
    const p = profile.profile;
    const seed: EditableFields = {
      first_name: p.first_name ?? '',
      middle_name: p.middle_name ?? '',
      last_name: p.last_name ?? '',
      email: p.email ?? '',
      school: p.school ?? '',
      grade_level: p.grade_level ?? '',
      section: p.section ?? '',
    };
    setFields(seed);
    setInitialFields(seed);
    setFieldErrors({});
    setPendingImage(null);
    setIsEditing(true);
  }

  function closeEditing() {
    setPendingImage(null);
    setFieldErrors({});
    setIsEditing(false);
  }

  function cancelEditing() {
    if (!isDirty) return closeEditing();
    Alert.alert('Discard changes?', 'Your edits have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: closeEditing },
    ]);
  }

  function updateField(key: keyof EditableFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
    setPendingImage({
      uri: asset.uri,
      name: `profile_picture.${ext}`,
      type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    });
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof EditableFields, string>> = {};
    if (!fields.first_name.trim()) errs.first_name = 'First name is required.';
    if (!fields.last_name.trim()) errs.last_name = 'Last name is required.';
    const email = fields.email.trim();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email address.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const payload: ProfileUpdatePayload = {
        first_name: fields.first_name.trim(),
        middle_name: fields.middle_name.trim(),
        last_name: fields.last_name.trim(),
        email: fields.email.trim(),
        school: fields.school.trim(),
        grade_level: fields.grade_level.trim(),
        section: fields.section.trim(),
      };
      if (pendingImage) payload.profile_picture = pendingImage;

      const updated = await updateMyProfile(payload);
      setProfile(updated);
      closeEditing();
      toast.success('Profile updated');
    } catch (e: any) {
      const data = e?.response?.data;
      if (data?.email?.[0]) {
        setFieldErrors((prev) => ({ ...prev, email: data.email[0] }));
      }
      toast.error(data?.email?.[0] || data?.detail || 'Could not save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You will need to log in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  // ---- totals + deduped badges ----
  const totalPoints = summary ? summary.points : rewards.reduce((sum, r) => sum + (r.points_awarded || 0), 0);
  const badgeMap = new Map<number, BadgeSummary>();
  rewards
    .filter((r) => r.reward_detail.reward_type === 'badge')
    .forEach((r) => {
      const existing = badgeMap.get(r.reward);
      if (existing) {
        existing.count += 1;
        if (r.earned_at < existing.earliestEarnedAt) existing.earliestEarnedAt = r.earned_at;
      } else {
        badgeMap.set(r.reward, {
          rewardId: r.reward,
          name: r.reward_detail.reward_name,
          imageUrl: getMediaUrl(r.reward_detail.badge_image),
          description: r.reward_detail.description,
          count: 1,
          earliestEarnedAt: r.earned_at,
        });
      }
    });
  const badges = Array.from(badgeMap.values());
  const badgeTotal = summary ? summary.badges : rewards.filter((r) => r.reward_detail.reward_type === 'badge').length;

  if (!profile) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerFill}>
          {error ? (
            <>
              <Ionicons name="cloud-offline-outline" size={40} color={MUTED} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ActivityIndicator size="large" color={BROWN} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const p = profile.profile;
  const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || profile.username;
  const classLine = [p.grade_level, p.section].filter(Boolean).join(' • ');
  const avatarUrl = pendingImage?.uri || getMediaUrl(p.profile_picture);

  const avatar = (
    <View style={styles.avatarRing}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
      ) : (
        <View style={[styles.avatarImage, styles.avatarFallback]}>
          <Ionicons name="person" size={44} color={BROWN} />
        </View>
      )}
      {isEditing && (
        <View style={styles.avatarEditBadge}>
          <Ionicons name="camera" size={14} color="#fff" />
        </View>
      )}
    </View>
  );

  // =========================================================================
  // EDIT MODE
  // =========================================================================
  if (isEditing) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.editBar}>
          <TouchableOpacity onPress={cancelEditing} disabled={isSaving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.editTitle}>Edit Profile</Text>
          <TouchableOpacity
            style={[styles.saveButton, (!isDirty || isSaving) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.editContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.editAvatarBlock}>
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8}>{avatar}</TouchableOpacity>
            <TouchableOpacity onPress={handlePickPhoto}>
              <Text style={styles.changePhotoText}>{pendingImage ? 'Choose a different photo' : 'Change photo'}</Text>
            </TouchableOpacity>
          </View>

          <SectionCard icon="person" title="Personal">
            <Field label="FIRST NAME" value={fields.first_name} onChangeText={(v) => updateField('first_name', v)} error={fieldErrors.first_name} />
            <Field label="MIDDLE NAME" value={fields.middle_name} onChangeText={(v) => updateField('middle_name', v)} optional />
            <Field label="LAST NAME" value={fields.last_name} onChangeText={(v) => updateField('last_name', v)} error={fieldErrors.last_name} />
          </SectionCard>

          <SectionCard icon="mail" title="Contact">
            <Field
              label="EMAIL"
              value={fields.email}
              onChangeText={(v) => updateField('email', v)}
              error={fieldErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              optional
            />
          </SectionCard>

          <SectionCard icon="school" title="School">
            <Field label="SCHOOL" value={fields.school} onChangeText={(v) => updateField('school', v)} optional />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="GRADE LEVEL" value={fields.grade_level} onChangeText={(v) => updateField('grade_level', v)} optional />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="SECTION" value={fields.section} onChangeText={(v) => updateField('section', v)} optional />
              </View>
            </View>
          </SectionCard>

          <View style={styles.lockedRow}>
            <Ionicons name="lock-closed" size={14} color={MUTED} />
            <Text style={styles.lockedText}>Username (@{profile.username}) can only be changed by your teacher or admin.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW MODE
  // =========================================================================
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Fixed header: hero + stats stay in place while the rest scrolls */}
      <View style={styles.fixedTop}>
        <View style={styles.hero}>
          <TouchableOpacity style={styles.heroEdit} onPress={startEditing} activeOpacity={0.85}>
            <Ionicons name="pencil" size={14} color={BROWN} />
            <Text style={styles.heroEditText}>Edit</Text>
          </TouchableOpacity>
          {avatar}
          <Text style={styles.name} numberOfLines={2}>{fullName}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          {classLine ? (
            <View style={styles.classPill}>
              <Ionicons name="school" size={12} color={BROWN} />
              <Text style={styles.classPillText}>{classLine}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}><Ionicons name="star" size={20} color={BROWN} /></View>
            <Text style={styles.statValue}>{totalPoints}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIcon}><Ionicons name="ribbon" size={20} color={BROWN} /></View>
            <Text style={styles.statValue}>{badgeTotal}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
      >
        {/* Account */}
        <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Account</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="school" label="School" value={p.school || '—'} />
          <InfoRow icon="mail" label="Email" value={p.email || '—'} />
          <InfoRow icon="at" label="Username" value={profile.username} isLast />
        </View>

        <ActionRow
          icon="key-outline"
          label="Change Password"
          onPress={() => router.push({ pathname: '/change-password', params: { from: '/(student)/(tabs)/profile' } })}
        />
        <ActionRow icon="log-out-outline" label="Sign Out" danger onPress={confirmSignOut} />
      </ScrollView>

    </SafeAreaView>
  );
}

// ---------------------------------------------------------------- helpers
function InfoRow({ icon, label, value, isLast }: { icon: IconName; label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={16} color={BROWN} style={{ marginRight: 10 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={[styles.actionRow, danger && styles.actionRowDanger]} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={18} color={danger ? RED : BROWN} />
      <Text style={[styles.actionText, danger && { color: RED }]}>{label}</Text>
      {!danger && <Ionicons name="chevron-forward" size={16} color={MUTED} style={{ marginLeft: 'auto' }} />}
    </TouchableOpacity>
  );
}

function SectionCard({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <View style={styles.sectionCardIcon}><Ionicons name={icon} size={14} color={BROWN} /></View>
        <Text style={styles.sectionCardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Field({
  label, value, onChangeText, error, keyboardType, autoCapitalize, optional,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  optional?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.fieldLabel}>
        {label}
        {optional ? <Text style={styles.fieldOptional}>  optional</Text> : null}
      </Text>
      <TextInput
        style={[styles.fieldInput, focused && styles.fieldInputFocused, !!error && styles.fieldInputError]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={label.charAt(0) + label.slice(1).toLowerCase()}
        placeholderTextColor="#B8A671"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  fixedTop: { paddingHorizontal: 20, paddingTop: 20 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },

  // hero
  hero: {
    backgroundColor: GOLD, borderRadius: 28, alignItems: 'center',
    paddingTop: 30, paddingBottom: 52, paddingHorizontal: 16,
  },
  heroEdit: {
    position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7,
  },
  heroEditText: { fontSize: 12, fontWeight: '800', color: BROWN },
  avatarRing: {
    width: 108, height: 108, borderRadius: 54, backgroundColor: '#fff', alignItems: 'center',
    justifyContent: 'center', borderWidth: 3, borderColor: BROWN, marginBottom: 12,
  },
  avatarImage: { width: 98, height: 98, borderRadius: 49 },
  avatarFallback: { backgroundColor: FIELD_BG, alignItems: 'center', justifyContent: 'center' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: BROWN,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: CREAM,
  },
  name: { fontSize: 22, fontWeight: '800', color: BROWN, textAlign: 'center' },
  username: { fontSize: 13, color: '#6B4E1B', marginTop: 2, fontWeight: '600' },
  classPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10,
  },
  classPillText: { fontSize: 12, fontWeight: '700', color: BROWN },

  // stats
  statsRow: { flexDirection: 'row', gap: 12, marginTop: -34, marginBottom: 20, paddingHorizontal: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', color: BROWN, marginTop: 6 },
  statLabel: { fontSize: 12, color: MUTED, fontWeight: '600' },

  // badges
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: BROWN },
  sectionHint: { fontSize: 11, color: MUTED },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 18,
    alignItems: 'center', gap: 8, marginBottom: 24,
  },
  emptyText: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 18 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  badgeItem: { width: 84, alignItems: 'center' },
  badgeImageWrapper: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: BROWN,
  },
  badgeImage: { width: 64, height: 64, borderRadius: 32 },
  badgeCountPill: {
    position: 'absolute', bottom: -4, right: -6, backgroundColor: BROWN, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  badgeName: { fontSize: 11, color: BROWN, textAlign: 'center', marginTop: 8, fontWeight: '600' },

  // account
  infoCard: {
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 4, marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.08)',
  },
  infoLabel: { fontSize: 13, color: MUTED, width: 80 },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '600', color: BROWN, textAlign: 'right' },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: BORDER, paddingHorizontal: 16, height: 54, marginBottom: 10,
  },
  actionRowDanger: { backgroundColor: '#FDE4E1', borderColor: '#F7C9C4', justifyContent: 'center' },
  actionText: { fontSize: 15, fontWeight: '700', color: BROWN },

  // badge modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  modalCard: { width: '100%', maxWidth: 340, backgroundColor: CREAM, borderRadius: 24, padding: 22, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: BROWN, marginTop: 14, textAlign: 'center' },
  modalDesc: { fontSize: 13, color: BROWN, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  modalMeta: { fontSize: 11, color: MUTED, marginTop: 10, textAlign: 'center' },
  modalClose: { backgroundColor: BUTTON, borderRadius: 24, paddingHorizontal: 32, paddingVertical: 11, marginTop: 18 },
  modalCloseText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // edit mode
  editBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  editTitle: { fontSize: 17, fontWeight: '800', color: BROWN },
  cancelText: { fontSize: 14, color: MUTED, fontWeight: '700' },
  saveButton: { backgroundColor: BUTTON, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, minWidth: 68, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  editContent: { paddingHorizontal: 20, paddingBottom: 120 },
  editAvatarBlock: { alignItems: 'center', marginTop: 6, marginBottom: 12 },
  changePhotoText: { color: BUTTON, fontWeight: '800', fontSize: 13 },

  sectionCard: {
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 14,
  },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionCardIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  sectionCardTitle: { fontSize: 14, fontWeight: '800', color: BROWN },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: BROWN, letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },
  fieldOptional: { fontSize: 10, fontWeight: '600', color: '#B8A671', letterSpacing: 0 },
  fieldInput: {
    backgroundColor: FIELD_BG, borderRadius: 26, paddingHorizontal: 16, height: 46, fontSize: 15,
    fontWeight: '600', color: BROWN, borderWidth: 2, borderColor: 'transparent',
  },
  fieldInputFocused: { borderColor: BUTTON },
  fieldInputError: { borderColor: RED },
  fieldError: { color: RED, fontSize: 12, marginTop: 4, marginLeft: 8 },

  lockedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 6, marginTop: 2 },
  lockedText: { flex: 1, fontSize: 12, color: MUTED, lineHeight: 17 },

  errorText: { fontSize: 14, color: MUTED, textAlign: 'center' },
  retryButton: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20, backgroundColor: GOLD },
  retryButtonText: { color: BROWN, fontWeight: '700' },
});
