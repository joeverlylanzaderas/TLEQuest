// mobile/app/(student)/_layout.tsx
import { Stack } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useSubmissionQueueSync } from '../../src/utils/useSubmissionQueueSync';

export default function StudentLayout() {
  // Sends submissions that were saved on the phone while there was no signal
  const { user } = useAuth();
  useSubmissionQueueSync(user?.id);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="quest/[id]/overview" />
      <Stack.Screen name="quest/[id]/step/[stepId]" />
    </Stack>
  );
}