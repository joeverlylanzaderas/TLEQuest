// mobile/app/(teacher)/(tabs)/settings.tsx
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
import { T, HEADER_BG, HEADER_TEXT, activeTheme } from '../../../src/theme/theme';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../../src/context/AuthContext';
import { getMyProfile, updateMyProfile } from '../../../src/api/accounts';
import { FullUser, ProfileUpdatePayload } from '../../../src/types/accounts';
import { getMediaUrl } from '../../../src/utils/media';
import { useToast } from '../../../src/components/Toast';
import ThemePicker from '../../../src/components/ThemePicker';
import ConfirmModal from '../../../src/components/ConfirmModal';

// ============================================================================
// COLOR PALETTE — same as login/student profile, so the app feels consistent.
// ============================================================================
const CREAM = T('#F2E4C4');
const CARD_BG = T('#F9C544');
const BROWN = T('#3A2B1A');
const BUTTON = T('#5C3A2E');
const MUTED = T('#8A6A2A');
const BORDER = T('#EADEC9');
const RED = '#B3261E';

// Theme-aware colors (Default theme keeps the original gold/brown look)
const IS_SCHOOL = activeTheme === 'school';
const HERO_BG = IS_SCHOOL ? HEADER_BG : CARD_BG;
const HERO_TEXT = IS_SCHOOL ? '#FFFFFF' : BROWN;
const HERO_SUB = IS_SCHOOL ? '#DCE7F7' : '#6B4E1B';
const RING = IS_SCHOOL ? '#F2B84B' : '#EA580C';
const ICON_MAIN = IS_SCHOOL ? '#1E4D8F' : '#5C2C16';
const ROW_TINTS = IS_SCHOOL ? ['#1E4D8F', '#2F6FD0', '#F2B84B'] : ['#EA580C', '#8A5A3A', '#F5B921'];
const EDIT_TOP_BG = IS_SCHOOL ? HEADER_BG : CREAM;
const EDIT_TOP_TEXT = IS_SCHOOL ? '#FFFFFF' : BROWN;
const EDIT_CANCEL = IS_SCHOOL ? '#DCE7F7' : MUTED;
const EDIT_SAVE_BG = IS_SCHOOL ? '#F2B84B' : BUTTON;
const EDIT_SAVE_TEXT = IS_SCHOOL ? '#18303D' : '#FFFFFF';
const EDIT_FOCUS = IS_SCHOOL ? '#1E4D8F' : BUTTON;

interface EditableFields {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  occupation: string;
  school: string;
}

const EMPTY_FIELDS: EditableFields = {
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  occupation: '',
  school: '',
};

export default function TeacherSettings() {
  const toast = useToast();
  const { signOut } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<FullUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fields, setFields] = useState<EditableFields>(EMPTY_FIELDS);
  const [pendingImage, setPendingImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [showSignOut, setShowSignOut] = useState(false);

  function confirmSignOut() {
    setShowSignOut(true);
  }

  async function loadData() {
    setError('');
    try {
      const data = await getMyProfile();
      setProfile(data);
    } catch (e) {
      setError('Could not load your profile. Pull down to try again.');
    }
  }

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
    const fileExtension = asset.uri.split('.').pop() || 'jpg';
    setPendingImage({
      uri: asset.uri,
      name: `profile_picture.${fileExtension}`,
      type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
    });
  }

  async function handleSave() {
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
      };
      if (pendingImage) {
        payload.profile_picture = pendingImage;
      }

      const updated = await updateMyProfile(payload);
      setProfile(updated);
      setPendingImage(null);
      setIsEditing(false);
      toast.success('Profile saved');
    } catch (e: any) {
      const message =
        e?.response?.data?.email?.[0] ||
        e?.response?.data?.detail ||
        'Could not save changes. Please check your info and try again.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

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

  const p = profile.profile;
  const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || profile.username;
  const avatarUrl = pendingImage?.uri || getMediaUrl(p.profile_picture);
  const joinedShort = new Date(profile.date_joined).toLocaleDateString(undefined, {
    month: 'short', year: 'numeric',
  });

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
          <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.saveButton}>
            {isSaving ? (
              <ActivityIndicator size="small" color={EDIT_SAVE_TEXT} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1, backgroundColor: CREAM }}
          contentContainerStyle={styles.editContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.editAvatarBlock}>
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8}>{avatar}</TouchableOpacity>
            <TouchableOpacity onPress={handlePickPhoto}>
              <Text style={styles.changePhotoText}>{pendingImage ? 'Choose a different photo' : 'Change photo'}</Text>
            </TouchableOpacity>
          </View>

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
            <FormField label="Occupation / Subject" value={fields.occupation} onChangeText={(v) => updateField('occupation', v)} isLast />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW MODE
  // =========================================================================
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: HERO_BG }]} edges={['top']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: CREAM }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
      >
        {/* Curved top banner */}
        <View style={styles.top}>
          <View style={styles.shapeA} />
          <View style={styles.shapeB} />
          {avatar}
          <Text style={styles.name} numberOfLines={2}>{fullName}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          <View style={styles.chipsRow}>
            <View style={styles.chip}><Text style={styles.chipText}>TEACHER</Text></View>
            <View style={styles.chip}><Text style={styles.chipText}>Joined {joinedShort}</Text></View>
          </View>
        </View>

        {/* Round shortcut buttons (overlap the banner) */}
        <View style={styles.circleRow}>
          <TouchableOpacity style={styles.circleItem} onPress={startEditing} activeOpacity={0.85}>
            <View style={styles.circleBtn}><Ionicons name="pencil" size={22} color={ICON_MAIN} /></View>
            <Text style={styles.circleLabel}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.circleItem}
            onPress={() => router.push({ pathname: '/change-password', params: { from: '/(teacher)/(tabs)/settings' } })}
            activeOpacity={0.85}
          >
            <View style={styles.circleBtn}><Ionicons name="key" size={22} color={ICON_MAIN} /></View>
            <Text style={styles.circleLabel}>Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleItem} onPress={confirmSignOut} activeOpacity={0.85}>
            <View style={styles.circleBtn}><Ionicons name="log-out-outline" size={24} color={RED} /></View>
            <Text style={styles.circleLabel}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Details */}
          <Text style={styles.sectionLabel}>Details</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="school" label="School" value={p.school || '—'} tint={ROW_TINTS[0]} />
            <InfoRow icon="briefcase" label="Subject" value={p.occupation || '—'} tint={ROW_TINTS[1]} />
            <InfoRow icon="mail" label="Email" value={p.email || '—'} tint={ROW_TINTS[2]} isLast />
          </View>

          {/* Appearance */}
          <ThemePicker />
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

