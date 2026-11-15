// mobile/src/utils/consentStore.ts
// Remembers on this phone (per user) which policy version was agreed to, and whether the server
// still has to be told. This way the popup never nags again, and an agreement made while offline
// is sent to the server later.
import * as SecureStore from 'expo-secure-store';

const keyFor = (userId: number | string) => `tlequest_policy_${userId}`;

export interface LocalConsent {
  version: string;
  synced: boolean;
}

export async function readLocalConsent(userId: number | string): Promise<LocalConsent | null> {
  try {
    const raw = await SecureStore.getItemAsync(keyFor(userId));
    return raw ? (JSON.parse(raw) as LocalConsent) : null;
  } catch {
    return null;
  }
}

export async function writeLocalConsent(userId: number | string, value: LocalConsent): Promise<void> {
  try {
    await SecureStore.setItemAsync(keyFor(userId), JSON.stringify(value));
  } catch {
    // ignore: worst case the popup shows once more
  }
}
