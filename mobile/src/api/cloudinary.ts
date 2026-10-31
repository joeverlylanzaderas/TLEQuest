// mobile/src/api/cloudinary.ts
// Unsigned upload: no secrets in the app. The preset must be set to "Unsigned" in Cloudinary.
import * as ImageManipulator from 'expo-image-manipulator';

const CLOUD_NAME = 'ddyzfocil';
const UPLOAD_PRESET = 'tlequest_submissions';

// Slow-signal settings. The raw camera photo can be several MB, so it is
// shrunk before upload. The AI check runs on the ORIGINAL photo (see
// SubmitOutputCard), so this does not change the AI result.
const MAX_WIDTH = 1280;          // px, plenty for the teacher to review the table setup
const JPEG_QUALITY = 0.65;       // 0-1
const UPLOAD_TIMEOUT_MS = 60000; // give up on one attempt after 60 seconds
const MAX_ATTEMPTS = 2;          // 1 try + 1 retry on a weak connection

const WEAK_SIGNAL_MESSAGE = 'Weak or no signal. Please check your connection and try again.';

/** Resize + compress the photo. If anything goes wrong, fall back to the original. */
export async function prepareForUpload(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_WIDTH } }],
      { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    return uri;
  }
}

// A plain flag is used instead of an Error subclass, because `instanceof`
// on custom errors is not reliable in every React Native build.
function retryableError(message: string): Error {
  const err: any = new Error(message);
  err.retryable = true;
  return err;
}

async function uploadOnce(uri: string): Promise<string> {
  const form = new FormData();
  form.append('file', {
    uri,
    type: 'image/jpeg',
    name: `submission_${Date.now()}.jpg`,
  } as any);
  form.append('upload_preset', UPLOAD_PRESET);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  let res: Response;
  try {
    // Do not set Content-Type manually, fetch adds the multipart boundary itself
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
  } catch {
    // Timeout (abort) or no connection at all: worth trying again
    throw retryableError(WEAK_SIGNAL_MESSAGE);
  } finally {
    clearTimeout(timer);
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // Body was cut off or not JSON
  }

  if (res.ok && json?.secure_url) return json.secure_url as string;

  // Server problems (5xx) may pass on a second try; 4xx means the request itself is wrong
  if (res.status >= 500) throw retryableError(WEAK_SIGNAL_MESSAGE);
  // The request itself was rejected (for example a wrong upload preset): retrying will not help
  const rejected: any = new Error(json?.error?.message || 'Photo upload failed.');
  rejected.permanent = true;
  throw rejected;
}

/** Upload a photo that is already small (used by the offline queue, which compresses it when saving). */
export async function uploadPhotoAsIs(uri: string): Promise<string> {
  let lastError: Error = new Error('Photo upload failed.');
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await uploadOnce(uri);
    } catch (e: any) {
      lastError = e;
      if (!e?.retryable || attempt === MAX_ATTEMPTS) break;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  throw lastError;
}

export async function uploadSubmissionPhoto(uri: string): Promise<string> {
  const smallUri = await prepareForUpload(uri); // compress once, reuse on retry
  return uploadPhotoAsIs(smallUri);
}
