// mobile/src/components/ThemePicker.tsx
// Two theme cards. Used in the student Profile and the teacher Settings screen.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { T, activeTheme, saveTheme, ThemeKey } from '../theme/theme';
import { reloadApp } from '../theme/reload';

const OPTIONS: { key: ThemeKey; name: string; header: string; page: string; button: string; buttonText: string }[] = [
  { key: 'default', name: 'TLEQuest Default', header: '#F5B921', page: '#F5EDD8', button: '#EA580C', buttonText: '#FFFFFF' },
  { key: 'school', name: 'School Blue', header: '#1E4D8F', page: '#FAF6E8', button: '#18303D', buttonText: '#F2B84B' },
];

export default function ThemePicker() {
  const [selected, setSelected] = useState<ThemeKey>(activeTheme);

  async function choose(key: ThemeKey) {
    if (key === selected) return;
    setSelected(key);
    await saveTheme(key);
    reloadApp();
  }

  return (
    <View style={styles.wrap}>
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