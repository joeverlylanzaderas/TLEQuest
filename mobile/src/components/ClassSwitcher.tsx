// mobile/src/components/ClassSwitcher.tsx
// Row of chips to switch between classes. Hidden when the student has only one class.
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useClassScope, selectClass } from '../utils/selectedClass';
import { T, activeTheme } from '../theme/theme';

const GOLD = T('#F5B921');
const BROWN = T('#5C2C16');
// School theme: blue chip with white text. Default theme: gold chip with brown text.
const ACTIVE_BG = activeTheme === 'school' ? '#1E4D8F' : GOLD;
const ACTIVE_TEXT = activeTheme === 'school' ? '#FFFFFF' : BROWN;

export default function ClassSwitcher() {
  const { classes, selectedId } = useClassScope();
  if (classes.length < 2) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {classes.map((c) => {
          const active = c.id === selectedId;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => selectClass(c.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {c.class_name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 4 },
  row: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2D5B5', maxWidth: 200,
  },
  chipActive: { backgroundColor: ACTIVE_BG, borderColor: ACTIVE_BG },
  chipText: { fontSize: 13, fontWeight: '600', color: BROWN },
  chipTextActive: { color: ACTIVE_TEXT, fontWeight: '800' },
});