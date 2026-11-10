//app/(teacher)/_layout.tsx
import { Stack } from 'expo-router';
import WelcomeGuide from '../../src/components/WelcomeGuide';

export default function TeacherLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create-quest" />
        <Stack.Screen name="manage-classes" />
        <Stack.Screen name="submissions-list" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="class/[id]" />
      </Stack>
      {/* Shows once, the first time this teacher gets here after logging in */}
      <WelcomeGuide role="teacher" />
    </>
  );
}