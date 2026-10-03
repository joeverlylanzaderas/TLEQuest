import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// ⚠️ MOCK DATA — for demo purposes only, no backend connection.
// Replace with getMyQuests() from src/api/quests once wired live.
const MOCK_QUESTS = [
  { id: '1', title: 'Basic Table Setting', description: 'Learn the fundamentals of basic table setting for casual dining.', classes: [{ label: 'TLE1 - A', color: '#93C5FD' }, { label: 'TLE1 - B', color: '#86EFAC' }], assigned: '2026-07-15', due: '2026-07-30' },
  { id: '2', title: 'Basic Table Setting', description: 'Learn the fundamentals of basic table setting for casual dining.', classes: [{ label: 'TLE1 - A', color: '#93C5FD' }, { label: 'TLE1 - B', color: '#86EFAC' }], assigned: '2026-07-15', due: '2026-07-30' },
  { id: '3', title: 'Formal Dinner Setup', description: 'Advanced table setting for multi-course formal dining events.', classes: [{ label: 'TLE1 - A', color: '#93C5FD' }], assigned: '2026-08-01', due: '2026-08-15' },
  { id: '4', title: 'Napkin Folding Basics', description: 'Introduction to decorative napkin folding techniques.', classes: [{ label: 'TLE1 - B', color: '#86EFAC' }], assigned: '2026-08-05', due: '2026-08-20' },
];

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const GREEN = '#22C55E';

export default function TeacherQuestLibrary() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={20} color={BROWN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeSmall}>Welcome back,</Text>
            <Text style={styles.welcomeName}>Ms. Armada!</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.dateText}>Monday, 23 July</Text>
            <Text style={styles.classText}>Teacher's Portal</Text>
          </View>
          <Ionicons name="notifications" size={20} color={BROWN} style={{ marginLeft: 8 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleRow}>
          <Ionicons name="arrow-back" size={20} color={BROWN} />
          <Text style={styles.pageTitle}>Quest Library</Text>
        </View>

        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.createButtonText}>Create New Quest</Text>
        </TouchableOpacity>

        {MOCK_QUESTS.map((quest) => (
          <TouchableOpacity
            key={quest.id}
            style={styles.questCard}
            onPress={() => router.push(`/(teacher)/quest/${quest.id}` as any)}
          >
            <Text style={styles.questTitle}>{quest.title}</Text>
            <Text style={styles.questDescription}>{quest.description}</Text>

            <View style={styles.classBadgeRow}>
              {quest.classes.map((c, idx) => (
                <View key={idx} style={[styles.classBadge, { backgroundColor: c.color }]}>
                  <Text style={styles.classBadgeText}>{c.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={13} color="#8A6A2A" />
              <Text style={styles.dateLabel}>Assigned: {quest.assigned}</Text>
              <Ionicons name="time-outline" size={13} color="#8A6A2A" style={{ marginLeft: 12 }} />
              <Text style={styles.dateLabel}>Due: {quest.due}</Text>
            </View>
          </TouchableOpacity>
        ))}
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: BROWN },

  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: GREEN, borderRadius: 14, paddingVertical: 14, marginBottom: 18 },
  createButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  questCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  questTitle: { fontSize: 15, fontWeight: '800', color: '#ea580c', marginBottom: 4 },
  questDescription: { fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 17 },
  classBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  classBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  classBadgeText: { fontSize: 11, fontWeight: '700', color: '#1e3a5f' },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateLabel: { fontSize: 11, color: '#8A6A2A', marginLeft: 4 },
});