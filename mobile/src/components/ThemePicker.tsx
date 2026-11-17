// mobile/src/components/ThemePicker.tsx
// Two theme cards. Used in the student Profile and the teacher Settings screen.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { T, activeTheme, saveTheme, ThemeKey } from '../theme/theme';
import { reloadApp } from '../theme/reload';

const OPTIONS: { key: ThemeKey; name: string; header: string; page: string; button: string; buttonText: string }[] = [
  { key: 'default', name: 'TLEQuest Default', header: '#F5B921', page: '#F5EDD8', button: '#EA580C', buttonText: '#FFFFFF' },
  { key: 'school', name: 'School Blue', header: '#1E4D8F', page: '#FAF6E8', button: '#18303D', buttonText: '#F2B84B' },
];

export default function ThemePicker() {
  const [selected, setSelected] = useState<ThemeKey>(activeTheme);
  // While the app restarts to apply the theme, cover the screen with the NEW theme's
  // colors so the student never sees a black or half-changed screen.
  const [applying, setApplying] = useState<ThemeKey | null>(null);

  async function choose(key: ThemeKey) {
    if (key === selected || applying) return;
    setSelected(key);
    setApplying(key);
    await saveTheme(key);
    // Give the cover a moment to paint before the app restarts.
    setTimeout(() => { reloadApp(); }, 450);
  }

  const applyingOption = OPTIONS.find((o) => o.key === applying) || null;

  return (
    <View style={styles.wrap}>
      <Modal visible={!!applyingOption} animationType="fade" transparent={false} statusBarTranslucent>
        {applyingOption ? (
          <View style={[styles.cover, { backgroundColor: applyingOption.page }]}>
            <View style={[styles.coverHeader, { backgroundColor: applyingOption.header }]} />
            <View style={styles.coverBody}>
              <ActivityIndicator size="large" color={applyingOption.button} />
              <Text style={[styles.coverText, { color: applyingOption.button }]}>Applying {applyingOption.name}…</Text>
            </View>
          </View>
        ) : null}
      </Modal>
      <Text style={styles.title}>Theme</Text>
      <View style={styles.row}>
        {OPTIONS.map((o) => {
          const isSelected = selected === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => choose(o.key)}
              activeOpacity={0.85}
            >
              <View style={[styles.preview, { backgroundColor: o.page }]}>
                <View style={[styles.previewHeader, { backgroundColor: o.header }]} />
                <View style={[styles.previewButton, { backgroundColor: o.button }]}>
                  <Text style={[styles.previewButtonText, { color: o.buttonText }]}>Button</Text>
                </View>
              </View>
              <Text style={styles.name}>{o.name}</Text>
              {isSelected ? <Text style={styles.selectedTag}>Selected</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { flex: 1 },
  coverHeader: { height: 110 },
  coverBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingBottom: 110 },
  coverText: { fontSize: 15, fontWeight: '800' },
  wrap: { marginTop: 16 },
  title: { fontSize: 13, fontWeight: '800', color: T('#5C2C16'), letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 8, borderWidth: 2, borderColor: 'transparent' },
  cardSelected: { borderColor: '#22C55E' },
  preview: { height: 84, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  previewHeader: { height: 26 },
  previewButton: { alignSelf: 'flex-start', marginTop: 12, marginLeft: 8, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  previewButtonText: { fontSize: 9, fontWeight: '800' },
  name: { fontSize: 12, fontWeight: '800', color: T('#5C2C16'), marginTop: 8, textAlign: 'center' },
  selectedTag: { fontSize: 10, fontWeight: '800', color: '#166534', backgroundColor: '#DCFCE7', alignSelf: 'center', marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
});