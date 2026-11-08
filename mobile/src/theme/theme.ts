// mobile/src/theme/theme.ts
// Two app themes. The user picks one in Profile (student) or Settings (teacher).
//   default = gold / brown / orange (the original look)
//   school  = blue / white / cream / yellow (school colors)
//
// The choice is saved on the phone and read when the app starts, so every
// screen gets the right colors from its first frame. A new choice is applied the
// next time the app is opened.
import * as SecureStore from 'expo-secure-store';

export type ThemeKey = 'default' | 'school';

const STORE_KEY = 'tlequest_theme';

function readSavedTheme(): ThemeKey {
  try {
    return SecureStore.getItem(STORE_KEY) === 'school' ? 'school' : 'default';
  } catch {
    return 'default';
  }
}

/** The theme the app is showing right now (fixed until the app is reopened). */
export const activeTheme: ThemeKey = readSavedTheme();

/** Saves the user's choice. It is applied the next time the app is opened. */
export async function saveTheme(theme: ThemeKey): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORE_KEY, theme);
  } catch {
    // ignore: the app keeps working with the current theme
  }
}

// default color -> school color (lowercase keys)
const SCHOOL: Record<string, string> = {
  '#f5b921': '#F2B84B', // gold      -> yellow
  '#f9c544': '#F2B84B',
  '#fbbf24': '#F2B84B',
  '#ea580c': '#1E4D8F', // orange    -> school blue
  '#5c2c16': '#18303D', // brown     -> navy
  '#7c2d12': '#18303D',
  '#3a2b1a': '#18303D',
  '#5c3a2e': '#2D4458',
  '#8a6a2a': '#5B6B7A', // muted     -> slate
  '#f5edd8': '#FAF6E8', // cream
  '#f2e4c4': '#EDE6CF',
  '#eadec9': '#E3DCC6',
  '#4a2e1d': '#18303D',
'#8a5a3a': '#5B6B7A',
'#b8895c': '#1E4D8F',
};

/** Returns the color for the active theme. Wrap any hard-coded hex with it: T('#EA580C'). */
export function T(hex: string): string {
  if (activeTheme === 'default') return hex;
  return SCHOOL[hex.toLowerCase()] ?? hex;
}

// Header bar (top of every tab): gold + dark text, or blue + white text.
export const HEADER_BG = activeTheme === 'school' ? '#1E4D8F' : '#F5B921';
export const HEADER_TEXT = activeTheme === 'school' ? '#FFFFFF' : '#3A2B1A';

/** Kept so older code that still calls it does nothing harmful. */
export async function syncTheme(): Promise<boolean> {
  return false;
}