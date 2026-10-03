import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../src/context/AuthContext';
import { getMyProfile } from '../../../src/api/accounts';
import { getTeacherDashboardSummary } from '../../../src/api/dashboard';
import { FullUser } from '../../../src/types/accounts';
import { TeacherDashboardSummary } from '../../../src/types/dashboard';
import DashboardHeader from '../../../src/components/DashboardHeader';
import { getUnreadNotifications } from '../../../src/api/notifications';
import { Notification } from '../../../src/types/notifications';

export default function TeacherDashboard() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<FullUser | null>(null);
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([]);

  const loadEverything = useCallback(async () => {
    setError('');
    try {
      const [profileData, summaryData, unreadNotificationsData] = await Promise.all([
        getMyProfile(),
        getTeacherDashboardSummary(),
        getUnreadNotifications(),
      ]);
      setProfile(profileData);
      setSummary(summaryData);
      setUnreadNotifications(unreadNotificationsData);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEverything();
    }, [loadEverything])
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 80 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadEverything} />}
    >
      <DashboardHeader
        firstName={profile?.profile.first_name}
        username={profile?.username || ''}
        profilePicture={profile?.profile.profile_picture}
        subtitle="Teacher's Portal"
        unreadCount={unreadNotifications.length}
        onBellPress={() => router.push('/(teacher)/notifications' as any)}
      />  

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{summary?.student_count ?? 0}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{summary?.class_count ?? 0}</Text>
          <Text style={styles.statLabel}>Classes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{summary?.quest_count ?? 0}</Text>
          <Text style={styles.statLabel}>Quests</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{summary?.group_count ?? 0}</Text>
          <Text style={styles.statLabel}>Groups</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ea580c' }]}
          onPress={() => router.push('/(teacher)/create-quest' as any)}
        >
          <Text style={styles.actionButtonText}>Create{"\n"}Quest</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#16a34a' }]}
          onPress={() => router.push('/(teacher)/manage-classes' as any)}
        >
          <Text style={styles.actionButtonText}>Manage Classes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#dc2626' }]}
          onPress={() => router.push('/(teacher)/submissions-list' as any)}
        >
          <Text style={styles.actionButtonText}>View Submissions</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Class Overview</Text>
      {summary?.classes.length === 0 ? (
        <Text style={styles.emptyText}>No classes yet.</Text>
      ) : (
        summary?.classes.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.classCard}
            onPress={() => router.push(`/(teacher)/class/${c.id}` as any)}
          >
            <Text style={styles.className}>{c.class_name}</Text>
            <View style={styles.classStatsRow}>
              <Text style={styles.classStat}>{c.active_quests} Active Quests</Text>
              <Text style={styles.classStat}>{c.total_groups} Groups</Text>
              <Text style={styles.classStat}>{c.total_students} Students</Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.sectionHeader}>Recent Activity</Text>
      {summary?.recent_activity.length === 0 ? (
        <Text style={styles.emptyText}>Nothing yet.</Text>
      ) : (
        summary?.recent_activity.map((event, idx) => (
          <View key={idx} style={styles.activityRow}>
            <Text style={styles.activityStudent}>{event.student_full_name}</Text>
            <Text style={styles.activityDescription}>{event.description}</Text>
            <Text style={styles.activityTime}>{new Date(event.timestamp).toLocaleString()}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  welcome: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#666' },
  signOutButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fee2e2' },
  signOutText: { color: '#dc2626', fontSize: 12, fontWeight: '600' },
  error: { color: '#dc2626', marginBottom: 12 },
  emptyText: { color: '#999', fontStyle: 'italic', marginBottom: 12 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, marginTop: 16 },
  statCard: {
    backgroundColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#5C2E0E',
  },
  statNumber: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#555' },

  sectionHeader: { fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionButton: { flex: 1, marginHorizontal: 4, padding: 12, borderRadius: 10, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 12, textAlign: 'center' },

  classCard: {
    backgroundColor: '#fef3e2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#5C2E0E',
  },
  className: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  classStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  classStat: { fontSize: 12, color: '#666' },

  activityRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#6c6b692e' },
  activityStudent: { fontWeight: 'bold', color: '#ea580c' },
  activityDescription: { fontSize: 13, color: '#333' },
  activityTime: { fontSize: 11, color: '#999', marginTop: 2 },
});