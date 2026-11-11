// mobile/src/components/useTabScreenOptions.ts
// One look for the bottom navigation of both the student and the teacher app:
// the floating pill bar (see FloatingTabBar.tsx). NOTE: `tabBar` is a prop of <Tabs>, not a screen option,
// so each tabs _layout passes <Tabs tabBar={(p) => <FloatingTabBar {...p} />}> itself.
import { NAV_STRIP_BG } from './FloatingTabBar';

export const TAB_BG = NAV_STRIP_BG;

export function useTabScreenOptions() {
  return {
    headerShown: false,
    // Cream behind the screens (and behind the floating bar), instead of the default white.
    sceneStyle: { backgroundColor: TAB_BG },
  };
}