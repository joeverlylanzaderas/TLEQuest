// mobile/app/change-password.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { changePassword, getSecurityQuestionList } from '../src/api/accounts';
import {
  AUTH, AuthScreen, AuthCard, AuthInput, PrimaryButton, TextLink, Banner, Requirement,
} from '../src/components/AuthUI';

interface QuestionOption {
  id: number;
  question_text: string;
}

const FIELD_BG = AUTH.FIELD_BG;
const BROWN = AUTH.BROWN;
const ACCENT_GREEN = AUTH.GREEN;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();

    function goBack() {
    if (from) {
        router.replace(from as any);
    } else {
        router.back(); // fallback if this screen was somehow reached without the param
    }
    }

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [needsSecurityQuestions, setNeedsSecurityQuestions] = useState(false);
  const [allQuestions, setAllQuestions] = useState<QuestionOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  function hasUnsavedInput() {
    return (
      oldPassword.trim() !== '' ||
      newPassword.trim() !== '' ||
      confirmPassword.trim() !== '' ||
      selectedIds.length > 0
    );
  }

  function handleCancel() {
    if (hasUnsavedInput()) {
        Alert.alert(
        'Discard changes?',
        'You have unsaved input. Are you sure you want to leave?',
        [
            { text: 'Keep Editing', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: goBack },
        ]
      );
    } else {
      goBack();
    }
  }

  async function attemptSave() {
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = { old_password: oldPassword, new_password: newPassword };

      if (needsSecurityQuestions) {
        if (selectedIds.length !== 3) {
          setError('Please choose exactly 3 questions.');
          setIsSubmitting(false);
          return;
        }
        const missing = selectedIds.some((id) => !answers[id]?.trim());
        if (missing) {
          setError('Please answer all 3 selected questions.');
          setIsSubmitting(false);
          return;
        }
        payload.security_answers = selectedIds.map((id) => ({ question_id: id, answer: answers[id] }));
      }

      await changePassword(payload);
      Alert.alert('Success', 'Password updated successfully.', [
        { text: 'OK', onPress: goBack },
      ]);
    } catch (e: any) {
      const data = e?.response?.data;   

      if (data?.security_answers && !needsSecurityQuestions) {
        setNeedsSecurityQuestions(true);
        if (allQuestions.length === 0) {
          try {
            const list = await getSecurityQuestionList();
            setAllQuestions(list);
          } catch {
            setError('Could not load security questions. Please try again.');
          }
        }
        setError('This is your first time changing your password — please also set up 3 security questions below.');
      } else {
        const message =
          data?.old_password?.[0] ||
          data?.new_password?.[0] ||
          data?.detail ||
          'Could not change password. Please try again.';
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleQuestion(id: number) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((q) => q !== id);
        setAnswers((a) => { const copy = { ...a }; delete copy[id]; return copy; });
        return next;
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  const lengthOk = newPassword.length >= 8;
  const matchOk = confirmPassword.length > 0 && newPassword === confirmPassword;

  return (
    <AuthScreen
      onBack={handleCancel}
      fixedHero
      icon="key"
      title="Change Password"
      subtitle="Keep your account safe and secure"
    >
      <AuthCard>
        <Text style={styles.cardTitle}>Update your password</Text>
        <Text style={styles.cardDesc}>Enter your current password, then choose a new one.</Text>

        <AuthInput
          label="CURRENT PASSWORD"
          icon="lock-closed"
          placeholder="Current password"
          passwordToggle
          autoCapitalize="none"
          value={oldPassword}
          onChangeText={setOldPassword}
        />
        <AuthInput
          label="NEW PASSWORD"
          icon="key"
          placeholder="At least 8 characters"
          passwordToggle
          autoCapitalize="none"
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <AuthInput
          label="RE-ENTER NEW PASSWORD"
          icon="key"
          placeholder="Re-enter new password"
          passwordToggle
          autoCapitalize="none"
          invalid={confirmPassword.length > 0 && !matchOk}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Requirement met={lengthOk} text="At least 8 characters" />
        <Requirement met={matchOk} text="Both passwords match" />
        <View style={{ height: 6 }} />
        <Text style={styles.cardDesc}>You'll be signed out after a successful change, for security.</Text>
      </AuthCard>

      {error ? <Banner kind={needsSecurityQuestions && error.startsWith('This is your first') ? 'info' : 'error'} text={error} /> : null}

      {needsSecurityQuestions && (
        <AuthCard>
          <Text style={styles.cardTitle}>Set up recovery questions</Text>
          <Text style={styles.cardDesc}>
            Pick 3 different questions — used if you ever forget your password. ({selectedIds.length}/3 chosen)
          </Text>

          {allQuestions.map((q) => {
            const isSelected = selectedIds.includes(q.id);
            return (
              <View key={q.id} style={styles.questionItem}>
                <TouchableOpacity
                  style={[styles.questionToggle, isSelected && styles.questionToggleSelected]}
                  onPress={() => toggleQuestion(q.id)}
                  activeOpacity={0.8}
                >
                  {isSelected && (
                    <View style={styles.questionCheckBadge}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                  <Text style={[styles.questionText, isSelected && styles.questionTextSelected]}>
                    {q.question_text}
                  </Text>
                </TouchableOpacity>
                {isSelected && (
                  <TextInput
                    style={styles.answerInput}
                    placeholder="Your answer"
                    placeholderTextColor="#9C8A6E"
                    value={answers[q.id] || ''}
                    onChangeText={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                    autoCapitalize="none"
                  />
                )}
              </View>
            );
          })}
        </AuthCard>
      )}

      <PrimaryButton
        label="Save Changes"
        onPress={attemptSave}
        loading={isSubmitting}
        disabled={!oldPassword || !lengthOk || !matchOk}
      />
      <TextLink label="Cancel" onPress={handleCancel} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: 15, fontWeight: '800', color: BROWN },
  cardDesc: { fontSize: 12, color: AUTH.MUTED, marginTop: 2, marginBottom: 8, lineHeight: 17 },

  questionItem: { marginTop: 10 },
  questionToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: AUTH.BORDER,
    borderRadius: 14, padding: 12, backgroundColor: FIELD_BG,
  },
  questionToggleSelected: { borderColor: ACCENT_GREEN, backgroundColor: '#E9F7EE' },
  questionCheckBadge: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: ACCENT_GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
  questionText: { flex: 1, fontSize: 13, color: BROWN, fontWeight: '600' },
  questionTextSelected: { color: '#1F7A3F' },
  answerInput: {
    borderWidth: 1, borderColor: AUTH.BORDER, borderRadius: 12, padding: 10, marginTop: 8,
    fontSize: 14, backgroundColor: '#fff', color: BROWN,
  },
});
