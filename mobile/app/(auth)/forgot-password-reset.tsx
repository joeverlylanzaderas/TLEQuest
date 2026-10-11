// mobile/app/(auth)/forgot-password-reset.tsx
// Steps 2 and 3 of 3: answer the security questions, then choose a new password.
// (Both happen on this screen; the answers and the new password are sent together.)
import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { resetForgottenPassword } from '../../src/api/accounts';
import {
  AuthScreen, AuthCard, AuthInput, PrimaryButton, TextLink, Banner, StepIndicator, Requirement, AUTH,
} from '../../src/components/AuthUI';

const STEPS = ['Username', 'Verify', 'New password'];
const MIN_LENGTH = 8; // the server enforces the school's real minimum and replies with its own message

interface Question {
  question_id: number;
  question_text: string;
}

type Stage = 'answers' | 'password' | 'done';

function parseQuestions(raw: string | undefined): Question[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ForgotPasswordResetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ username: string; questions: string }>();
  const questions = parseQuestions(params.questions);

  const [stage, setStage] = useState<Stage>('answers');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const answerRefs = useRef<Record<number, TextInput | null>>({});
  const confirmRef = useRef<TextInput | null>(null);

  const longEnough = newPassword.length >= MIN_LENGTH;
  const matches = newPassword.length > 0 && newPassword === confirmPassword;

  // ---------------------------------------------------------------- stage 1 -> 2
  function handleContinueToPassword() {
    const missing = questions.some((q) => !answers[q.question_id]?.trim());
    if (missing) {
      setError('Please answer all 3 questions.');
      return;
    }
    setError('');
    setStage('password');
  }

  // ---------------------------------------------------------------- stage 2 -> done
  async function handleReset() {
    if (!longEnough) {
      setError(`Your new password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (!matches) {
      setError('The two passwords do not match.');
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
      setStage('done');
    } catch (e: any) {
      const data = e?.response?.data;
      if (!e?.response) {
        setError("Can't reach the server. Check your internet connection and try again.");
      } else if (data?.new_password?.[0]) {
        setError(data.new_password[0]); // e.g. "Password must be at least 10 characters."
      } else if (data?.non_field_errors?.[0]?.toLowerCase().includes('incorrect')) {
        // wrong answers -> send them back to fix the answers
        setNewPassword('');
        setConfirmPassword('');
        setStage('answers');
        setError('One or more answers are incorrect. Please check them and try again.');
      } else {
        setError(data?.detail || data?.non_field_errors?.[0] || 'Reset failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---------------------------------------------------------------- done
  if (stage === 'done') {
    return (
      <AuthScreen
        icon="checkmark"
        iconColor={AUTH.GREEN}
        title="Password reset!"
        subtitle="You can now log in with your new password. For your safety, you've been signed out on every device."
      >
        <StepIndicator steps={STEPS} current={3} />
        <PrimaryButton label="Back to login" icon="log-in-outline" onPress={() => router.replace('/(auth)/login')} />
      </AuthScreen>
    );
  }

  // ---------------------------------------------------------------- unusable link
  if (questions.length === 0) {
    return (
      <AuthScreen onBack={() => router.back()} icon="alert" title="Something went wrong" subtitle="We couldn't load your security questions.">
        <PrimaryButton label="Start over" onPress={() => router.replace('/(auth)/forgot-password')} />
      </AuthScreen>
    );
  }

  // ---------------------------------------------------------------- stage 2: new password
  if (stage === 'password') {
    return (
      <AuthScreen
        onBack={() => { setError(''); setStage('answers'); }}
        icon="lock-open"
        title="Choose a new password"
        subtitle={`Almost done, ${params.username}. Pick something you'll remember but others can't guess.`}
      >
        <StepIndicator steps={STEPS} current={2} />

        <AuthCard>
          <AuthInput
            label="NEW PASSWORD"
            icon="key"
            placeholder={`At least ${MIN_LENGTH} characters`}
            passwordToggle
            autoCapitalize="none"
            value={newPassword}
            onChangeText={(v) => { setNewPassword(v); if (error) setError(''); }}
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          <AuthInput
            label="RE-ENTER NEW PASSWORD"
            icon="key"
            placeholder="Type it again"
            passwordToggle
            autoCapitalize="none"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); if (error) setError(''); }}
            inputRef={confirmRef}
            invalid={confirmPassword.length > 0 && !matches && !error}
            returnKeyType="go"
            onSubmitEditing={handleReset}
          />

          <View style={styles.reqBox}>
            <Requirement met={longEnough} text={`At least ${MIN_LENGTH} characters`} />
            <Requirement met={matches} text="Both passwords match" />
          </View>

          {error ? <View style={{ marginTop: 12 }}><Banner kind="error" text={error} /></View> : null}
          <PrimaryButton label="Reset password" onPress={handleReset} loading={isSubmitting} disabled={!longEnough || !matches} />
        </AuthCard>
      </AuthScreen>
    );
  }

  // ---------------------------------------------------------------- stage 1: security questions
  return (
    <AuthScreen
      onBack={() => router.back()}
      icon="shield-checkmark"
      title="Verify it's you"
      subtitle="Answer the security questions you set up. Capital letters don't matter."
    >
      <StepIndicator steps={STEPS} current={1} />

      {questions.map((q, i) => (
        <AuthCard key={q.question_id}>
          <Text style={styles.qNumber}>QUESTION {i + 1} OF {questions.length}</Text>
          <Text style={styles.qText}>{q.question_text}</Text>
          <AuthInput
            label="YOUR ANSWER"
            icon="create"
            placeholder="Type your answer"
            autoCapitalize="none"
            autoCorrect={false}
            value={answers[q.question_id] || ''}
            onChangeText={(v) => { setAnswers((prev) => ({ ...prev, [q.question_id]: v })); if (error) setError(''); }}
            inputRef={(el) => { answerRefs.current[q.question_id] = el; }}
            returnKeyType={i === questions.length - 1 ? 'done' : 'next'}
            onSubmitEditing={() => {
              const next = questions[i + 1];
              if (next) answerRefs.current[next.question_id]?.focus();
              else handleContinueToPassword();
            }}
          />
        </AuthCard>
      ))}

      {error ? <Banner kind="error" text={error} /> : null}
      <PrimaryButton label="Continue" icon="arrow-forward" onPress={handleContinueToPassword} />
      <TextLink label="Use a different username" onPress={() => router.back()} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  qNumber: { fontSize: 11, fontWeight: '800', color: AUTH.MUTED, letterSpacing: 0.6 },
  qText: { fontSize: 16, fontWeight: '800', color: AUTH.BROWN, marginTop: 4, marginBottom: 12, lineHeight: 22 },
  reqBox: { backgroundColor: '#FCF3D9', borderRadius: 12, padding: 12, marginTop: 4 },
});
