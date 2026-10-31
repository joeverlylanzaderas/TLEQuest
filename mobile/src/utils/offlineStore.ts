// mobile/src/utils/offlineStore.ts
// Tiny helpers for saving JSON and files on the phone (used by the offline
// cache and the submission queue). Everything lives under one folder inside
// the app's private storage, grouped per user, so two people sharing one phone
// never see each other's data.
import * as FileSystem from 'expo-file-system/legacy';

const ROOT = `${FileSystem.documentDirectory ?? ''}tlequest/`;

export function isStorageAvailable(): boolean {
  return !!FileSystem.documentDirectory;
}

export function dirFor(kind: 'cache' | 'outbox', userId: number | string): string {
  return `${ROOT}${kind}/${userId}/`;
}

function parentDir(uri: string): string {
  return uri.slice(0, uri.lastIndexOf('/') + 1);
}

export async function ensureDirectory(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export async function fileExists(uri: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}

/** Reads a JSON file. A missing or damaged file gives null, never an error. */
export async function readJson<T>(uri: string): Promise<T | null> {
  try {
    if (!(await fileExists(uri))) return null;
    return JSON.parse(await FileSystem.readAsStringAsync(uri)) as T;
  } catch {
    return null;
  }
}

export async function writeText(uri: string, text: string): Promise<void> {
  await ensureDirectory(parentDir(uri));
  await FileSystem.writeAsStringAsync(uri, text);
}

export async function writeJson(uri: string, value: unknown): Promise<void> {
  await writeText(uri, JSON.stringify(value));
}

export async function copyFile(from: string, to: string): Promise<void> {
  await ensureDirectory(parentDir(to));
  await FileSystem.copyAsync({ from, to });
}

export async function removePath(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // nothing to clean up
  }
}

/** Runs async jobs one after another (a simple lock). */
export function createLock() {
  let tail: Promise<unknown> = Promise.resolve();
  return function run<T>(job: () => Promise<T>): Promise<T> {
    const next = tail.then(job, job);
    tail = next.catch(() => undefined);
    return next;
  };
}
