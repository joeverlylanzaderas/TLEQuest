// mobile/app/(student)/_layout.tsx
import { Stack } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useSubmissionQueueSync } from '../../src/utils/useSubmissionQueueSync';
import WelcomeGuide from '../../src/components/WelcomeGuide';

export default function StudentLayout() {
  // Sends submissions that were saved on the phone while there was no signal
  const { user } = useAuth();
  useSubmissionQueueSync(user?.id);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 280 }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="class-group" />
        <Stack.Screen name="join-class" />
        <Stack.Screen name="quest/[id]/overview" />
        <Stack.Screen name="quest/[id]/step/[stepId]" />
      </Stack>
      {/* Shows once, the first time this student gets here after logging in */}
      <WelcomeGuide role="student" />
    </>
  );
}