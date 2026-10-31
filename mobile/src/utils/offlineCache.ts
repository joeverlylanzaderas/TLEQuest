// mobile/src/utils/offlineCache.ts
// Saves the answer of every successful GET request on the phone, so a screen
// can still show its last data when there is no signal.
import { dirFor, fileExists, isStorageAvailable, readJson, writeText, removePath } from './offlineStore';

const MAX_BYTES = 400_000;                       // skip very large answers
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;    // ignore data older than 14 days

interface CacheEntry {
  savedAt: number;
  data: unknown;
}

// Short, stable file name for a URL (djb2 hash)
function fileFor(userId: number | string, url: string): string {
  let hash = 5381;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) + hash + url.charCodeAt(i)) | 0;
  }
  return `${dirFor('cache', userId)}${(hash >>> 0).toString(36)}.json`;
}

export async function saveToCache(userId: number | string, url: string, data: unknown): Promise<void> {
  if (!isStorageAvailable()) return;
  try {
    const body = JSON.stringify({ savedAt: Date.now(), data } satisfies CacheEntry);
    if (body.length > MAX_BYTES) return;
    await writeText(fileFor(userId, url), body);
  } catch {
    // the cache is a bonus; never break a request because of it
  }
}

export async function readFromCache(
  userId: number | string,
  url: string
): Promise<{ data: unknown; savedAt: number } | null> {
  if (!isStorageAvailable()) return null;
  const entry = await readJson<CacheEntry>(fileFor(userId, url));
  if (!entry || typeof entry.savedAt !== 'number') return null;
  if (Date.now() - entry.savedAt > MAX_AGE_MS) return null;
  return { data: entry.data, savedAt: entry.savedAt };
}

export async function hasCache(userId: number | string, url: string): Promise<boolean> {
  if (!isStorageAvailable()) return false;
  return fileExists(fileFor(userId, url));
}

export async function clearCache(userId: number | string): Promise<void> {
  await removePath(dirFor('cache', userId));
}
