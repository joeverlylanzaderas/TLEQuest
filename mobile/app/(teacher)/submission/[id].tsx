// mobile/app/(teacher)/submission/[id].tsx
import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Image, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { T, HEADER_BG, HEADER_TEXT, activeTheme } from '../../../src/theme/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getSubmission, reviewSubmission } from '../../../src/api/submissions';
import { Submission } from '../../../src/types/submissions';
import { useToast } from '../../../src/components/Toast';
import { FadeIn, PressableScale } from '../../../src/components/Motion';

const GOLD = T('#F5B921');
const CREAM = T('#F5EDD8');
const BROWN = T('#5C2C16');
const GREEN = '#22C55E';
const ORANGE = T('#EA580C');

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

const QUICK_NOTES = ['Great job!', 'Neat and tidy', 'Check the edges again', 'Please retake the photo'];

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function errorText(e: any, fallback: string): string {
  const data = e?.response?.data;
  if (data) {
    if (data.detail) return data.detail;
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
  }
  return fallback;
}

export default function SubmissionReview() {
  const router = useRouter();
  const toast = useToast();
  const scrollRef = useRef<ScrollView>(null);
  const { id } = useLocalSearchParams<{ id: string }>();
  const submissionId = Number(id);

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const s = await getSubmission(submissionId);
      setSubmission(s);
      setFeedback(s.teacher_feedback || '');
      setRating(s.teacher_rating || 0);
    } catch (e: any) {
      setError(errorText(e, 'Could not load this submission.'));
    }
  }, [submissionId]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setIsLoading(false));
    }, [load])
  );

  async function handleSave() {
    if (!submission) return;
    if (!feedback.trim() && rating === 0) {
      Alert.alert('Nothing to save', 'Write some feedback or give a star rating first.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await reviewSubmission(submission.id, {
        teacher_feedback: feedback.trim(),
        teacher_rating: rating > 0 ? rating : null,
      });
      setSubmission(updated);
      toast.success('Review sent. Final points and badge released to the group.');
      router.back();
    } catch (e: any) {
      toast.error(errorText(e, 'Could not save your review.'));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  if (!submission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Submission not found.'}</Text>
        <TouchableOpacity style={styles.backPill} onPress={() => router.back()}>
          <Text style={styles.backPillText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const accepted = submission.classifier_result === 'ACCEPTED';
  const confidence = Math.round(submission.confidence_score * 100);

  function addQuickNote(text: string) {
    setFeedback((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={20} color={BROWN} />
          <Text style={styles.headerTitle}>Review</Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FadeIn>
          <View style={styles.card}>
            {/* Who + what */}
            <View style={styles.whoRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{submission.student_username.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.who} numberOfLines={1}>{submission.student_username}</Text>
                <Text style={styles.meta} numberOfLines={1}>{submission.quest_title} · {submission.group_name}</Text>
              </View>
              <Text style={styles.timeText}>{timeAgo(submission.submitted_at)}</Text>
            </View>

            {/* Photo with the AI check on top */}
            <TouchableOpacity onPress={() => setZoom(true)} activeOpacity={0.9}>
              <Image source={{ uri: submission.image_url }} style={styles.photo} />
              <View style={[styles.aiChip, { backgroundColor: accepted ? '#fff' : '#FFF7ED' }]}>
                <Ionicons name={accepted ? 'sparkles' : 'alert-circle'} size={14} color={accepted ? '#166B3A' : '#A34A0A'} />
                <Text style={[styles.aiChipText, { color: accepted ? '#166B3A' : '#A34A0A' }]}>
                  {submission.confidence_score === 0
                    ? 'AI could not check this photo'
                    : `AI check: ${accepted ? 'looks correct' : 'needs a look'} · ${confidence}%`}
                </Text>
              </View>
              <View style={styles.zoomHint}>
                <Ionicons name="expand-outline" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.aiNote}>
              {submission.confidence_score === 0
                ? "The AI could not run on the student's device, so please check the photo yourself."
                : 'The AI is only a first check. Your judgment is the final decision.'}
            </Text>
          </View>
        </FadeIn>

        <FadeIn delay={120}>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>RATING (OPTIONAL)</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(rating === n ? 0 : n)} hitSlop={6}>
                  <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={34} color={GOLD} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>NOTE FOR THE GROUP</Text>
            <View style={styles.quickRow}>
              {QUICK_NOTES.map((q) => (
                <TouchableOpacity key={q} style={styles.quickChip} onPress={() => addQuickNote(q)} activeOpacity={0.7}>
                  <Text style={styles.quickText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="What did the group do well? What should they fix?"
              placeholderTextColor="#B8A671"
              multiline
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250)}
            />

            {submission.is_reviewed && (
              <Text style={styles.reviewedNote}>
                Reviewed {submission.reviewed_at ? formatDateTime(submission.reviewed_at) : ''}
                {submission.reviewed_by_username ? ` by ${submission.reviewed_by_username}` : ''}. You can update it.
              </Text>
            )}

            <PressableScale
              containerStyle={{ marginTop: 16 }}
              style={styles.saveButton}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>{submission.is_reviewed ? 'Update review' : 'Send review'}</Text>
                </>
              )}
            </PressableScale>
          </View>
        </FadeIn>
      </ScrollView>

      <Modal visible={zoom} transparent animationType="fade" onRequestClose={() => setZoom(false)}>
        <TouchableOpacity style={styles.zoomOverlay} activeOpacity={1} onPress={() => setZoom(false)}>
          <Image source={{ uri: submission.image_url }} style={styles.zoomImage} resizeMode="contain" />
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM, padding: 24 },
  errorText: { color: '#B3261E', marginBottom: 16, textAlign: 'center' },
  backPill: { backgroundColor: BROWN, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  backPillText: { color: '#fff', fontWeight: '700' },

  header: { backgroundColor: HEADER_BG, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: BROWN },

  content: { padding: 16, paddingBottom: 60, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 14, gap: 12 },
  whoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F7C9C0', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#7A2E1F', fontSize: 17, fontWeight: '800' },
  who: { fontSize: 15, fontWeight: '800', color: BROWN },
  meta: { fontSize: 12, color: T('#8A6A2A'), marginTop: 1 },
  timeText: { fontSize: 11, color: '#999' },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: T('#EADEC9') },
  aiChip: { position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  aiChipText: { fontSize: 12, fontWeight: '700' },
  zoomHint: { position: 'absolute', right: 10, bottom: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  aiNote: { fontSize: 11, color: T('#8A6A2A'), lineHeight: 16 },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: T('#8A6A2A'), letterSpacing: 0.8 },
  starRow: { flexDirection: 'row', gap: 6 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: { backgroundColor: '#FFF1C7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  quickText: { fontSize: 12, fontWeight: '700', color: BROWN },
  input: { backgroundColor: CREAM, borderWidth: 1, borderColor: T('#EADEC9'), borderRadius: 14, padding: 12, fontSize: 14, color: BROWN, minHeight: 100, textAlignVertical: 'top' },
  reviewedNote: { fontSize: 11, color: T('#8A6A2A'), fontStyle: 'italic' },
  saveButton: { flexDirection: 'row', gap: 6, backgroundColor: '#166B3A', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  zoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  zoomImage: { width: '100%', height: '85%' },
});