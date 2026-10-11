// mobile/src/components/CoverPhotoPicker.tsx
// Teacher picks a cover photo (gallery or camera); it is uploaded right away and
// the Cloudinary URL is handed back through onChange. '' means "no cover".
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { uploadCoverPhoto } from '../api/cloudinary';
import QuestCover from './QuestCover';

interface Props {
  value: string;
  onChange: (url: string) => void;
}

export default function CoverPhotoPicker({ value, onChange }: Props) {
  const [busy, setBusy] = useState(false);

  async function pick(source: 'gallery' | 'camera') {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', `Please allow access to your ${source === 'camera' ? 'camera' : 'photos'}.`);
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]?.uri) return;

    setBusy(true);
    try {
      onChange(await uploadCoverPhoto(result.assets[0].uri));
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not upload the photo. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function chooseSource() {
    Alert.alert('Cover photo', 'Where do you want to get the photo from?', [
      { text: 'Choose from gallery', onPress: () => pick('gallery') },
      { text: 'Take a photo', onPress: () => pick('camera') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View>
      <TouchableOpacity activeOpacity={0.85} onPress={chooseSource} disabled={busy}>
        <QuestCover url={value} style={styles.preview} iconSize={34} />
        {busy && (
          <View style={styles.busy}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.busyText}>Uploading...</Text>
          </View>
        )}
        {!busy && (
          <View style={styles.badge}>
            <Ionicons name="camera" size={14} color="#fff" />
            <Text style={styles.badgeText}>{value ? 'Change photo' : 'Add cover photo'}</Text>
          </View>
        )}
      </TouchableOpacity>
      {value ? (
        <TouchableOpacity onPress={() => onChange('')} disabled={busy} style={styles.remove}>
          <Text style={styles.removeText}>Remove cover photo</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14 },
  badge: {
    position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(58,43,26,0.85)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  busy: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  busyText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  remove: { alignSelf: 'flex-start', marginTop: 8 },
  removeText: { color: '#B3261E', fontSize: 12, fontWeight: '700' },
});
