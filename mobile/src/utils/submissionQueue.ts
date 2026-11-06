// mobile/src/utils/submissionQueue.ts
// "Outbox" for final-output submissions.
//
// A submission is first SAVED ON THE PHONE (photo + AI result), and only then
// sent. If the signal is gone, it just waits and is sent automatically later,
// so the student never has to retake the photo.
//
// Steps for each saved submission: upload the photo -> create the submission.
// Duplicate protection: if the app is not sure the server already received the
// submission (the answer got lost), it checks the server for the same photo
// before sending again.
import { apiClient } from '../api/client';
import { createSubmission } from '../api/submissions';
import { prepareForUpload, uploadPhotoAsIs } from '../api/cloudinary';
import {
  dirFor, ensureDirectory, copyFile, readJson, writeJson, removePath, createLock, isStorageAvailable,
} from './offlineStore';
import { setPendingCount, markOnline } from './networkStatus';

export interface QueuedSubmission {
  id: string;
  quest_assignment: number;
  classifier_result: string;
  confidence_score: number;
  generated_feedback: string;
  photoUri: string;          // small copy kept in the app's own storage
  imageUrl?: string;         // set once the photo is uploaded
  postAttempted?: boolean;   // we already tried to create the submission
  attempts?: number;         // failures that were not "no signal"
  failedMessage?: string;    // set when it can never be sent (for example no longer allowed)
  createdAt: number;
}

export type NewQueuedSubmission = Pick<
  QueuedSubmission,
  'quest_assignment' | 'classifier_result' | 'confidence_score' | 'generated_feedback'
>;

export type ItemStatus =
  | { state: 'sent' }
  | { state: 'pending' }
  | { state: 'failed'; message: string };

const MAX_UNKNOWN_ATTEMPTS = 5;

const fileLock = createLock();   // short jobs that touch queue.json
const flushLock = createLock();  // only one sending run at a time

const queueFile = (userId: number) => `${dirFor('outbox', userId)}queue.json`;

async function loadQueue(userId: number): Promise<QueuedSubmission[]> {
  return (await readJson<QueuedSubmission[]>(queueFile(userId))) ?? [];
}

async function saveQueue(userId: number, items: QueuedSubmission[]): Promise<void> {
  await writeJson(queueFile(userId), items);
  setPendingCount(items.filter((item) => !item.failedMessage).length);
}

function patchItem(userId: number, id: string, patch: Partial<QueuedSubmission>) {
  return fileLock(async () => {
    const items = await loadQueue(userId);
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return;
    items[index] = { ...items[index], ...patch };
    await saveQueue(userId, items);
  });
}

function removeItem(userId: number, id: string) {
  return fileLock(async () => {
    const items = await loadQueue(userId);
    const item = items.find((i) => i.id === id);
    await saveQueue(userId, items.filter((i) => i.id !== id));
    if (item) await removePath(item.photoUri);
  });
}

/** Save a submission on the phone. Returns the saved item (not sent yet). */
export async function enqueueSubmission(
  userId: number,
  data: NewQueuedSubmission,
  takenPhotoUri: string
): Promise<QueuedSubmission> {
  if (!isStorageAvailable()) {
    throw new Error('This device cannot save the photo for later. Please try again with signal.');
  }
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const dir = dirFor('outbox', userId);
  await ensureDirectory(dir);

  const small = await prepareForUpload(takenPhotoUri);
  const photoUri = `${dir}${id}.jpg`;
  await copyFile(small, photoUri);

  return fileLock(async () => {
    const items = await loadQueue(userId);
    const item: QueuedSubmission = { id, ...data, photoUri, createdAt: Date.now() };
    items.push(item);
    await saveQueue(userId, items);
    return item;
  });
}

export async function getItemStatus(userId: number, id: string): Promise<ItemStatus> {
  const item = (await loadQueue(userId)).find((i) => i.id === id);
  if (!item) return { state: 'sent' };
  if (item.failedMessage) return { state: 'failed', message: item.failedMessage };
  return { state: 'pending' };
}

export function discardSubmission(userId: number, id: string) {
  return removeItem(userId, id);
}

/** Update the "waiting to be sent" count (call when the app starts). */
export async function refreshPendingCount(userId: number): Promise<void> {
  const items = await loadQueue(userId);
  setPendingCount(items.filter((item) => !item.failedMessage).length);
}

/**
 * Submissions that could never be sent (and are a while old) are removed and
 * their messages returned, so the student can be told once.
 */
export function takeOldFailures(userId: number, olderThanMs: number): Promise<string[]> {
  return fileLock(async () => {
    const items = await loadQueue(userId);
    const old = items.filter((i) => i.failedMessage && Date.now() - i.createdAt > olderThanMs);
    if (old.length === 0) return [];
    await saveQueue(userId, items.filter((i) => !old.includes(i)));
    for (const item of old) await removePath(item.photoUri);
    return old.map((i) => i.failedMessage as string);
  });
}

// --- error handling -------------------------------------------------------

type ErrorKind = 'network' | 'permanent' | 'unknown';

function classify(e: any): ErrorKind {
  if (e?.permanent) return 'permanent';
  if (e?.retryable) return 'network';
  if (e?.isAxiosError) {
    const status = e.response?.status;
    // No answer, server trouble, "slow down", or session needs a login: wait and try again
    if (!status || status >= 500 || [401, 408, 429].includes(status)) return 'network';
    return 'permanent'; // the server said no (for example 400, 403, 404)
  }
  return 'unknown';
}

function errorMessage(e: any): string {
  const data = e?.response?.data;
  if (data) {
    if (data.detail) return String(data.detail);
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof data === 'string') return data;
  }
  return e?.message || 'Could not send the submission.';
}

// --- sending ---------------------------------------------------------------

async function doFlush(userId: number): Promise<void> {
  const items = await fileLock(() => loadQueue(userId));

  for (const item of items) {
    if (item.failedMessage) continue;
    try {
      // 1. Upload the photo (once)
      let imageUrl = item.imageUrl;
      if (!imageUrl) {
        imageUrl = await uploadPhotoAsIs(item.photoUri);
        await patchItem(userId, item.id, { imageUrl });
      }

      // 2. If an earlier try may have reached the server, check before sending again
      let alreadySent = false;
      if (item.postAttempted) {
        const res = await apiClient.get('/submissions/submissions/', { _skipCache: true } as any);
        const list: any[] = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
        alreadySent = list.some((s) => s.image_url === imageUrl);
      }

      // 3. Create the submission
      if (!alreadySent) {
        await patchItem(userId, item.id, { postAttempted: true });
        await createSubmission({
          quest_assignment: item.quest_assignment,
          image_url: imageUrl,
          classifier_result: item.classifier_result,
          confidence_score: item.confidence_score,
          generated_feedback: item.generated_feedback,
        });
      }

      await removeItem(userId, item.id);
      markOnline();
    } catch (e: any) {
      const kind = classify(e);
      if (kind === 'network') break; // still no signal: keep everything and try later
      if (kind === 'permanent') {
        await patchItem(userId, item.id, { failedMessage: errorMessage(e) });
      } else {
        const attempts = (item.attempts ?? 0) + 1;
        await patchItem(
          userId,
          item.id,
          attempts >= MAX_UNKNOWN_ATTEMPTS ? { attempts, failedMessage: errorMessage(e) } : { attempts }
        );
      }
    }
  }
}

/** Try to send everything that is waiting. Safe to call at any time. */
export function flushQueue(userId: number): Promise<void> {
  return flushLock(() => doFlush(userId));
}
