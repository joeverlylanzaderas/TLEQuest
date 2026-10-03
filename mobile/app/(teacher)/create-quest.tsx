// mobile/app/(teacher)/create-quest.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CreateQuestStub() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Quest (stub)</Text>
      <Text style={styles.note}>Real quest builder not built yet — navigation confirmed working.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  note: { color: '#666' },
});