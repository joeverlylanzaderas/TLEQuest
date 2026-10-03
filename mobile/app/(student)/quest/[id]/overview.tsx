// mobile/app/(student)/quest/[id]/overview.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// ⚠️ MOCK DATA — for demo purposes only, no backend connection.
// Replace with getProgressDetail(id) from src/api/assignments once wired live.
const MOCK_STEPS = [
  {
    number: 1,
    title: 'Prepare the Table Surface',
    description: 'Start with a clean, level table. Place a tablecloth or placemat as the foundation.',
    status: 'completed',
  },
  {
    number: 2,
    title: 'Position the Dinner Plate',
    description: 'Place the dinner plate in the center, about 1 inch from the table edge.',
    status: 'available',
  },
  {
    number: 3,
    title: 'Arrange the Utensils',
    description: 'Place fork on left, knife and spoon on right. Knife blade faces the plate.',
    status: 'locked',
    unlockHint: 'Complete Step 2 to unlock!',
  },
  {
    number: 4,
    title: 'Position the Napkin',
    description: 'Place the napkin to the left of the fork, or fold decoratively on the plate.',
    status: 'locked',
    unlockHint: 'Complete Step 3 to unlock!',
  },
];

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const CARD_BROWN = '#4A2E1D';
const GREEN = '#22C55E';
const ORANGE = '#EA580C';

export default function QuestOverview() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const completedCount = MOCK_STEPS.filter((s) => s.status === 'completed').length;
  const percent = Math.round((completedCount / MOCK_STEPS.length) * 100);

  function handleStepPress(stepNumber: number) {
    router.push(`/(student)/quest/${id}/step/${stepNumber}` as any);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={20} color={BROWN} />
          <Text style={styles.backTitle}>Quest Overview</Text>
        </TouchableOpacity>

        <View style={styles.currentQuestCard}>
          <View style={styles.imagePlaceholder}>
            <Ionicons name="restaurant" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.questTitle}>One Course Meal Prep</Text>
            <Text style={styles.questMode}>Group Quest</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
            <Text style={styles.percentText}>{percent}%</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {MOCK_STEPS.map((step) => {
          const isLocked = step.status === 'locked';
          const isCompleted = step.status === 'completed';
          return (
            <View key={step.number} style={[styles.stepCard, isLocked && styles.stepCardLocked]}>
              <View style={[styles.stepBadge, isCompleted && styles.stepBadgeCompleted]}>
                <Text style={styles.stepBadgeText}>{step.number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>

                {isLocked ? (
                  <View style={styles.lockedRow}>
                    <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
                    <Text style={styles.unlockHint}>{step.unlockHint}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.stepButton, isCompleted && styles.stepButtonCompleted]}
                    disabled={isCompleted}
                    onPress={() => handleStepPress(step.number)}
                  >
                    <Text style={[styles.stepButtonText, isCompleted && styles.stepButtonTextCompleted]}>
                      {isCompleted ? 'Completed' : 'Complete Step'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  header: { backgroundColor: GOLD, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backTitle: { fontSize: 17, fontWeight: '800', color: BROWN, marginLeft: 8 },

  currentQuestCard: { backgroundColor: CARD_BROWN, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center' },
  imagePlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#8a5a3a', alignItems: 'center', justifyContent: 'center' },
  questTitle: { color: ORANGE, fontSize: 15, fontWeight: '800' },
  questMode: { color: '#fbbf24', fontSize: 11, fontStyle: 'italic', marginBottom: 6 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  percentText: { color: '#fff', fontSize: 10, marginTop: 3 },

  scrollContent: { padding: 20, paddingBottom: 60 },
  stepCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14 },
  stepCardLocked: { backgroundColor: '#EDEDED', opacity: 0.7 },
  stepBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepBadgeCompleted: { backgroundColor: GREEN },
  stepBadgeText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  stepTitle: { fontSize: 14, fontWeight: '800', color: '#7c2d12', marginBottom: 4 },
  stepDescription: { fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 17 },

  stepButton: { alignSelf: 'flex-start', backgroundColor: '#fde68a', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  stepButtonCompleted: { backgroundColor: GREEN },
  stepButtonText: { fontSize: 12, fontWeight: '700', color: BROWN },
  stepButtonTextCompleted: { color: '#fff' },

  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unlockHint: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' },
});