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
import { Group, ClassmateStudent } from '../../../src/types/classrooms';
import { getMyClasses, getClassGroups } from '../../../src/api/classrooms';
import { CONFIDENCE_THRESHOLD } from '../../../src/ml/classifier';
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

const QUICK_NOTES = ['Great job!', 'Neat and tidy', 'Check the edges again'];

function fullName(st: Pick<ClassmateStudent, 'first_name' | 'last_name' | 'username'>): string {
  return [st.first_name, st.last_name].filter(Boolean).join(' ').trim() || st.username;
}

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
  const [group, setGroup] = useState<Group | null>(null); // for the students' real names + group members
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
      // Names + members: find this submission's group among the teacher's classes.
      // If it fails we simply fall back to the username, so the review is never blocked.
      try {
        const classes = await getMyClasses();
        const all = await Promise.all(classes.map((c) => getClassGroups(c.id).catch(() => [] as Group[])));
        setGroup(all.flat().find((g) => g.id === s.group) ?? null);
      } catch {
        setGroup(null);
      }
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
  const noCheck = submission.confidence_score === 0;
  // confidence_score is how sure the AI is of ITS OWN label (see classifier.ts):
  // ACCEPTED -> P(accepted) (>= threshold); FOR REVIEW -> P(for review).
  const confidence = Math.round(submission.confidence_score * 100);
  const thresholdPct = Math.round(CONFIDENCE_THRESHOLD * 100);
  // For REVIEW with a low score = the AI leaned Accepted but was below the threshold.
  const downgraded = !accepted && !noCheck && submission.confidence_score < 0.5;
  const aiTitle = noCheck ? 'AI could not check this photo' : accepted ? 'Accepted' : 'For review';
  const aiColor = noCheck ? '#6B5B3E' : accepted ? '#166B3A' : '#A34A0A';
  const aiBg = noCheck ? '#F1EAD8' : accepted ? '#E3F3E9' : '#FDE9D2';

  const submitter = group?.members.find((m) => m.student.id === submission.student)?.student
    ?? (group?.leader && group.leader.id === submission.student ? group.leader : null);
  const submitterName = submitter ? fullName(submitter) : submission.student_username;

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
                <Text style={styles.avatarText}>{submitterName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.who} numberOfLines={1}>{submitterName}</Text>
                <Text style={styles.meta} numberOfLines={1}>Submitted for {submission.quest_title}</Text>
                <Text style={styles.meta} numberOfLines={1}>{submission.group_name}</Text>
              </View>
              <Text style={styles.timeText}>{timeAgo(submission.submitted_at)}</Text>
            </View>

            {/* Photo with the AI check on top */}
            <TouchableOpacity onPress={() => setZoom(true)} activeOpacity={0.9}>
              <Image source={{ uri: submission.image_url }} style={styles.photo} />
              <View style={styles.zoomHint}>
                <Ionicons name="expand-outline" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            {/* What the AI said, with its confidence score */}
            <View style={[styles.aiBox, { backgroundColor: aiBg }]}>
              <View style={styles.aiTop}>
                <Ionicons name={noCheck ? 'help-circle' : accepted ? 'sparkles' : 'alert-circle'} size={18} color={aiColor} />
                <Text style={[styles.aiLabel, { color: aiColor }]}>AI result: {aiTitle}</Text>
              </View>
              {!noCheck && (
                <>
                  <View style={styles.aiScoreRow}>
                    <Text style={[styles.aiScoreText, { color: aiColor }]}>Confidence score: {confidence}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, confidence))}%`, backgroundColor: aiColor }]} />
                  </View>
                </>
              )}
              <Text style={styles.aiNote}>
                {noCheck
                  ? "The AI could not run on the student's device, so please check the photo yourself."
                  : downgraded
                    ? `The AI leaned toward Accepted but was below the ${thresholdPct}% it needs, so it was sent for review.`
                    : accepted
                      ? `The AI is at least ${thresholdPct}% sure the photo looks correct. It is only a first check. Your judgment is the final decision.`
                      : 'The AI thinks the photo needs a closer look. It is only a first check. Your judgment is the final decision.'}
              </Text>
            </View>

            {/* Group members */}
            {group && group.members.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={styles.sectionLabel}>GROUP MEMBERS ({group.members.length})</Text>
                <View style={styles.memberWrap}>
                  {group.members.map((m) => {
                    const isLeader = group.leader?.id === m.student.id || m.member_role?.toLowerCase() === 'leader';
                    const isSubmitter = m.student.id === submission.student;
                    return (
                      <View key={m.id} style={[styles.memberChip, isSubmitter && styles.memberChipOn]}>
                        <Text style={styles.memberName} numberOfLines={1}>{fullName(m.student)}</Text>
                        {(isLeader || isSubmitter) && (
                          <Text style={styles.memberTag}>{isSubmitter ? 'Sent photo' : 'Leader'}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
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
  aiNote: { fontSize: 12, color: T('#6B5B3E'), lineHeight: 17 },
  aiBox: { borderRadius: 16, padding: 12, gap: 8 },
  aiTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiLabel: { fontSize: 15, fontWeight: '800' },
  aiScoreRow: { flexDirection: 'row', alignItems: 'center' },
  aiScoreText: { fontSize: 14, fontWeight: '800' },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  memberWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CREAM, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, maxWidth: '100%' },
  memberChipOn: { backgroundColor: '#FFF1C7' },
  memberName: { fontSize: 13, fontWeight: '700', color: BROWN, flexShrink: 1 },
  memberTag: { fontSize: 10, fontWeight: '800', color: ORANGE },

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