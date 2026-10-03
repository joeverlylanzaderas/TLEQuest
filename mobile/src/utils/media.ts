// mobile/src/utils/media.ts
import { BASE_URL } from '../api/client';

// BASE_URL is like "http://192.168.1.37:8000/api" — media files are served
// from the server root (e.g. "http://192.168.1.37:8000/media/..."), not
// under /api, so we strip the "/api" suffix to get the plain origin.
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