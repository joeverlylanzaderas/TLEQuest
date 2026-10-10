// mobile/app/classifier-test.tsx
import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Image, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { classifyImage, ClassificationResult } from '../src/ml/classifier';

const BROWN = '#5C2C16';
const GREEN = '#22C55E';
const ORANGE = '#EA580C';
const CREAM = '#F5EDD8';

export default function ClassifierTest() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  if (!permission) {
    return <View style={styles.centered}><ActivityIndicator color={BROWN} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>TLEQuest needs camera access to check your output.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current || isBusy) return;
    setIsBusy(true);
    setError('');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setPhotoUri(photo.uri);
      setResult(await classifyImage(photo.uri));
    } catch (e: any) {
      setError(e?.message || 'Something went wrong while classifying.');
    } finally {
      setIsBusy(false);
    }
  }

  function handleRetake() {
    setPhotoUri(null);
    setResult(null);
    setError('');
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      {photoUri ? (
        <ScrollView contentContainerStyle={styles.resultContent}>
          <Image source={{ uri: photoUri }} style={styles.preview} />

          {isBusy && <ActivityIndicator size="large" color={ORANGE} style={{ marginTop: 16 }} />}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {result && (
            <View style={styles.resultCard}>
              <Text style={[styles.resultLabel, { color: result.label === 'ACCEPTED' ? GREEN : ORANGE }]}>
                {result.label}
              </Text>
              <Text style={styles.resultConfidence}>
                Confidence: {(result.confidence * 100).toFixed(1)}%
              </Text>
              <Text style={styles.rawTitle}>Raw model output (for checking):</Text>
              <Text style={styles.rawText}>ACCEPTED: {result.probabilities['ACCEPTED'].toFixed(4)}</Text>
              <Text style={styles.rawText}>FOR REVIEW: {result.probabilities['FOR REVIEW'].toFixed(4)}</Text>
              <Text style={styles.rawText}>Time: {result.elapsedMs} ms</Text>
            </View>
          )}

          <TouchableOpacity style={styles.primaryButton} onPress={handleRetake} disabled={isBusy}>
            <Text style={styles.primaryButtonText}>Take Another Photo</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={styles.captureBar}>
            <TouchableOpacity style={styles.captureOuter} onPress={handleCapture} disabled={isBusy}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM, padding: 24 },
  infoText: { color: BROWN, textAlign: 'center', marginBottom: 16, fontSize: 14 },
  backButton: { position: 'absolute', top: 50, left: 16, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 },
  camera: { flex: 1 },
  captureBar: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  captureOuter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },

  resultContent: { padding: 20, paddingTop: 100, alignItems: 'center', backgroundColor: CREAM, minHeight: '100%' },
  preview: { width: 260, height: 260, borderRadius: 16 },
  errorText: { color: '#B3261E', marginTop: 16, textAlign: 'center' },
  resultCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginTop: 16, width: '100%', alignItems: 'center' },
  resultLabel: { fontSize: 26, fontWeight: '900' },
  resultConfidence: { fontSize: 14, color: BROWN, marginTop: 4, marginBottom: 12, fontWeight: '700' },
  rawTitle: { fontSize: 11, color: '#8A6A2A', fontWeight: '700', marginBottom: 4 },
  rawText: { fontSize: 12, color: '#555', fontFamily: 'monospace' },

  primaryButton: { backgroundColor: BROWN, borderRadius: 22, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
});