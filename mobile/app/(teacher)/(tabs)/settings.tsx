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
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../../src/context/AuthContext';
import { getMyProfile, updateMyProfile } from '../../../src/api/accounts';
import { FullUser, ProfileUpdatePayload } from '../../../src/types/accounts';
import { getMediaUrl } from '../../../src/utils/media';

// ============================================================================
// COLOR PALETTE — same as login/student profile, so the app feels consistent.
// ============================================================================
const CREAM = '#F2E4C4';
const FIELD_BG = '#F5B921';
const CARD_BG = '#F9C544';
const BROWN = '#3A2B1A';

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
            enabled={!isEditing}
          />
        }
      >
        {/* ---------------- Top bar: title + edit toggle ---------------- */}
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>Settings</Text>
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

        {/* ---------------- Profile overview card ---------------- */}
        <View style={styles.overviewCard}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={isEditing ? handlePickPhoto : undefined}
            activeOpacity={isEditing ? 0.7 : 1}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={36} color={BROWN} />
              </View>
            )}
            {isEditing && (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={13} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {!isEditing && (
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{fullName}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>TEACHER</Text>
                </View>
              </View>
              <Text style={styles.subInfo}>@{profile.username}</Text>
              <Text style={styles.subInfo}>
                Joined {new Date(profile.date_joined).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>

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
            <FormField label="Occupation / Subject" value={fields.occupation} onChangeText={(v) => updateField('occupation', v)} isLast />
          </View>
        ) : (
          <View style={styles.infoCard}>
            <InfoRow icon="school" label="School" value={p.school || '—'} />
            <InfoRow icon="briefcase" label="Subject" value={p.occupation || '—'} />
            <InfoRow icon="mail" label="Email" value={p.email || '—'} />
          </View>
        )}

        {/* ---------------- Settings actions ---------------- */}
        {!isEditing && (
          <>
            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => router.push({ pathname: '/change-password', params: { from: '/(teacher)/(tabs)/settings' } })}
              >
                <Ionicons name="key-outline" size={18} color={BROWN} />
                <Text style={styles.actionRowText}>Change Password</Text>
                <Ionicons name="chevron-forward" size={18} color="#B8A671" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
              <Ionicons name="log-out-outline" size={18} color="#B3261E" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={BROWN} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    minHeight: 36,
  },
  screenTitle: { fontSize: 22, fontWeight: '800', color: BROWN },
  editIconButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD_BG,
  },
  editIconText: { fontSize: 13, fontWeight: '700', color: BROWN },
  editActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBarButton: { paddingHorizontal: 8, paddingVertical: 8 },
  cancelText: { fontSize: 14, color: '#8A6A2A', fontWeight: '600' },
  saveButton: {
    backgroundColor: '#5C3A2E', borderRadius: 20, paddingHorizontal: 20,
    paddingVertical: 8, minWidth: 64, alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  overviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EADEC9',
    padding: 16,
    marginBottom: 20,
  },
  avatarWrapper: { position: 'relative' },
  avatarImage: { width: 72, height: 72, borderRadius: 36, backgroundColor: FIELD_BG },
  avatarFallback: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: FIELD_BG,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12,
    backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 17, fontWeight: '800', color: BROWN },
  roleBadge: {
    backgroundColor: '#FCECD6', borderWidth: 1, borderColor: '#EADEC9',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '800', color: BROWN, letterSpacing: 0.5 },
  subInfo: { fontSize: 12, color: '#8A6A2A', marginTop: 2 },

  infoCard: {
    backgroundColor: CARD_BG, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.1)',
  },
  infoIcon: { marginRight: 10 },
  infoLabel: { fontSize: 13, color: '#8A6A2A', width: 90 },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '600', color: BROWN, textAlign: 'right' },

  formCard: { backgroundColor: CARD_BG, borderRadius: 20, paddingHorizontal: 16, marginBottom: 20 },
  formFieldRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(58,43,26,0.1)' },
  formLabel: {
    fontSize: 11, fontWeight: '700', color: '#8A6A2A',
    letterSpacing: 0.4, marginBottom: 4, textTransform: 'uppercase',
  },
  formInput: { fontSize: 15, fontWeight: '600', color: BROWN, padding: 0 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#8A6A2A',
    letterSpacing: 0.5, marginBottom: 8, marginLeft: 4,
  },
  actionsCard: {
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1,
    borderColor: '#EADEC9', marginBottom: 16, overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  actionRowText: { flex: 1, fontSize: 14, fontWeight: '600', color: BROWN },

  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 30, backgroundColor: '#FDE4E1',
  },
  signOutText: { color: '#B3261E', fontSize: 15, fontWeight: '700' },

  errorText: { fontSize: 14, color: '#8A6A2A', textAlign: 'center', marginBottom: 16 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: CARD_BG },
  retryButtonText: { color: BROWN, fontWeight: '700' },
});