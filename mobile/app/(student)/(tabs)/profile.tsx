// mobile/app/(student)/(tabs)/profile.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, Image, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Modal, Pressable,
} from 'react-native';
import { T, HEADER_BG, HEADER_TEXT, activeTheme } from '../../../src/theme/theme';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../../src/context/AuthContext';
import { useToast } from '../../../src/components/Toast';
import { shrinkAvatar } from '../../../src/utils/shrinkAvatar';
import { updateMyProfile } from '../../../src/api/accounts';
import { loadProfile, getCachedProfile, setCachedProfile, peekSavedProfile } from '../../../src/utils/profileStore';
import { getMyRewards, getMyRewardSummary } from '../../../src/api/rewards';
import { FullUser, ProfileUpdatePayload } from '../../../src/types/accounts';
import { StudentReward } from '../../../src/types/rewards';
import { getMediaUrl, thumbUrl } from '../../../src/utils/media';
import ThemePicker from '../../../src/components/ThemePicker';
import ConfirmModal from '../../../src/components/ConfirmModal';
import { HowItWorksRow } from '../../../src/components/HowItWorks';
import { FadeIn, PressableScale, CountUp, Pop } from '../../../src/components/Motion';
import { NAV_CLEARANCE } from '../../../src/components/FloatingTabBar';

const CREAM = T('#F2E4C4');
const FIELD_BG = '#F7EBD0';
const GOLD = T('#F9C544');
const BROWN = T('#3A2B1A');
const BUTTON = T('#5C3A2E');
const MUTED = T('#8A6A2A');
const BORDER = T('#EADEC9');
const RED = '#B3261E';

