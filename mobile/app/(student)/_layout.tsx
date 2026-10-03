// mobile/app/(student)/_layout.tsx
import { Stack } from 'expo-router';

export default function StudentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="quest/[id]/overview" />
      <Stack.Screen name="quest/[id]/step/[stepId]" />
    </Stack>
  );
}