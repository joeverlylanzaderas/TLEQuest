import { DevSettings } from 'react-native';

// Restart the JS app so the new theme colors load.
// Uses expo-updates in the installed APK, and DevSettings while testing with Expo.
export async function reloadApp() {
  try {
    const Updates = require('expo-updates');
    if (Updates?.reloadAsync) {
      await Updates.reloadAsync();
      return;
    }
  } catch {}
  try {
    DevSettings.reload();
  } catch {}
}