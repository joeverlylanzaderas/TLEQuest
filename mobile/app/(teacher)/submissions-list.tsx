// mobile/app/(teacher)/submissions-list.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SubmissionsListStub() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Submissions List (stub)</Text>
      <Text style={styles.note}>Real submissions list not built yet — navigation confirmed working.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  note: { color: '#666' },
});