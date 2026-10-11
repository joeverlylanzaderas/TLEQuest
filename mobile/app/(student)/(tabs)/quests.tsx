// mobile/app/(student)/(tabs)/quests.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyProgress } from '../../../src/api/assignments';
import { QuestProgress } from '../../../src/types/assignments';
import ReviewStatusNote from '../../../src/components/ReviewStatusNote';
import AppHeader from '../../../src/components/AppHeader';
import QuestCover from '../../../src/components/QuestCover';

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const GREEN = '#22C55E';
const ORANGE = '#EA580C';

type StatusKey = 'in_progress' | 'completed' | 'not_started';
type FilterKey = 'all' | StatusKey;

function statusOf(p: QuestProgress): StatusKey {
  if (p.completed_at || p.percent_complete >= 100) return 'completed';
  // Ticked some items but finished no step yet still has step_completions rows
  if (p.percent_complete > 0 || p.step_completions.length > 0) return 'in_progress';
  return 'not_started';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= rating ? 'star' : 'star-outline'} size={14} color={GOLD} />
      ))}
    </View>
  );
}

export default function StudentQuests() {
  const router = useRouter();
  const [progress, setProgress] = useState<QuestProgress[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setProgress(await getMyProgress());
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not load your quests.');
    }
  }, []);

  // Refetch every time the tab regains focus, so ticks made in Step Details show up here
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

  const filtered = progress.filter((p) => filter === 'all' || statusOf(p) === filter);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `All (${progress.length})` },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'not_started', label: 'Not Started' },
  ];

  function statusButton(status: StatusKey) {
    if (status === 'completed') return { label: 'Completed', bg: GREEN, textColor: '#fff', border: undefined };
    if (status === 'in_progress') return { label: 'Continue', bg: GOLD, textColor: BROWN, border: undefined };
    return { label: 'Start Quest', bg: 'transparent', textColor: GREEN, border: GREEN };
  }


  return (
    <View style={styles.screen}>
      {/* Header */}
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

          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>
              {progress.length === 0 ? 'No quests assigned yet.' : 'No quests in this category.'}
            </Text>
          ) : (
            <View style={styles.grid}>
              {filtered.map((item) => {
                const status = statusOf(item);
                const btn = statusButton(status);
                const isDone = status === 'completed';
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.card, isDone && styles.cardWide]}
                    // item.id is the QuestProgress id, which the Overview screen expects
                    onPress={() => router.push(`/(student)/quest/${item.id}/overview` as any)}
                  >
                    <View style={isDone ? styles.wideTop : undefined}>
                      <QuestCover
                        url={item.quest_cover_image_url}
                        style={[styles.imagePlaceholder, isDone && styles.imageSmall]}
                        iconSize={isDone ? 22 : 28}
                      />
                      <View style={isDone ? { flex: 1 } : undefined}>
                        <Text style={styles.cardTitle} numberOfLines={2}>{item.quest_title}</Text>
                        {isDone && item.reviewed_at ? (
                          <Text style={styles.reviewedDate}>Reviewed {formatDate(item.reviewed_at)}</Text>
                        ) : null}
                      </View>
                    </View>

                    {isDone && (
                      <>
                        <View style={styles.awardsRow}>
                          <View style={styles.pointsPill}>
                            <Text style={styles.pointsPillText}>+{item.points_earned} pts</Text>
                          </View>
                          {item.badge_earned && (
                            <View style={styles.badgePill}>
                              <Ionicons name="ribbon" size={14} color="#fff" />
                              <Text style={styles.badgePillText}>Badge</Text>
                            </View>
                          )}
                        </View>

                        {item.review_status === 'reviewed' ? (
                          <View style={styles.feedbackBox}>
                            <View style={styles.feedbackHeader}>
                              <Text style={styles.feedbackLabel}>TEACHER FEEDBACK</Text>
                              {item.teacher_rating ? <Stars rating={item.teacher_rating} /> : null}
                            </View>
                            <Text style={styles.feedbackText}>
                              {item.teacher_feedback?.trim() || 'No written feedback.'}
                            </Text>
                          </View>
                        ) : (
                          <ReviewStatusNote status={item.review_status === 'waiting' ? 'waiting' : undefined} />
                        )}
                      </>
                    )}

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
          )}
        </ScrollView>
      )}
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
  emptyText: { color: '#8A6A2A', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },

  filterRow: { flexDirection: 'row', marginBottom: 16 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: 'transparent' },
  filterPillActive: { backgroundColor: ORANGE },
  filterText: { fontSize: 13, fontWeight: '600', color: BROWN },
  filterTextActive: { color: '#fff' },

  pageTitle: { fontSize: 28, fontWeight: '900', color: GREEN, textAlign: 'center', marginBottom: 16, letterSpacing: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 10, marginBottom: 14 },
  imagePlaceholder: { height: 90, borderRadius: 12, backgroundColor: '#B8895C', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cardWide: { width: '100%' },
  wideTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  imageSmall: { width: 52, height: 52, marginBottom: 0 },
  reviewedDate: { fontSize: 11, color: '#8A6A2A', marginTop: 2 },
  awardsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  pointsPill: { backgroundColor: GOLD, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  pointsPillText: { color: BROWN, fontWeight: '800', fontSize: 12 },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ORANGE, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  badgePillText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  feedbackBox: { backgroundColor: '#FFF7D6', borderRadius: 12, padding: 12, marginTop: 10 },
  feedbackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  feedbackLabel: { fontSize: 10, fontWeight: '800', color: '#8A6A2A', letterSpacing: 0.5 },
  feedbackText: { fontSize: 13, color: BROWN, lineHeight: 18 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#7c2d12', minHeight: 30 },
  cardDivider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  statusButton: { borderRadius: 20, paddingVertical: 8, alignItems: 'center' },
  statusButtonText: { fontSize: 12, fontWeight: '700' },
});