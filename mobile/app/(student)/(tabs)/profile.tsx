// mobile/app/(student)/(tabs)/profile.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../../src/context/AuthContext';
import { getMyProfile, updateMyProfile } from '../../../src/api/accounts';
import { getMyRewards } from '../../../src/api/rewards';
import { FullUser, ProfileUpdatePayload } from '../../../src/types/accounts';
import { StudentReward } from '../../../src/types/rewards';
import { getMediaUrl } from '../../../src/utils/media';

// ============================================================================
// COLOR PALETTE — same as the login screen, so the app feels consistent.
// ============================================================================
const CREAM = '#F2E4C4';
const FIELD_BG = '#F5B921';
const CARD_BG = '#F9C544';
const BROWN = '#3A2B1A';

// A single earned badge, deduped + counted (a student could earn the same
// badge more than once from different quest steps).
interface BadgeSummary {
  rewardId: number;
  name: string;
  imageUrl: string | null;
  description: string;
  count: number;
  earliestEarnedAt: string;
}

// Shape of the editable form fields — mirrors ProfileUpdatePayload minus
// the picture (which is tracked separately since it's a local file, not text).
interface EditableFields {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  occupation: string;
  school: string;
  grade_level: string;
  section: string;
}

const EMPTY_FIELDS: EditableFields = {
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  occupation: '',
  school: '',
  grade_level: '',
  section: '',
};

