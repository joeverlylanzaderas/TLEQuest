// mobile/app/change-password.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { changePassword, getSecurityQuestionList } from '../src/api/accounts';

interface QuestionOption {
  id: number;
  question_text: string;
}

// ============================================================================
// COLOR PALETTE — matches the login screen exactly, so this feels like the
// same app rather than a bolted-on settings page.
// ============================================================================
const CREAM = '#F2E4C4';
const FIELD_BG = '#F7EBD0';
const CARD_BG = '#F9C544';
const BROWN = '#3A2B1A';
const ACCENT_GREEN = '#2FA85B'; // pulled from the "L" in the TLE logo — used for success/save

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
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 600;
  const contentMaxWidth = isTablet ? 520 : undefined;

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}>

          {/* ---------------- Header ---------------- */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
              <Ionicons name="arrow-back" size={22} color={BROWN} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Change Password</Text>
              <Text style={styles.subtitle}>Keep your account safe and secure</Text>
            </View>
          </View>

          {/* ---------------- Step 1: Credentials ---------------- */}
          <View style={styles.card}>
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Update Your Password</Text>
                <Text style={styles.stepDesc}>Enter your current password, then choose a new one.</Text>
              </View>
            </View>

            <Text style={styles.label}>CURRENT PASSWORD</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed" size={18} color={BROWN} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Current password"
                placeholderTextColor="#9C8A6E"
                secureTextEntry={!showOld}
                value={oldPassword}
                onChangeText={setOldPassword}
              />
              <TouchableOpacity onPress={() => setShowOld((s) => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showOld ? 'eye-off' : 'eye'} size={20} color={BROWN} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>NEW PASSWORD</Text>
            <View style={styles.inputRow}>
              <Ionicons name="key" size={18} color={BROWN} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor="#9C8A6E"
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={() => setShowNew((s) => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color={BROWN} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>RE-ENTER NEW PASSWORD</Text>
            <View style={styles.inputRow}>
              <Ionicons name="key" size={18} color={BROWN} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Re-enter new password"
                placeholderTextColor="#9C8A6E"
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirm((s) => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color={BROWN} />
              </TouchableOpacity>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={styles.tipText}>
                Your password must be at least 8 characters. You'll be signed out after a successful change, for security.
              </Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#B3261E" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ---------------- Step 2: Security Questions ---------------- */}
          {needsSecurityQuestions && (
            <View style={styles.card}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Set Up Recovery Questions</Text>
                  <Text style={styles.stepDesc}>Pick 3 different questions — used if you ever forget your password.</Text>
                </View>
              </View>

              {allQuestions.map((q) => {
                const isSelected = selectedIds.includes(q.id);
                return (
                  <View key={q.id} style={styles.questionItem}>
                    <TouchableOpacity
                      style={[styles.questionToggle, isSelected && styles.questionToggleSelected]}
                      onPress={() => toggleQuestion(q.id)}
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
            </View>
          )}

          {/* ---------------- Save / Cancel ---------------- */}
          <TouchableOpacity style={styles.button} onPress={attemptSave} disabled={isSubmitting} activeOpacity={0.9}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={isSubmitting}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  scrollContent: { padding: 20, paddingBottom: 48 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: CARD_BG,
  },
  title: { fontSize: 22, fontWeight: '800', color: BROWN },
  subtitle: { fontSize: 13, color: '#8A6A2A', marginTop: 2 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EADEC9',
    padding: 18,
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { fontWeight: '800', color: BROWN, fontSize: 14 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: BROWN },
  stepDesc: { fontSize: 12, color: '#8A6A2A', marginTop: 2 },

  label: {
    fontSize: 11,
    fontWeight: '700',
    color: BROWN,
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FIELD_BG,
    borderRadius: 30,
    paddingHorizontal: 16,
    height: 48,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: BROWN, fontWeight: '600' },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FCF3D9',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  tipIcon: { fontSize: 15 },
  tipText: { flex: 1, fontSize: 12, color: BROWN, lineHeight: 17 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FDE4E1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { flex: 1, color: '#B3261E', fontSize: 13 },

  questionItem: { marginBottom: 12 },
  questionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#EADEC9',
    borderRadius: 14,
    padding: 12,
    backgroundColor: FIELD_BG,
  },
  questionToggleSelected: {
    borderColor: ACCENT_GREEN,
    backgroundColor: '#E9F7EE',
  },
  questionCheckBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ACCENT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionText: { flex: 1, fontSize: 13, color: BROWN, fontWeight: '600' },
  questionTextSelected: { color: '#1F7A3F' },
  answerInput: {
    borderWidth: 1,
    borderColor: '#EADEC9',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    fontSize: 14,
    backgroundColor: '#fff',
    color: BROWN,
  },

  button: {
    backgroundColor: '#5C3A2E',
    borderRadius: 30,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelButton: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelButtonText: { color: '#8A6A2A', fontSize: 14, fontWeight: '600' },
});