// mobile/app/(student)/(tabs)/home.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../src/context/AuthContext';
import { getMyProfile } from '../../../src/api/accounts';
import { getMyClasses, getClassEnrollments, getClassGroups, joinClass } from '../../../src/api/classrooms';
import { getMyProgress } from '../../../src/api/assignments';
import { getUnreadNotifications } from '../../../src/api/notifications';
import { FullUser } from '../../../src/types/accounts';
import { ClassSummary, ClassEnrollment, Group } from '../../../src/types/classrooms';
import { QuestProgress } from '../../../src/types/assignments';
import { Notification } from '../../../src/types/notifications';
import DashboardHeader from '../../../src/components/DashboardHeader';

const AVATAR_COLORS = ['#f87171', '#4ade80', '#fbbf24', '#60a5fa', '#f472b6', '#fb923c', '#34d399', '#38bdf8'];

export default function StudentHome() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<FullUser | null>(null);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [classmates, setClassmates] = useState<ClassEnrollment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [progress, setProgress] = useState<QuestProgress[]>([]);
  const [selectedClassmate, setSelectedClassmate] = useState<ClassEnrollment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([]);

  // ---- Join class modal ----
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const loadEverything = useCallback(async () => {
    setError('');
    try {
      const [profileData, classesData, progressData, unreadNotificationsData] = await Promise.all([
        getMyProfile(),
        getMyClasses(),
        getMyProgress(),
        getUnreadNotifications(),
      ]);
      setProfile(profileData);
      setClasses(classesData);
      setProgress(progressData);
      setUnreadNotifications(unreadNotificationsData);

      if (classesData.length > 0) {
        const [enrollments, groupsData] = await Promise.all([
          getClassEnrollments(classesData[0].id),
          getClassGroups(classesData[0].id),
        ]);
        setClassmates(enrollments);
        setGroups(groupsData);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEverything();
    }, [loadEverything])
  );

  function openQuest(item: QuestProgress) {
    router.push(`/(student)/quest/${item.id}/overview` as any);
  }

  function classmateDisplayName(c: ClassEnrollment): string {
    return c.student.first_name || c.student.username;
  }

  function findGroupNumberFor(studentId: number): number | null {
    const group = groups.find((g) => g.members.some((m) => m.student.id === studentId));
    return group ? group.group_number : null;
  }

  async function handleJoinClass() {
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code) {
      setJoinError('Please enter an invite code.');
      return;
    }
    setJoinError('');
    setIsJoining(true);
    try {
      await joinClass(code);
      setInviteCodeInput('');
      setShowJoinModal(false);
      await loadEverything(); // refresh classes, progress, classmates with the newly joined class
    } catch (e: any) {
      setJoinError(e?.response?.data?.detail || e?.response?.data?.non_field_errors?.[0] || 'Could not join class. Check the code and try again.');
    } finally {
      setIsJoining(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const currentQuest = progress.find((p) => !p.completed_at) ?? progress[0];

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
        subtitle={classes.length > 0 ? classes[0].class_name : 'No class joined'}
        unreadCount={unreadNotifications.length}
        onBellPress={() => router.push('/(student)/notifications' as any)}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Join class — small link when already in a class, big CTA card when not */}
      {classes.length > 0 ? (
        <TouchableOpacity style={styles.joinLinkRow} onPress={() => setShowJoinModal(true)}>
          <Text style={styles.joinLinkText}>+ Join another class</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.joinClassCard} onPress={() => setShowJoinModal(true)}>
          <Text style={styles.joinClassCardTitle}>No class yet</Text>
          <Text style={styles.joinClassCardSubtitle}>Enter your teacher's invite code to get started</Text>
          <View style={styles.joinClassCardButton}>
            <Text style={styles.joinClassCardButtonText}>Join a Class</Text>
          </View>
        </TouchableOpacity>
      )}

      {currentQuest ? (
        <TouchableOpacity style={styles.currentQuestCard} onPress={() => openQuest(currentQuest)}>
          <Text style={styles.currentQuestLabel}>Your current quest:</Text>
          <Text style={styles.currentQuestTitle}>{currentQuest.quest_title}</Text>
          <Text style={styles.currentQuestMode}>
            {currentQuest.quest_mode === 'group' ? 'Group Quest' : 'Individual Quest'}
          </Text>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${currentQuest.percent_complete}%` }]} />
          </View>
          <Text style={styles.percentText}>{currentQuest.percent_complete}%</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.emptyText}>No quests assigned yet.</Text>
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>People in this class</Text>
      </View>
      {classmates.length === 0 ? (
        <Text style={styles.emptyText}>No classmates yet.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.classmateStrip}
        >
          {classmates.map((c, index) => (
            <TouchableOpacity
              key={c.id}
              style={styles.classmateItem}
              onPress={() => setSelectedClassmate(c)}
            >
              {c.student.profile_picture ? (
                <Image
                  source={{ uri: c.student.profile_picture }}
                  style={styles.classmateAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.classmateAvatarPlaceholder,
                    { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] },
                  ]}
                >
                  <Text style={styles.classmateAvatarInitial}>
                    {classmateDisplayName(c).charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.classmateName} numberOfLines={1}>
                {classmateDisplayName(c)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Assigned Quests</Text>
      </View>
      {progress.length === 0 ? (
        <Text style={styles.emptyText}>No quests assigned yet.</Text>
      ) : (
        progress.map((item) => (
          <TouchableOpacity key={item.id} style={styles.questCard} onPress={() => openQuest(item)}>
            <Text style={styles.questTitle}>{item.quest_title}</Text>
            <Text style={styles.questMode}>
              {item.quest_mode === 'group' ? 'Group Quest' : 'Individual Quest'}
            </Text>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${item.percent_complete}%` }]} />
            </View>
            <Text style={styles.percentText}>{item.percent_complete}%</Text>
          </TouchableOpacity>
        ))
      )}

      {/* Classmate detail modal — unchanged */}
      <Modal
        visible={selectedClassmate !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedClassmate(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedClassmate(null)}
        >
          <View style={styles.modalCard}>
            {selectedClassmate && (
              <>
                {selectedClassmate.student.profile_picture ? (
                  <Image
                    source={{ uri: selectedClassmate.student.profile_picture }}
                    style={styles.modalAvatar}
                  />
                ) : (
                  <View style={styles.modalAvatarPlaceholder}>
                    <Text style={styles.modalAvatarPlaceholderText}>
                      {(selectedClassmate.student.first_name || selectedClassmate.student.username)
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.modalName}>
                  {selectedClassmate.student.first_name} {selectedClassmate.student.last_name}
                </Text>
                <Text style={styles.modalSection}>
                  {selectedClassmate.student.section || 'No section on file'}
                </Text>
                {(() => {
                  const groupNumber = findGroupNumberFor(selectedClassmate.student.id);
                  return (
                    <Text style={styles.modalGroup}>
                      {groupNumber !== null ? `Group ${groupNumber}` : 'Not in a group yet'}
                    </Text>
                  );
                })()}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Join Class modal — new */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalName}>Join a Class</Text>
            <Text style={styles.modalSection}>Enter the invite code your teacher shared</Text>

            <TextInput
              style={styles.joinInput}
              placeholder="e.g. K7XQPM"
              autoCapitalize="characters"
              value={inviteCodeInput}
              onChangeText={setInviteCodeInput}
            />

            {joinError ? <Text style={styles.joinErrorText}>{joinError}</Text> : null}

            <TouchableOpacity style={styles.joinSubmitButton} onPress={handleJoinClass} disabled={isJoining}>
              {isJoining ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinSubmitButtonText}>Join</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setShowJoinModal(false); setJoinError(''); setInviteCodeInput(''); }}
              style={{ marginTop: 10 }}
            >
              <Text style={styles.joinCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#dc2626', marginBottom: 12 },
  emptyText: { color: '#999', fontStyle: 'italic', marginBottom: 12 },

  joinLinkRow: { marginBottom: 4 },
  joinLinkText: { color: '#ea580c', fontSize: 13, fontWeight: '600' },

  joinClassCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#fed7aa',
    borderStyle: 'dashed', padding: 20, alignItems: 'center', marginTop: 12, marginBottom: 8,
  },
  joinClassCardTitle: { fontSize: 15, fontWeight: 'bold', color: '#7c2d12' },
  joinClassCardSubtitle: { fontSize: 12, color: '#8A6A2A', textAlign: 'center', marginTop: 4, marginBottom: 12 },
  joinClassCardButton: { backgroundColor: '#ea580c', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  joinClassCardButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  currentQuestCard: { backgroundColor: '#5b3a29', borderRadius: 16, padding: 16, marginBottom: 20, marginTop: 16 },
  currentQuestLabel: { color: '#fff', opacity: 0.8, fontSize: 12 },
  currentQuestTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  currentQuestMode: { color: '#fbbf24', fontStyle: 'italic', marginBottom: 8 },

  progressBarTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: '#22c55e' },
  percentText: { color: '#fff', marginTop: 4, fontSize: 12 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  sectionHeader: { fontSize: 16, fontWeight: 'bold' },

  classmateStrip: { paddingBottom: 8, paddingRight: 16 },
  classmateItem: { alignItems: 'center', marginRight: 16, width: 60 },
  classmateAvatar: { width: 48, height: 48, borderRadius: 24, marginBottom: 4 },
  classmateAvatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  classmateAvatarInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  classmateName: { fontSize: 11, color: '#444', textAlign: 'center' },

  questCard: { backgroundColor: '#fef3e2', borderRadius: 12, padding: 14, marginBottom: 12 },
  questTitle: { fontSize: 16, fontWeight: 'bold', color: '#7c2d12' },
  questMode: { fontSize: 12, color: '#ea580c', fontStyle: 'italic', marginBottom: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', width: 280 },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  modalAvatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#ea580c',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  modalAvatarPlaceholderText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  modalName: { fontSize: 18, fontWeight: 'bold' },
  modalSection: { fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center' },
  modalGroup: { fontSize: 13, color: '#ea580c', fontWeight: '600', marginTop: 4 },

  joinInput: {
    width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 16, textAlign: 'center', letterSpacing: 2,
    marginTop: 16, fontWeight: '700', color: '#7c2d12',
  },
  joinErrorText: { color: '#dc2626', fontSize: 12, marginTop: 10, textAlign: 'center' },
  joinSubmitButton: {
    width: '100%', backgroundColor: '#ea580c', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginTop: 16,
  },
  joinSubmitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  joinCancelText: { color: '#8A6A2A', fontSize: 13 },
});