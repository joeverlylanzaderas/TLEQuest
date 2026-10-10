// mobile/app/(teacher)/submissions-list.tsx
import { Redirect } from 'expo-router';

export default function SubmissionsListRedirect() {
  return <Redirect href={'/(teacher)/(tabs)/submissions' as any} />;
}