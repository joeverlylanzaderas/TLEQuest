// mobile/app/(student)/(tabs)/submissions.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, Image, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getSubmissions } from '../../../src/api/submissions';
import { Submission } from '../../../src/types/submissions';
import AppHeader from '../../../src/components/AppHeader';

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const GREEN = '#22C55E';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= rating ? 'star' : 'star-outline'} size={16} color={GOLD} />
      ))}
    </View>
  );
}

export default function StudentSubmissions() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [zoomUri, setZoomUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setSubmissions(await getSubmissions());
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not load your submissions.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setIsLoading(false));
    }, [load])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }


  return (
    <View style={styles.screen}>
      <AppHeader role="student" />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BROWN} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BROWN} />}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.pageTitle}>SUBMISSIONS</Text>

          {submissions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="camera-outline" size={32} color="#B8A671" />
              <Text style={styles.emptyTitle}>No submissions yet</Text>
              <Text style={styles.emptyText}>
                When your group leader submits your final output, it will show up here with your teacher's feedback.
              </Text>
            </View>
          ) : (
            submissions.map((s) => {
              const accepted = s.classifier_result === 'ACCEPTED';
              return (
                <View key={s.id} style={styles.card}>
                  <TouchableOpacity onPress={() => setZoomUri(s.image_url)} activeOpacity={0.85}>
                    <Image source={{ uri: s.image_url }} style={styles.photo} />
                  </TouchableOpacity>

                  <View style={styles.cardBody}>
                    <Text style={styles.questTitle} numberOfLines={2}>{s.quest_title}</Text>
                    <Text style={styles.meta}>
                      {s.group_name} • by {s.student_username} • {formatDateTime(s.submitted_at)}
                    </Text>

                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, { backgroundColor: accepted ? '#DCFCE7' : '#FFEDD5' }]}>
                        <Text style={[styles.badgeText, { color: accepted ? '#166534' : '#9A3412' }]}>
                          AI: {s.classifier_result}
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: s.is_reviewed ? '#DBEAFE' : '#F3F4F6' }]}>
                        <Text style={[styles.badgeText, { color: s.is_reviewed ? '#1E40AF' : '#6B7280' }]}>
                          {s.is_reviewed ? 'Reviewed' : 'Waiting for teacher'}
                        </Text>
                      </View>
                    </View>

                    {s.generated_feedback ? <Text style={styles.aiFeedback}>{s.generated_feedback}</Text> : null}

                    {s.is_reviewed && (
                      <View style={styles.teacherBox}>
                        <View style={styles.teacherTop}>
                          <Text style={styles.teacherLabel}>TEACHER FEEDBACK</Text>
                          {s.teacher_rating ? <Stars rating={s.teacher_rating} /> : null}
                        </View>
                        <Text style={styles.teacherText}>
                          {s.teacher_feedback || 'Your teacher reviewed this without a written comment.'}
                        </Text>
                        {s.reviewed_by_username ? (
                          <Text style={styles.reviewedBy}>by {s.reviewed_by_username}</Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={zoomUri !== null} transparent animationType="fade" onRequestClose={() => setZoomUri(null)}>
        <TouchableOpacity style={styles.zoomOverlay} activeOpacity={1} onPress={() => setZoomUri(null)}>
          {zoomUri && <Image source={{ uri: zoomUri }} style={styles.zoomImage} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: GOLD, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  welcomeSmall: { fontSize: 12, color: BROWN, opacity: 0.8 },
  welcomeName: { fontSize: 16, fontWeight: '800', color: BROWN },
  dateText: { fontSize: 11, color: BROWN, fontWeight: '600' },
  classText: { fontSize: 11, color: BROWN, fontWeight: '700', marginTop: 2 },
  bellDot: { position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },

  scrollContent: { padding: 20, paddingBottom: 60 },
  errorText: { color: '#B3261E', marginBottom: 12, fontSize: 13 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: GREEN, textAlign: 'center', marginBottom: 16, letterSpacing: 1 },

  emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: BROWN },
  emptyText: { color: '#8A6A2A', fontSize: 13, textAlign: 'center', lineHeight: 19 },

  card: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', marginBottom: 16 },
  photo: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#EADEC9' },
  cardBody: { padding: 14 },
  questTitle: { fontSize: 15, fontWeight: '800', color: '#7c2d12' },
  meta: { fontSize: 11, color: '#8A6A2A', marginTop: 3 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  aiFeedback: { fontSize: 12, color: '#666', marginTop: 10, lineHeight: 18 },

  teacherBox: { backgroundColor: '#FFF7D6', borderRadius: 12, padding: 12, marginTop: 12 },
  teacherTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  teacherLabel: { fontSize: 10, fontWeight: '800', color: '#8A6A2A', letterSpacing: 0.5 },
  teacherText: { fontSize: 13, color: BROWN, lineHeight: 19 },
  reviewedBy: { fontSize: 11, color: '#8A6A2A', marginTop: 6, fontStyle: 'italic' },

  zoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  zoomImage: { width: '100%', height: '80%' },
});