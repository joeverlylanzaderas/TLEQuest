// mobile/src/components/SubmitOutputCard.tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Image, ActivityIndicator, StyleSheet,
} from 'react-native';
import { T } from '../theme/theme';
import { useCameraPermissions } from 'expo-camera';
import CameraCapture from './CameraCapture';
import { Ionicons } from '@expo/vector-icons';
import { classifyImage, ClassificationResult } from '../ml/classifier';
import { useAuth } from '../context/AuthContext';
import { enqueueSubmission, flushQueue, getItemStatus, discardSubmission } from '../utils/submissionQueue';
import { QuestProgressDetail } from '../types/assignments';

const BROWN = T('#5C2C16');
const GREEN = '#22C55E';
const ORANGE = T('#EA580C');

// When the model can't run (e.g. Expo Go, no dev build), send the photo to the
// teacher as FOR REVIEW instead of failing. Set to false before the defense so a
// broken classifier is never hidden.
const ALLOW_FALLBACK = false;

function feedbackFor(label: string): string {
  return label === 'ACCEPTED'
    ? 'Great work! Our AI found your table setup complete. Your teacher will review it too.'
    : 'Our AI flagged this output for a closer look. Your teacher will review it and send feedback.';
}

function errorText(e: any): string {
  const data = e?.response?.data;
  if (data) {
    if (data.detail) return data.detail;
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof data === 'string') return data;
  }
  return e?.message || 'Could not submit. Please try again.';
}

interface Props {
  progress: QuestProgressDetail;
}