// Theme-aware colors for the redesigned view mode
const IS_SCHOOL = activeTheme === 'school';
const HERO_BG = IS_SCHOOL ? HEADER_BG : GOLD;
const HERO_TEXT = IS_SCHOOL ? '#FFFFFF' : BROWN;
const HERO_SUB = IS_SCHOOL ? '#DCE7F7' : '#6B4E1B';
const RING = IS_SCHOOL ? '#F2B84B' : '#EA580C';
const POINTS_BG = IS_SCHOOL ? '#8FC1F2' : '#EA580C';
const POINTS_TEXT = IS_SCHOOL ? '#18303D' : '#FFFFFF';
const BADGES_BG = IS_SCHOOL ? '#1E4D8F' : '#5C2C16';
const BADGES_TEXT = '#FFFFFF';
// Edit mode colors
const EDIT_TOP_BG = IS_SCHOOL ? HEADER_BG : CREAM;
const EDIT_TOP_TEXT = IS_SCHOOL ? '#FFFFFF' : BROWN;
const EDIT_CANCEL = IS_SCHOOL ? '#DCE7F7' : MUTED;
const EDIT_SAVE_BG = IS_SCHOOL ? '#F2B84B' : BUTTON;
const EDIT_SAVE_TEXT = IS_SCHOOL ? '#18303D' : '#FFFFFF';
const EDIT_FIELD_BG = IS_SCHOOL ? '#EAF1FB' : FIELD_BG;
const EDIT_FOCUS = IS_SCHOOL ? '#1E4D8F' : BUTTON;
const EDIT_ICON_BG = IS_SCHOOL ? '#1E4D8F' : GOLD;
const EDIT_ICON_COLOR = IS_SCHOOL ? '#FFFFFF' : BROWN;
const ROW_TINTS = IS_SCHOOL ? ['#1E4D8F', '#2F6FD0', '#F2B84B'] : ['#EA580C', '#8A5A3A', '#F5B921'];

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
  const [showSignOut, setShowSignOut] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const [profile, setProfile] = useState<FullUser | null>(getCachedProfile());
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
      // Each part shows up as soon as it arrives (the profile does not wait for the rewards)
      const rewardsPart = Promise.all([
        getMyRewards().then(setRewards),
        getMyRewardSummary()
          .then((s) => setSummary(s ? { points: s.total_points, badges: s.total_badges } : null))
          .catch(() => {}),
      ]);
      const profileData = await loadProfile();
      setProfile(profileData);
      await rewardsPart;
    } catch {
      if (!getCachedProfile()) setError('Could not load your profile. Pull down to try again.');
    }
  }

  // Cold start: show the copy saved on the phone right away
  useEffect(() => {
    if (profile) return;
    peekSavedProfile().then((p) => { if (p) setProfile((cur) => cur ?? p); });
  }, []);

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
    const small = await shrinkAvatar(result.assets[0].uri);
    setPendingImage({ uri: small.uri, name: `profile_picture.${small.ext}`, type: small.type });
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
      setCachedProfile(updated);
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
    setShowSignOut(true);
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
  const avatarUrl = pendingImage?.uri || thumbUrl(p.profile_picture, 100);

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
      <SafeAreaView style={[styles.screen, { backgroundColor: EDIT_TOP_BG }]} edges={['top']}>
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
            {isSaving ? <ActivityIndicator size="small" color={EDIT_SAVE_TEXT} /> : <Text style={styles.saveButtonText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, backgroundColor: CREAM }} contentContainerStyle={styles.editContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
          <View style={styles.heroCircleA} />
          <View style={styles.heroCircleB} />
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
          <FadeIn delay={150} style={[styles.statCard, { backgroundColor: POINTS_BG }]}>
            <Pop delay={400} style={styles.statIcon}><Ionicons name="star" size={16} color={BROWN} /></Pop>
            <CountUp value={totalPoints} style={[styles.statValue, { color: POINTS_TEXT }]} delay={350} />
            <Text style={[styles.statLabel, { color: POINTS_TEXT }]}>Points</Text>
          </FadeIn>
          <FadeIn delay={280} style={[styles.statCard, { backgroundColor: BADGES_BG }]}>
            <Pop delay={530} style={styles.statIcon}><Ionicons name="ribbon" size={16} color={BROWN} /></Pop>
            <CountUp value={badgeTotal} style={[styles.statValue, { color: BADGES_TEXT }]} delay={480} />
            <Text style={[styles.statLabel, { color: BADGES_TEXT }]}>Badges</Text>
          </FadeIn>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
      >
        {/* Account */}
        <FadeIn delay={200}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="school" label="School" value={p.school || '—'} tint={ROW_TINTS[0]} />
          <InfoRow icon="mail" label="Email" value={p.email || '—'} tint={ROW_TINTS[1]} />
          <InfoRow icon="at" label="Username" value={profile.username} tint={ROW_TINTS[2]} isLast />
        </View>
        </FadeIn>

        {/* Class shortcuts */}
        <FadeIn delay={320} style={{ marginTop: 16 }}>
          <ActionRow icon="people-outline" label="My class and group" onPress={() => router.push('/(student)/class-group' as any)} />
          <ActionRow icon="add-circle-outline" label="Join another class" onPress={() => router.push('/(student)/join-class' as any)} />
        </FadeIn>

        <ThemePicker />

        <HowItWorksRow role="student" />

        <View style={{ marginTop: 16 }}>
          <ActionRow
            icon="key-outline"
            label="Change Password"
            onPress={() => router.push({ pathname: '/change-password', params: { from: '/(student)/(tabs)/profile' } })}
          />
          <ActionRow icon="log-out-outline" label="Sign Out" danger onPress={confirmSignOut} />
        </View>

        <ConfirmModal
          visible={showSignOut}
          title="Sign out?"
          message="You will need to log in again."
          onCancel={() => setShowSignOut(false)}
          onConfirm={() => {
            setShowSignOut(false);
            signOut();
          }}
        />
      </ScrollView>

    </SafeAreaView>
  );
}

// ---------------------------------------------------------------- helpers
function InfoRow({ icon, label, value, isLast, tint }: { icon: IconName; label: string; value: string; isLast?: boolean; tint?: string }) {
  return (
    <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.infoIcon, { backgroundColor: tint ?? BROWN }]}>
        <Ionicons name={icon} size={14} color="#FFFFFF" />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <PressableScale style={[styles.actionRow, danger && styles.actionRowDanger]} onPress={onPress} scaleTo={0.97}>
      <Ionicons name={icon} size={18} color={danger ? RED : BROWN} />
      <Text style={[styles.actionText, danger && { color: RED }]}>{label}</Text>
      {!danger && <Ionicons name="chevron-forward" size={16} color={MUTED} style={{ marginLeft: 'auto' }} />}
    </PressableScale>
  );
}

