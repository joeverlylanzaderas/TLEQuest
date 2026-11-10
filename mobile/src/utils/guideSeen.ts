// mobile/src/utils/guideSeen.ts
// Remembers (per user, on this phone) whether the welcome guide was already shown,
// so it only pops up on a user's first login. Same storage the app already uses.
import * as SecureStore from 'expo-secure-store';

const keyFor = (userId: number | string) => `tlequest_guide_seen_${userId}`;

/** True if this user already saw the welcome guide. If storage fails we say "seen" so it never nags. */
export async function hasSeenGuide(userId: number | string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(keyFor(userId))) === '1';
  } catch {
    return true;
  }
}

export async function markGuideSeen(userId: number | string): Promise<void> {
  try {
    await SecureStore.setItemAsync(keyFor(userId), '1');
  } catch {
    // ignore: worst case the guide shows once more
  }
}