export default function SubmitOutputCard({ progress }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<{
    result: ClassificationResult;
    aiUnavailable: boolean;
    queued?: boolean; // saved on the phone, will be sent when signal returns
  } | null>(null);
  const { user } = useAuth();

  async function openCamera() {
    setError('');
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setError('Camera permission is needed to take a photo of your output.');
        return;
      }
    }
    setCameraOpen(true);
  }

  // Called by the camera screen with the photo that was just taken
  function handleCaptured(uri: string) {
    setPhotoUri(uri);
    setSubmitted(null);
    setError('');
    setCameraOpen(false);
  }

  async function handleSubmit() {
    if (!photoUri || isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      // 1. AI check on the phone
      setStage('Checking your output with AI...');
      let result: ClassificationResult;
      let aiUnavailable = false;
      try {
        result = await classifyImage(photoUri);
      } catch (e: any) {
        if (!ALLOW_FALLBACK) throw e;
        aiUnavailable = true;
        result = {
          label: 'FOR REVIEW',
          confidence: 0,
          probabilities: { ACCEPTED: 0, 'FOR REVIEW': 0 },
          elapsedMs: 0,
        };
      }

      // 2. Save the submission on the phone first, so a weak signal can never lose it
      if (!user) throw new Error('Please log in again.');
      setStage('Saving your submission...');
      const saved = await enqueueSubmission(
        user.id,
        {
          quest_assignment: progress.quest_assignment,
          classifier_result: result.label,
          confidence_score: result.confidence,
          generated_feedback: feedbackFor(result.label),
        },
        photoUri
      );

      // 3. Try to send it now (uploads the photo, then creates the submission)
      setStage('Sending to your teacher...');
      await flushQueue(user.id);
      const status = await getItemStatus(user.id, saved.id);

      if (status.state === 'failed') {
        await discardSubmission(user.id, saved.id);
        throw new Error(status.message);
      }

      setSubmitted({ result, aiUnavailable, queued: status.state === 'pending' });
      setPhotoUri(null);
    } catch (e: any) {
      setError(errorText(e));
    } finally {
      setIsSubmitting(false);
      setStage('');
    }
  }

  // ---- Not the leader: no buttons, just the explanation ----
  if (!progress.is_group_leader) {
    return (
      <View style={styles.card}>
        <Text style={styles.congrats}>Congratulations!</Text>
        <Text style={styles.title}>All Steps{'\n'}Completed!</Text>
        <Text style={styles.body}>
          You have completed all steps for this quest! Your group leader will submit your group's final output.
          Keep it up and good luck!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.congrats}>Congratulations!</Text>
      <Text style={styles.title}>All Steps{'\n'}Completed!</Text>
      <Text style={styles.body}>
        Submit your final output to finish the quest. Take a clear photo of your table setup. AI will verify your
        work automatically.
      </Text>

      {submitted ? (
        <View style={styles.resultBox}>
          <Ionicons
            name={submitted.queued ? 'cloud-upload-outline' : submitted.result.label === 'ACCEPTED' ? 'checkmark-circle' : 'time'}
            size={34}
            color={submitted.queued ? BROWN : submitted.result.label === 'ACCEPTED' ? GREEN : ORANGE}
          />
          <Text style={[styles.resultLabel, { color: submitted.queued ? BROWN : submitted.result.label === 'ACCEPTED' ? GREEN : ORANGE }]}>
            {submitted.queued ? 'SAVED ON YOUR PHONE' : submitted.result.label}
          </Text>
          {!submitted.aiUnavailable && !submitted.queued && (
            <Text style={styles.resultConfidence}>Confidence: {(submitted.result.confidence * 100).toFixed(1)}%</Text>
          )}
          <Text style={styles.resultNote}>
            {submitted.queued
              ? 'There is no signal right now. Your photo is saved on this phone and will be sent to your teacher automatically when the signal returns. You can close this screen.'
              : submitted.aiUnavailable
              ? 'AI check is not available on this device, so your teacher will review your output directly.'
              : feedbackFor(submitted.result.label)}
          </Text>
          {!submitted.queued && (
            <TouchableOpacity style={styles.secondaryButton} onPress={openCamera}>
              <Text style={styles.secondaryButtonText}>Submit another photo</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={styles.dashedBox}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.preview} />
            ) : (
              <Ionicons name="camera-outline" size={40} color={BROWN} />
            )}
            <Text style={styles.dashedText}>
              {photoUri ? 'Looks good? Submit it, or retake.' : 'Take a photo of your finished table setup'}
            </Text>
            <TouchableOpacity style={styles.orangeButton} onPress={openCamera} disabled={isSubmitting}>
              <Text style={styles.orangeButtonText}>{photoUri ? 'Retake' : 'Take a Photo'}</Text>
            </TouchableOpacity>
            {/* Cancel: throw the photo away and go back to the start (nothing is sent) */}
            {photoUri ? (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setPhotoUri(null); setError(''); }}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Cancel and remove this photo"
              >
                <Text style={[styles.cancelButtonText, isSubmitting && { opacity: 0.4 }]}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.submitBox}>
            <Text style={styles.submitTitle}>Submit for AI verification?</Text>
            <Text style={styles.submitSub}>Your image will be analyzed by AI. Results appear within seconds.</Text>
            <TouchableOpacity
              style={[styles.orangeButton, !photoUri && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={!photoUri || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.orangeButtonText}>Submit Now</Text>
              )}
            </TouchableOpacity>
            {isSubmitting && stage ? <Text style={styles.stageText}>{stage}</Text> : null}
          </View>
        </>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* In-app camera: no gallery, the photo has to be taken live */}
      <CameraCapture
        visible={cameraOpen}
        title={progress.quest_title}
        onClose={() => setCameraOpen(false)}
        onCaptured={handleCaptured}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFBEB', borderRadius: 20, borderWidth: 2, borderColor: ORANGE, padding: 20, alignItems: 'center' },
  congrats: { fontSize: 13, fontWeight: '700', color: GREEN, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: ORANGE, textAlign: 'center', lineHeight: 33, marginBottom: 10 },
  body: { fontSize: 12, color: '#666', textAlign: 'center', lineHeight: 18, marginBottom: 14 },

  dashedBox: { width: '100%', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B8A671', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 12 },
  dashedText: { fontSize: 11, color: T('#8A6A2A'), textAlign: 'center', marginVertical: 8 },
  preview: { width: 150, height: 150, borderRadius: 12 },

  submitBox: { width: '100%', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B8A671', borderRadius: 14, padding: 14, alignItems: 'center', backgroundColor: '#FFF7D6' },
  submitTitle: { fontSize: 14, fontWeight: '800', color: BROWN, marginBottom: 4 },
  submitSub: { fontSize: 11, color: T('#8A6A2A'), textAlign: 'center', marginBottom: 10 },
  stageText: { fontSize: 11, color: T('#8A6A2A'), marginTop: 8, fontStyle: 'italic' },

  orangeButton: { backgroundColor: ORANGE, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 10, minWidth: 120, alignItems: 'center' },
  orangeButtonText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  disabledButton: { backgroundColor: '#E5B999' },
  secondaryButton: { marginTop: 14, borderWidth: 1.5, borderColor: ORANGE, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  secondaryButtonText: { color: ORANGE, fontWeight: '700', fontSize: 12 },
  cancelButton: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 24 },
  cancelButtonText: { color: T('#8A6A2A'), fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' },

  resultBox: { width: '100%', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 18 },
  resultLabel: { fontSize: 22, fontWeight: '900', marginTop: 6 },
  resultConfidence: { fontSize: 12, color: BROWN, fontWeight: '700', marginTop: 2 },
  resultNote: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 18 },

  errorText: { color: '#B3261E', fontSize: 12, marginTop: 12, textAlign: 'center' },

});