// mobile/src/utils/media.ts
import { BASE_URL } from '../api/client';

const SERVER_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

/**
 * Converts a relative media path (e.g. "/media/badges/x.png") returned by
 * Django into a full URL the <Image> component can load. Returns null if
 * there's no path (e.g. user hasn't set a profile picture yet).
 */
export function getMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${SERVER_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Small version of a picture, for avatars. Profile pictures live on Cloudinary, which can
 * hand out a resized copy through the URL, so a 5 MB photo is shown as a ~15 KB square.
 * `px` is the size it will be shown at; it is multiplied by 3 for sharp screens.
 * Any other kind of URL is returned unchanged.
 */
export function thumbUrl(path: string | null | undefined, px = 48): string | null {
  const url = getMediaUrl(path);
  if (!url) return null;
  const m = url.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
  if (!m) return url;
  // Already has a transformation in it (anything that is not a version number like v1234/): leave it
  if (!/^v\d+\//.test(m[2]) && /^[a-z]{1,3}_/.test(m[2])) return url;
  const size = Math.min(512, Math.max(64, Math.round(px * 3)));
  return `${m[1]}c_fill,g_face,w_${size},h_${size},f_jpg,q_auto/${m[2]}`;
}