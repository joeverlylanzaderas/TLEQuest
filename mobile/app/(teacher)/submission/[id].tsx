// mobile/app/(teacher)/submission/[id].tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Image, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getSubmission, reviewSubmission } from '../../../src/api/submissions';
import { Submission } from '../../../src/types/submissions';

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const GREEN = '#22C55E';
const ORANGE = '#EA580C';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
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
      Alert.alert('Saved', 'Your review was sent to the students.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', errorText(e, 'Could not save your review.'));
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

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={20} color={BROWN} />
          <Text style={styles.headerTitle}>Review Submission</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => setZoom(true)} activeOpacity={0.9}>
          <Image source={{ uri: submission.image_url }} style={styles.photo} />
          <View style={styles.zoomHint}>
            <Ionicons name="expand-outline" size={14} color="#fff" />
            <Text style={styles.zoomHintText}>Tap to enlarge</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.questTitle}>{submission.quest_title}</Text>
          <Text style={styles.meta}>{submission.group_name} • submitted by {submission.student_username}</Text>
          <Text style={styles.meta}>{formatDateTime(submission.submitted_at)}</Text>

          <View style={styles.aiBox}>
            <Text style={styles.aiLabel}>AI RESULT</Text>
            <View style={styles.aiRow}>
              <Ionicons name={accepted ? 'checkmark-circle' : 'time'} size={26} color={accepted ? GREEN : ORANGE} />
              <Text style={[styles.aiResult, { color: accepted ? GREEN : ORANGE }]}>
                {submission.classifier_result}
              </Text>
              <Text style={styles.aiConfidence}>{(submission.confidence_score * 100).toFixed(1)}%</Text>
            </View>
            {submission.confidence_score === 0 && (
              <Text style={styles.aiNote}>
                Confidence 0% means the AI could not run on the student's device. Please check the photo yourself.
              </Text>
            )}
            <Text style={styles.aiNote}>The AI is only a first check. Your judgment is the final decision.</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>RATING (OPTIONAL)</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(rating === n ? 0 : n)} hitSlop={6}>
                <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={34} color={GOLD} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>FEEDBACK</Text>
          <TextInput
            style={styles.input}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="What did the group do well? What should they fix?"
            multiline
          />

          {submission.is_reviewed && (
            <Text style={styles.reviewedNote}>
              Reviewed {submission.reviewed_at ? formatDateTime(submission.reviewed_at) : ''}
              {submission.reviewed_by_username ? ` by ${submission.reviewed_by_username}` : ''}. You can update it.
            </Text>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{submission.is_reviewed ? 'Update Review' : 'Send Review'}</Text>
            )}
          </TouchableOpacity>
        </View>
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

  header: { backgroundColor: GOLD, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: BROWN },

  content: { padding: 20, paddingBottom: 60 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 18, backgroundColor: '#EADEC9' },
  zoomHint: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  zoomHintText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  infoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 14 },
  questTitle: { fontSize: 16, fontWeight: '800', color: '#7c2d12' },
  meta: { fontSize: 12, color: '#8A6A2A', marginTop: 3 },

  aiBox: { backgroundColor: '#FFF7D6', borderRadius: 12, padding: 12, marginTop: 14 },
  aiLabel: { fontSize: 10, fontWeight: '800', color: '#8A6A2A', letterSpacing: 0.5, marginBottom: 6 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiResult: { fontSize: 18, fontWeight: '900', flex: 1 },
  aiConfidence: { fontSize: 14, fontWeight: '800', color: BROWN },
  aiNote: { fontSize: 11, color: '#8A6A2A', marginTop: 8, lineHeight: 16 },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#8A6A2A', letterSpacing: 0.5, marginBottom: 8 },
  starRow: { flexDirection: 'row', gap: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#EADEC9', borderRadius: 12, padding: 12, fontSize: 14, color: BROWN, minHeight: 110, textAlignVertical: 'top' },
  reviewedNote: { fontSize: 11, color: '#8A6A2A', marginTop: 10, fontStyle: 'italic' },
  saveButton: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  zoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  zoomImage: { width: '100%', height: '85%' },
});