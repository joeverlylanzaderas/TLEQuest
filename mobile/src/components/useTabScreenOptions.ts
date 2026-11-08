// mobile/src/components/useTabScreenOptions.ts
// One look for the bottom tab bar of both the student and the teacher app.
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, activeTheme } from '../theme/theme';

export const TAB_BG = T('#F5EDD8');

export function useTabScreenOptions() {
  // The app is edge-to-edge on Android: lift the bar above the system navigation bar.
  const insets = useSafeAreaInsets();
  return {
    headerShown: false,
    // Cream behind the rounded tab-bar corners instead of the default white.
    sceneStyle: { backgroundColor: TAB_BG },
    tabBarActiveTintColor: activeTheme === 'school' ? '#1E4D8F' : '#C2410C',
    tabBarInactiveTintColor: T('#8A6A2A'),
    tabBarLabelStyle: { fontSize: 11, fontWeight: '700' as const },
    tabBarStyle: {
      backgroundColor: TAB_BG,
      borderTopWidth: 1.5,
      borderTopColor: T('#3A2B1A'),
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: 58 + insets.bottom,
      paddingTop: 6,
      paddingBottom: Math.max(insets.bottom, 8),
    },
  };
}