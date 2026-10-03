//mobile/app/index.tsx
import { Redirect } from 'expo-router';

// Root layout handles the real redirect logic based on auth state.
// This just gives Expo Router a valid starting route to land on.
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}