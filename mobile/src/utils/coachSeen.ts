// mobile/src/utils/coachSeen.ts
// Remembers (per user, on this phone) which guided tours / tips were already shown,
// and whether the user turned the tips off. Same storage as guideSeen.ts.
import * as SecureStore from 'expo-secure-store';

const seenKey = (userId: number | string, tourId: string) => `tlequest_coach_${userId}_${tourId}`;
const offKey = (userId: number | string) => `tlequest_coach_off_${userId}`;

/** If storage fails we say "seen", so a broken phone never gets nagged. */
export async function hasSeenTour(userId: number | string, tourId: string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(seenKey(userId, tourId))) === '1';
  } catch {
    return true;
  }
}

export async function markTourSeen(userId: number | string, tourId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(seenKey(userId, tourId), '1');
  } catch {
    // ignore: worst case the tip shows once more
  }
}

export async function tipsAreOff(userId: number | string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(offKey(userId))) === '1';
  } catch {
    return true;
  }
}

export async function setTipsOff(userId: number | string, off: boolean): Promise<void> {
  try {
    if (off) await SecureStore.setItemAsync(offKey(userId), '1');
    else await SecureStore.deleteItemAsync(offKey(userId));
  } catch {
    // ignore
  }
}

/** "Show tips again": forget the given tours and turn tips back on. */
export async function resetTours(userId: number | string, tourIds: string[]): Promise<void> {
  try {
    await Promise.all(tourIds.map((id) => SecureStore.deleteItemAsync(seenKey(userId, id))));
  } catch {
    // ignore
  }
  await setTipsOff(userId, false);
}
