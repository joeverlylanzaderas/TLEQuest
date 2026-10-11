// mobile/src/components/ReviewStatusNote.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ReviewStatus = 'none' | 'waiting' | 'reviewed';

// Shown once the group's final output was submitted:
//  waiting  -> "Waiting for teacher review"
//  reviewed -> final points + badge were released
export default function ReviewStatusNote({ status }: { status?: ReviewStatus }) {
  if (status !== 'waiting' && status !== 'reviewed') return null;
  const waiting = status === 'waiting';
  return (
    <View style={[styles.box, waiting ? styles.waiting : styles.reviewed]}>
      <Ionicons
        name={waiting ? 'time' : 'checkmark-circle'}
        size={18}
        color={waiting ? '#EA580C' : '#22C55E'}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: waiting ? '#EA580C' : '#15803D' }]}>
          {waiting ? 'Waiting for teacher review' : 'Reviewed by your teacher'}
        </Text>
        <Text style={styles.sub}>
          {waiting
            ? 'Your final points and badge will be added once your teacher sends feedback.'
            : 'Your final points and badge have been added.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1 },
  waiting: { backgroundColor: '#FFF7D6', borderColor: '#F3D98B' },
  reviewed: { backgroundColor: '#ECFDF3', borderColor: '#A7E3BD' },
  title: { fontSize: 13, fontWeight: '800' },
  sub: { fontSize: 11, color: '#666', marginTop: 2, lineHeight: 16 },
});
