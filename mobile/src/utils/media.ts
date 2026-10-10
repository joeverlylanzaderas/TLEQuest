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