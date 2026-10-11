// mobile/src/api/cloudinary.ts
// Unsigned upload: no secrets in the app. The preset must be set to "Unsigned" in Cloudinary.
const CLOUD_NAME = 'ddyzfocil';
const UPLOAD_PRESET = 'tlequest_submissions';

export async function uploadSubmissionPhoto(uri: string): Promise<string> {
  return uploadImage(uri, 'submission');
}

// Quest cover photos reuse the same unsigned preset but go to their own folder.
export async function uploadCoverPhoto(uri: string): Promise<string> {
  return uploadImage(uri, 'cover', 'tlequest/covers');
}

async function uploadImage(uri: string, prefix: string, folder?: string): Promise<string> {
  const form = new FormData();
  form.append('file', {
    uri,
    type: 'image/jpeg',
    name: `${prefix}_${Date.now()}.jpg`,
  } as any);
  form.append('upload_preset', UPLOAD_PRESET);
  if (folder) form.append('asset_folder', folder);

  // Do not set Content-Type manually, fetch adds the multipart boundary itself
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const json = await res.json();
  if (!res.ok || !json.secure_url) {
    throw new Error(json?.error?.message || 'Photo upload failed.');
  }
  return json.secure_url as string;
}