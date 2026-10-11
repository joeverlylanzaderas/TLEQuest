// mobile/app/(auth)/forgot-password.tsx
// Step 1 of 3: enter the username.
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { getForgotPasswordQuestions } from '../../src/api/accounts';
import {
  AuthScreen, AuthCard, AuthInput, PrimaryButton, TextLink, Banner, StepIndicator,
} from '../../src/components/AuthUI';

export const RESET_STEPS = ['Username', 'Verify', 'New password'];

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleContinue() {
    if (!username.trim()) {
      setError({ kind: 'error', text: 'Please enter your username.' });
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const result = await getForgotPasswordQuestions(username.trim());
      router.push({
        pathname: '/(auth)/forgot-password-reset',
        params: {
          username: username.trim(),
          questions: JSON.stringify(result.questions),
        },
      });
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      if (!e?.response) {
        setError({ kind: 'error', text: "Can't reach the server. Check your internet connection and try again." });
      } else if (status === 404) {
        setError({ kind: 'error', text: "We couldn't find that username. Check the spelling and try again." });
      } else if (status === 403 || status === 400) {
        // password reset switched off, or this account has no security questions yet
        setError({ kind: 'info', text: detail || 'Password reset is not available for this account. Please contact your teacher or admin.' });
      } else {
        setError({ kind: 'error', text: detail || 'Something went wrong. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthScreen
      onBack={() => router.back()}
      icon="help-buoy"
      title="Forgot your password?"
      subtitle="No worries. Enter your username and we'll ask the 3 security questions you set up."
    >
      <StepIndicator steps={RESET_STEPS} current={0} />

      <AuthCard>
        <AuthInput
          label="USERNAME"
          icon="person"
          placeholder="Your username"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={(v) => { setUsername(v); if (error) setError(null); }}
          invalid={error?.kind === 'error'}
          returnKeyType="go"
          onSubmitEditing={handleContinue}
        />
        {error ? <Banner kind={error.kind} text={error.text} /> : null}
        <PrimaryButton label="Continue" icon="arrow-forward" onPress={handleContinue} loading={isLoading} />
      </AuthCard>

      <Banner kind="info" text="Can't remember your answers? Ask your teacher or admin to reset your password for you." />

      <TextLink label="Back to login" onPress={() => router.back()} />
    </AuthScreen>
  );
}
