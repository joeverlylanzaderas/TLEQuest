// mobile/src/components/useTabScreenOptions.ts
// One look for the bottom tab bar of both the student and the teacher app.
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TAB_BG = '#F5EDD8';

export function useTabScreenOptions() {
  // The app is edge-to-edge on Android: lift the bar above the system navigation bar.
  const insets = useSafeAreaInsets();
  return {
    headerShown: false,
    // Cream behind the rounded tab-bar corners instead of the default white.
    sceneStyle: { backgroundColor: '#F5EDD8' },
    tabBarActiveTintColor: '#C2410C',
    tabBarInactiveTintColor: '#8A6A2A',
    tabBarLabelStyle: { fontSize: 11, fontWeight: '700' as const },
    tabBarStyle: {
      backgroundColor: '#F5EDD8',
      borderTopWidth: 1.5,
      borderTopColor: '#3A2B1A',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: 58 + insets.bottom,
      paddingTop: 6,
      paddingBottom: Math.max(insets.bottom, 8),
    },
  };
}
