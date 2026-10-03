// mobile/app/(auth)/forgot-password-reset.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { resetForgottenPassword } from '../../src/api/accounts';

interface Question {
  question_id: number;
  question_text: string;
}

export default function ForgotPasswordResetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ username: string; questions: string }>();
  const questions: Question[] = JSON.parse(params.questions || '[]');

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleReset() {
    const missing = questions.some((q) => !answers[q.question_id]?.trim());
    if (missing || !newPassword) {
      setError('Please answer all questions and set a new password.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await resetForgottenPassword({
        username: params.username,
        answers: questions.map((q) => ({ question_id: q.question_id, answer: answers[q.question_id] })),
        new_password: newPassword,
      });
      Alert.alert('Password Reset', 'You can now log in with your new password.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.non_field_errors?.[0] || 'Reset failed. Please check your answers.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Answer Your Questions</Text>

      {questions.map((q) => (
        <View key={q.question_id} style={{ marginBottom: 12 }}>
          <Text style={styles.questionLabel}>{q.question_text}</Text>
          <TextInput
            style={styles.input}
            placeholder="Your answer"
            autoCapitalize="none"
            value={answers[q.question_id] || ''}
            onChangeText={(v) => setAnswers((prev) => ({ ...prev, [q.question_id]: v }))}
          />
        </View>
      ))}

      <TextInput
        style={styles.input}
        placeholder="New password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  questionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  error: { color: '#dc2626', marginBottom: 12, textAlign: 'center' },
  button: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});