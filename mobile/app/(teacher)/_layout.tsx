//app/(teacher)/_layout.tsx
import { Stack } from 'expo-router';
import WelcomeGuide from '../../src/components/WelcomeGuide';

export default function TeacherLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 280 }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create-quest" />
        <Stack.Screen name="manage-classes" />
        <Stack.Screen name="submissions-list" />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="class/[id]" />
      </Stack>
      {/* Shows once, the first time this teacher gets here after logging in */}
      <WelcomeGuide role="teacher" />
    </>
  );
}