function InfoRow({ icon, label, value, isLast, tint }: { icon: any; label: string; value: string; isLast?: boolean; tint?: string }) {
  return (
    <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.infoIcon, { backgroundColor: tint ?? BROWN }]}>
        <Ionicons name={icon} size={15} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

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
  screen: { flex: 1, backgroundColor: CREAM },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  scrollContent: { paddingBottom: 40 },

  // top banner
  top: {
    backgroundColor: HERO_BG, alignItems: 'center', overflow: 'hidden',
    borderBottomLeftRadius: 46, borderBottomRightRadius: 46,
    paddingTop: 26, paddingBottom: 58, paddingHorizontal: 20,
  },
  shapeA: { position: 'absolute', width: 140, height: 140, borderRadius: 30, right: -40, top: -30, backgroundColor: 'rgba(255,255,255,0.13)', transform: [{ rotate: '25deg' }] },
  shapeB: { position: 'absolute', width: 100, height: 100, borderRadius: 26, left: -30, bottom: 30, backgroundColor: 'rgba(255,255,255,0.13)', transform: [{ rotate: '25deg' }] },
  avatarRing: {
    width: 104, height: 104, borderRadius: 52, backgroundColor: '#fff', alignItems: 'center',
    justifyContent: 'center', borderWidth: 4, borderColor: RING, marginBottom: 10,
  },
  avatarImage: { width: 94, height: 94, borderRadius: 47 },
  avatarFallback: { backgroundColor: '#F7EBD0', alignItems: 'center', justifyContent: 'center' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: EDIT_FOCUS,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: CREAM,
  },
  name: { fontSize: 22, fontWeight: '900', color: HERO_TEXT, textAlign: 'center' },
  username: { fontSize: 13, color: HERO_SUB, marginTop: 2, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontSize: 10.5, fontWeight: '900', color: HERO_TEXT, letterSpacing: 0.4 },

  // round shortcut buttons
  circleRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: -34, paddingHorizontal: 24 },
  circleItem: { alignItems: 'center', width: 80 },
  circleBtn: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    borderWidth: 1, borderColor: BORDER,
  },
  circleLabel: { fontSize: 11.5, fontWeight: '800', color: BROWN, marginTop: 7 },

  body: { paddingHorizontal: 16, paddingTop: 22 },
  sectionLabel: {
    fontSize: 13, fontWeight: '800', color: BROWN, letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: 10, marginLeft: 4,
  },

  // details list
  infoCard: {
    backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 4, marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.1)', borderStyle: 'dashed',
  },
  infoIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 0.6, textTransform: 'uppercase' },
  infoValue: { fontSize: 14, fontWeight: '700', color: BROWN, marginTop: 1 },

  // edit mode
  editBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  editTitle: { fontSize: 17, fontWeight: '800', color: EDIT_TOP_TEXT },
  cancelText: { fontSize: 14, color: EDIT_CANCEL, fontWeight: '700' },
  saveButton: {
    backgroundColor: EDIT_SAVE_BG, borderRadius: 20, paddingHorizontal: 20,
    paddingVertical: 8, minWidth: 68, alignItems: 'center',
  },
  saveButtonText: { color: EDIT_SAVE_TEXT, fontSize: 14, fontWeight: '800' },
  editContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  editAvatarBlock: { alignItems: 'center', marginTop: 6, marginBottom: 12 },
  changePhotoText: { color: EDIT_FOCUS, fontWeight: '800', fontSize: 13 },

  formCard: {
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, marginBottom: 20,
  },
  formFieldRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.1)' },
  formLabel: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 0.4, marginBottom: 4, textTransform: 'uppercase',
  },
  formInput: { fontSize: 15, fontWeight: '600', color: BROWN, padding: 0 },

  errorText: { fontSize: 14, color: MUTED, textAlign: 'center', marginBottom: 16 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: CARD_BG },
  retryButtonText: { color: BROWN, fontWeight: '700' },
});
