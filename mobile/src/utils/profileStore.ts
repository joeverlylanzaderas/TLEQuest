// mobile/src/utils/profileStore.ts
// One shared copy of "who am I" (GET /accounts/me/), so the header, the Profile
// screen and Settings do not each fetch it again and again.
//   - getCachedProfile()  -> instant, from memory (null right after app start)
//   - peekSavedProfile()  -> from the copy saved on the phone (fast, works after a restart)
//   - loadProfile()       -> asks the server only when the copy is older than 30 s,
//                            and joins a request that is already running
import * as SecureStore from 'expo-secure-store';
import { Image } from 'react-native';
import { apiClient } from '../api/client';
import { getMyProfile } from '../api/accounts';
import { readFromCache } from './offlineCache';
import { thumbUrl } from './media';
import { FullUser } from '../types/accounts';

const FRESH_MS = 30_000;

let mem: FullUser | null = null;
let memAt = 0;
let inflight: Promise<FullUser> | null = null;

function warmAvatar(p: FullUser | null) {
  // Warm the exact sizes the header (46) and the Profile screen (100) will ask for
  [46, 100].forEach((px) => {
    const url = thumbUrl(p?.profile?.profile_picture, px);
    if (url) Image.prefetch(url).catch(() => {});
  });
}

export function getCachedProfile(): FullUser | null {
  return mem;
}

export function setCachedProfile(p: FullUser) {
  mem = p;
  memAt = Date.now();
  warmAvatar(p);
}

export function clearProfileStore() {
  mem = null;
  memAt = 0;
  inflight = null;
}

export async function peekSavedProfile(): Promise<FullUser | null> {
  if (mem) return mem;
  try {
    const stored = await SecureStore.getItemAsync('user');
    const id = stored ? JSON.parse(stored)?.id : null;
    if (typeof id !== 'number') return null;
    const key = apiClient.getUri({ url: '/accounts/me/', method: 'get' });
    const saved = await readFromCache(id, key);
    if (saved && !mem) {
      mem = saved.data as FullUser;
      memAt = 0; // shown right away, but still refreshed from the server
      warmAvatar(mem);
    }
    return mem;
  } catch {
    return null;
  }
}

export async function loadProfile(force = false): Promise<FullUser> {
  if (!force && mem && Date.now() - memAt < FRESH_MS) return mem;
  if (inflight) return inflight;
  inflight = getMyProfile()
    .then((p) => {
      setCachedProfile(p);
      return p;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}