function SectionCard({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <View style={styles.sectionCardIcon}><Ionicons name={icon} size={14} color={EDIT_ICON_COLOR} /></View>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: NAV_CLEARANCE },

  // hero
  hero: {
    backgroundColor: HERO_BG, borderRadius: 28, alignItems: 'center', overflow: 'hidden',
    paddingTop: 30, paddingBottom: 52, paddingHorizontal: 16,
  },
  heroCircleA: { position: 'absolute', width: 190, height: 190, borderRadius: 95, right: -60, top: -70, backgroundColor: 'rgba(255,255,255,0.16)' },
  heroCircleB: { position: 'absolute', width: 130, height: 130, borderRadius: 65, left: -40, bottom: -40, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroEdit: {
    position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7,
  },
  heroEditText: { fontSize: 12, fontWeight: '800', color: BROWN },
  avatarRing: {
    width: 108, height: 108, borderRadius: 54, backgroundColor: '#fff', alignItems: 'center',
    justifyContent: 'center', borderWidth: 4, borderColor: RING, marginBottom: 12,
  },
  avatarImage: { width: 98, height: 98, borderRadius: 49 },
  avatarFallback: { backgroundColor: FIELD_BG, alignItems: 'center', justifyContent: 'center' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: EDIT_FOCUS,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: CREAM,
  },
  name: { fontSize: 22, fontWeight: '900', color: HERO_TEXT, textAlign: 'center' },
  username: { fontSize: 13, color: HERO_SUB, marginTop: 2, fontWeight: '600' },
  classPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10,
  },
  classPillText: { fontSize: 12, fontWeight: '700', color: BROWN },

  // stats
  statsRow: { flexDirection: 'row', gap: 12, marginTop: -34, marginBottom: 20, paddingHorizontal: 10 },
  statCard: {
    flex: 1, borderRadius: 20, padding: 14, minHeight: 98, justifyContent: 'flex-end',
    borderWidth: 1.5, borderColor: '#FFFFFF',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  statIcon: {
    position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 30, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '700', opacity: 0.9 },

  // badges
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: BROWN, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
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
  infoIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  infoLabel: { fontSize: 13, color: MUTED, width: 80 },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '600', color: BROWN, textAlign: 'right' },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: BORDER, paddingHorizontal: 16, height: 54, marginBottom: 10,
  },
  actionRowDanger: { backgroundColor: '#FFFFFF', borderColor: RED, borderWidth: 2, borderRadius: 999, justifyContent: 'center' },
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
  editTitle: { fontSize: 17, fontWeight: '800', color: EDIT_TOP_TEXT },
  cancelText: { fontSize: 14, color: EDIT_CANCEL, fontWeight: '700' },
  saveButton: { backgroundColor: EDIT_SAVE_BG, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, minWidth: 68, alignItems: 'center' },
  saveButtonText: { color: EDIT_SAVE_TEXT, fontSize: 14, fontWeight: '800' },
  editContent: { paddingHorizontal: 20, paddingBottom: NAV_CLEARANCE },
  editAvatarBlock: { alignItems: 'center', marginTop: 6, marginBottom: 12 },
  changePhotoText: { color: EDIT_FOCUS, fontWeight: '800', fontSize: 13 },

  sectionCard: {
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 14,
  },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionCardIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: EDIT_ICON_BG, alignItems: 'center', justifyContent: 'center' },
  sectionCardTitle: { fontSize: 14, fontWeight: '800', color: BROWN },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: BROWN, letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },
  fieldOptional: { fontSize: 10, fontWeight: '600', color: '#B8A671', letterSpacing: 0 },
  fieldInput: {
    backgroundColor: EDIT_FIELD_BG, borderRadius: 26, paddingHorizontal: 16, height: 46, fontSize: 15,
    fontWeight: '600', color: BROWN, borderWidth: 2, borderColor: 'transparent',
  },
  fieldInputFocused: { borderColor: EDIT_FOCUS },
  fieldInputError: { borderColor: RED },
  fieldError: { color: RED, fontSize: 12, marginTop: 4, marginLeft: 8 },

  lockedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 6, marginTop: 2 },
  lockedText: { flex: 1, fontSize: 12, color: MUTED, lineHeight: 17 },

  errorText: { fontSize: 14, color: MUTED, textAlign: 'center' },
  retryButton: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20, backgroundColor: GOLD },
  retryButtonText: { color: BROWN, fontWeight: '700' },
});