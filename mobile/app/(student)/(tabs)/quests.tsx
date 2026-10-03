import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// ⚠️ MOCK DATA — for demo purposes only, no backend connection.
// Replace with getMyProgress() from src/api/assignments once wired live.
const MOCK_QUESTS = [
  { id: '1', title: 'One Course Meal Preparation', mode: 'Individual Quest', status: 'not_started', percent: 0 },
  { id: '2', title: 'One Course Meal Preparation', mode: 'Individual Quest', status: 'in_progress', percent: 45 },
  { id: '3', title: 'One Course Meal Preparation', mode: 'Individual Quest', status: 'in_progress', percent: 70 },
  { id: '4', title: 'Bird of Paradise Fold', mode: 'Individual Quest', status: 'completed', percent: 100 },
  { id: '5', title: 'Formal Dinner Setup', mode: 'Group Quest', status: 'not_started', percent: 0 },
  { id: '6', title: 'Diamond Pouch Making', mode: 'Individual Quest', status: 'in_progress', percent: 50 },
];

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const GREEN = '#22C55E';
const ORANGE = '#EA580C';

type FilterKey = 'all' | 'in_progress' | 'completed' | 'not_started';

export default function StudentQuests() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = MOCK_QUESTS.filter((q) => filter === 'all' || q.status === filter);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `All (${MOCK_QUESTS.length})` },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'not_started', label: 'Not Started' },
  ];

  function statusButton(status: string) {
    if (status === 'completed') return { label: 'Completed', bg: GREEN, textColor: '#fff' };
    if (status === 'in_progress') return { label: 'Continue', bg: GOLD, textColor: BROWN };
    return { label: 'Start Quest', bg: 'transparent', textColor: GREEN, border: GREEN };
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={20} color={BROWN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeSmall}>Welcome back,</Text>
            <Text style={styles.welcomeName}>Hannah!</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.dateText}>Monday, 23 July</Text>
            <Text style={styles.classText}>TLE1 - B</Text>
          </View>
          <Ionicons name="notifications" size={20} color={BROWN} style={{ marginLeft: 8 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.pageTitle}>QUESTS</Text>

        {/* Quest grid */}
        <View style={styles.grid}>
          {filtered.map((quest) => {
            const btn = statusButton(quest.status);
            return (
              <TouchableOpacity
                key={quest.id}
                style={styles.card}
                onPress={() => router.push(`/(student)/quest/${quest.id}/overview` as any)}
              >
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="restaurant" size={28} color="#fff" />
                </View>
                <Text style={styles.cardTitle}>{quest.title}</Text>
                <View style={styles.cardDivider} />
                <View
                  style={[
                    styles.statusButton,
                    { backgroundColor: btn.bg, borderColor: btn.border || 'transparent', borderWidth: btn.border ? 1.5 : 0 },
                  ]}
                >
                  <Text style={[styles.statusButtonText, { color: btn.textColor }]}>{btn.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  header: { backgroundColor: GOLD, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  welcomeSmall: { fontSize: 12, color: BROWN, opacity: 0.8 },
  welcomeName: { fontSize: 16, fontWeight: '800', color: BROWN },
  dateText: { fontSize: 11, color: BROWN, fontWeight: '600' },
  classText: { fontSize: 11, color: BROWN, fontWeight: '700', marginTop: 2 },

  scrollContent: { padding: 20, paddingBottom: 60 },
  filterRow: { flexDirection: 'row', marginBottom: 16 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: 'transparent' },
  filterPillActive: { backgroundColor: ORANGE },
  filterText: { fontSize: 13, fontWeight: '600', color: BROWN },
  filterTextActive: { color: '#fff' },

  pageTitle: { fontSize: 28, fontWeight: '900', color: GREEN, textAlign: 'center', marginBottom: 16, letterSpacing: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 10, marginBottom: 14 },
  imagePlaceholder: { height: 90, borderRadius: 12, backgroundColor: '#B8895C', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#7c2d12', minHeight: 30 },
  cardDivider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  statusButton: { borderRadius: 20, paddingVertical: 8, alignItems: 'center' },
  statusButtonText: { fontSize: 12, fontWeight: '700' },
});