export default function StudentProfile() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<FullUser | null>(null);
  const [rewards, setRewards] = useState<StudentReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // ---- Edit mode state ----
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fields, setFields] = useState<EditableFields>(EMPTY_FIELDS);
  // Newly picked photo, not yet saved. Null = no change. Kept separate from
  // the server's avatarUrl so Cancel can discard it without a refetch.
  const [pendingImage, setPendingImage] = useState<{ uri: string; name: string; type: string } | null>(null);

  async function loadData() {
    setError('');
    try {
      const [profileData, rewardsData] = await Promise.all([
        getMyProfile(),
        getMyRewards(),
      ]);
      setProfile(profileData);
      setRewards(rewardsData);
    } catch (e) {
      setError('Could not load your profile. Pull down to try again.');
    }
  }

  // Refetch every time this tab comes into focus (e.g. after earning a
  // reward on another screen), not just on first mount.
  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadData().finally(() => setIsLoading(false));
    }, [])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }

  // ---- Enter edit mode: seed the form from the currently loaded profile ----
  function startEditing() {
    if (!profile) return;
    const p = profile.profile;
    setFields({
      first_name: p.first_name ?? '',
      middle_name: p.middle_name ?? '',
      last_name: p.last_name ?? '',
      email: p.email ?? '',
      occupation: p.occupation ?? '',
      school: p.school ?? '',
      grade_level: p.grade_level ?? '',
      section: p.section ?? '',
    });
    setPendingImage(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setPendingImage(null);
    setIsEditing(false);
  }

  function updateField(key: keyof EditableFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  // ---- Photo picker (only usable while editing) ----
  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], 
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    // Derive a filename + mime type Django's ImageField will accept.
    const fileExtension = asset.uri.split('.').pop() || 'jpg';
    setPendingImage({
      uri: asset.uri,
      name: `profile_picture.${fileExtension}`,
      type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
    });
  }

  // ---- Save changes ----
  async function handleSave() {
    // Simple required-field check — email is the only one the backend
    // enforces uniqueness on, so it's worth a friendly check up front.
    if (fields.first_name.trim() === '' || fields.last_name.trim() === '') {
      Alert.alert('Missing info', 'First and last name are required.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: ProfileUpdatePayload = {
        first_name: fields.first_name.trim(),
        middle_name: fields.middle_name.trim(),
        last_name: fields.last_name.trim(),
        email: fields.email.trim(),
        occupation: fields.occupation.trim(),
        school: fields.school.trim(),
        grade_level: fields.grade_level.trim(),
        section: fields.section.trim(),
      };
      if (pendingImage) {
        payload.profile_picture = pendingImage;
      }

      const updated = await updateMyProfile(payload);
      setProfile(updated);
      setPendingImage(null);
      setIsEditing(false);
    } catch (e: any) {
      const message =
        e?.response?.data?.email?.[0] ||
        e?.response?.data?.detail ||
        'Could not save changes. Please check your info and try again.';
      Alert.alert('Save failed', message);
    } finally {
      setIsSaving(false);
    }
  }

  // ---- Derive points total + badge summary from the raw rewards list ----
  const totalPoints = rewards
    .filter((r) => r.reward_detail.reward_type === 'points')
    .reduce((sum, r) => sum + r.reward_detail.points_value, 0);

  const badgeMap = new Map<number, BadgeSummary>();
  rewards
    .filter((r) => r.reward_detail.reward_type === 'badge')
    .forEach((r) => {
      const existing = badgeMap.get(r.reward);
      if (existing) {
        existing.count += 1;
        if (r.earned_at < existing.earliestEarnedAt) {
          existing.earliestEarnedAt = r.earned_at;
        }
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

  // ---- Guard on `profile` itself, not `isLoading`/`error` as stand-ins for it ----
  // `isLoading` can flip to false slightly before `profile` is actually set
  // if loadData() gets called more than once in quick succession (e.g.
  // useFocusEffect firing twice in dev, or rapid tab switching). Checking
  // `!profile` directly — instead of trusting `profile!` — means TypeScript
  // correctly narrows `profile` to non-null below, AND we never crash even
  // if that overlap happens.
  if (!profile) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerFill}>
          {error ? (
            <>
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

  // From this point on, TypeScript knows `profile` is non-null (no `!` needed).
  const p = profile.profile;
  const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || profile.username;
  // Pending (just-picked, unsaved) photo takes priority over the server photo.
  const avatarUrl = pendingImage?.uri || getMediaUrl(p.profile_picture);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={BROWN}
            enabled={!isEditing} // avoid weird pull-to-refresh while mid-edit
          />
        }
      >
        {/* ---------------- Edit toggle, top right ---------------- */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          {isEditing ? (
            <View style={styles.editActionsRow}>
              <TouchableOpacity onPress={cancelEditing} disabled={isSaving} style={styles.topBarButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.saveButton}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={startEditing} style={styles.editIconButton}>
              <Ionicons name="pencil" size={16} color={BROWN} />
              <Text style={styles.editIconText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ---------------- Header: avatar + name + role/grade ---------------- */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={isEditing ? handlePickPhoto : undefined}
            activeOpacity={isEditing ? 0.7 : 1}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              // Fallback if the student hasn't uploaded a profile picture yet
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={40} color={BROWN} />
              </View>
            )}
            {isEditing && (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {!isEditing && (
            <>
              <Text style={styles.name}>{fullName}</Text>
              <Text style={styles.subInfo}>
                {[p.grade_level, p.section].filter(Boolean).join(' • ') || profile.username}
              </Text>
            </>
          )}
        </View>

        {/* ---------------- Stats row: points + badge count ---------------- */}
        {/* Hidden while editing to keep focus on the form and save space. */}
        {!isEditing && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="star" size={22} color={BROWN} />
              <Text style={styles.statValue}>{totalPoints}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="ribbon" size={22} color={BROWN} />
              <Text style={styles.statValue}>{badges.length}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
          </View>
        )}

        {/* ---------------- Account info: read view OR edit form ---------------- */}
        {isEditing ? (
          <View style={styles.formCard}>
            <FormField label="First Name" value={fields.first_name} onChangeText={(v) => updateField('first_name', v)} />
            <FormField label="Middle Name" value={fields.middle_name} onChangeText={(v) => updateField('middle_name', v)} />
            <FormField label="Last Name" value={fields.last_name} onChangeText={(v) => updateField('last_name', v)} />
            <FormField
              label="Email"
              value={fields.email}
              onChangeText={(v) => updateField('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FormField label="School" value={fields.school} onChangeText={(v) => updateField('school', v)} />
            <FormField label="Grade Level" value={fields.grade_level} onChangeText={(v) => updateField('grade_level', v)} />
            <FormField label="Section" value={fields.section} onChangeText={(v) => updateField('section', v)} isLast />
          </View>
        ) : (
          <View style={styles.infoCard}>
            <InfoRow icon="school" label="School" value={p.school || '—'} />
            <InfoRow icon="mail" label="Email" value={p.email || '—'} />
            <InfoRow icon="at" label="Username" value={profile.username} />
          </View>
        )}

        {/* ---------------- Change password ---------------- */}
        {/* Hidden while editing, same reasoning as Sign Out below. */}
        {!isEditing && (
          <TouchableOpacity
            style={styles.changePasswordButton}
            onPress={() => router.push({ pathname: '/change-password', params: { from: '/(student)/(tabs)/profile' } })}
          >
            <Ionicons name="key-outline" size={16} color={BROWN} />
            <Text style={styles.changePasswordText}>Change Password</Text>
          </TouchableOpacity>
        )}

        {/* ---------------- Sign out ---------------- */}
        {/* Hidden while editing so an accidental tap doesn't discard changes. */}
        {!isEditing && (
          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color="#B3261E" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Small helper component for the account-info rows, just to avoid repeating
// the same three lines of markup for School / Email / Username.
function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={BROWN} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// Labeled text input used in edit mode — one row per editable field.
function FormField({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  isLast,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  isLast?: boolean;
}) {
  return (
    <View style={[styles.formFieldRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={styles.formInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#B8A671"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // --------------------------------------------------------------------
  // SCREEN / LAYOUT
  // --------------------------------------------------------------------
  screen: {
    flex: 1,
    backgroundColor: CREAM,        // ⬅ change to recolor the whole screen background
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,             // ⬅ extra space at the very bottom of the scroll
  },

  // --------------------------------------------------------------------
  // TOP BAR — Edit button, or Cancel/Save while editing
  // --------------------------------------------------------------------
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 36,
  },
  editIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: CARD_BG,
  },
  editIconText: {
    fontSize: 13,
    fontWeight: '700',
    color: BROWN,
  },
  editActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topBarButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 14,
    color: '#8A6A2A',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#5C3A2E',    // ⬅ matches the login button color
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // --------------------------------------------------------------------
  // HEADER — avatar, name, grade/section
  // --------------------------------------------------------------------
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    marginBottom: 12,
    position: 'relative',          // lets the camera badge sit on top, bottom-right
  },
  avatarImage: {
    width: 96,                     // ⬅ increase to make avatar bigger
    height: 96,
    borderRadius: 48,              // ⬅ keep this = half of width/height for a perfect circle
    backgroundColor: FIELD_BG,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: FIELD_BG,     // ⬅ background color when no picture is set
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Small camera icon overlaid on the avatar, only shown in edit mode, to
  // signal "tap to change photo".
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BROWN,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: CREAM,
  },
  name: {
    fontSize: 20,                  // ⬅ increase for bigger name text
    fontWeight: '800',
    color: BROWN,
  },
  subInfo: {
    fontSize: 13,
    color: '#8A6A2A',
    marginTop: 4,
  },

  // --------------------------------------------------------------------
  // STATS ROW — Points / Badges side by side
  // --------------------------------------------------------------------
  statsRow: {
    flexDirection: 'row',
    gap: 12,                       // space between the two stat cards
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 20,              // ⬅ increase for more rounded corners
    paddingVertical: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,                  // ⬅ increase for bigger number
    fontWeight: '800',
    color: BROWN,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8A6A2A',
    marginTop: 2,
  },

  // --------------------------------------------------------------------
  // BADGES SECTION
  // --------------------------------------------------------------------
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BROWN,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#8A6A2A',
    marginBottom: 24,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',              // wraps badges onto multiple rows
    gap: 14,                       // space between badge items, both directions
    marginBottom: 28,
  },
  badgeItem: {
    width: 84,                     // ⬅ increase to make each badge slot wider
    alignItems: 'center',
  },
  badgeImageWrapper: {
    width: 64,                     // ⬅ increase to make badge icon/image bigger
    height: 64,
    borderRadius: 32,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  badgeCountPill: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: BROWN,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeName: {
    fontSize: 11,
    color: BROWN,
    textAlign: 'center',
    marginTop: 6,
  },

  // --------------------------------------------------------------------
  // ACCOUNT INFO CARD (read-only view)
  // --------------------------------------------------------------------
  infoCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(58,43,26,0.1)', // faint divider between rows
  },
  infoIcon: {
    marginRight: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: '#8A6A2A',
    width: 80,                     // ⬅ increase if labels get cut off
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: BROWN,
    textAlign: 'right',
  },

  changePasswordButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingVertical: 14,
  borderRadius: 30,
  backgroundColor: CARD_BG,
  marginBottom: 12,
},
changePasswordText: {
  color: BROWN,
  fontSize: 15,
  fontWeight: '700',
},

  // --------------------------------------------------------------------
  // EDIT FORM CARD (shown instead of infoCard while isEditing)
  // --------------------------------------------------------------------
  formCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  formFieldRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(58,43,26,0.1)',
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A6A2A',
    letterSpacing: 0.4,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  formInput: {
    fontSize: 15,
    fontWeight: '600',
    color: BROWN,
    padding: 0,                    // remove default TextInput padding for a tighter row
  },

  // --------------------------------------------------------------------
  // SIGN OUT BUTTON
  // --------------------------------------------------------------------
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: '#FDE4E1',     // ⬅ change to recolor the sign-out button background
  },
  signOutText: {
    color: '#B3261E',               // ⬅ change to recolor the sign-out text
    fontSize: 15,
    fontWeight: '700',
  },

  // --------------------------------------------------------------------
  // ERROR / RETRY STATE
  // --------------------------------------------------------------------
  errorText: {
    fontSize: 14,
    color: '#8A6A2A',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: CARD_BG,
  },
  retryButtonText: {
    color: BROWN,
    fontWeight: '700',
  },
});