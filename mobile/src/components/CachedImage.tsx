// mobile/src/components/CachedImage.tsx
// Fast image for avatars, covers and thumbnails.
//  - asks Cloudinary for a small copy (w_160 instead of the full 1-4 MB original)
//  - expo-image keeps it on the phone's disk, so it loads instantly the next time
//    (even after the screen is closed and reopened)
// Do NOT use this for the full-size submission photos teachers review.
import React from 'react';
import { Image, ImageProps } from 'expo-image';

/** Adds a Cloudinary resize to the URL. Other URLs (local file, non-Cloudinary) are returned as is. */
export function optimizeUrl(url: string, width: number, square = false): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  // already has a transformation? leave it
  if (/\/upload\/(?:[a-z]{1,3}_[^/]*,?)+\//.test(url)) return url;
  const t = square
    ? `w_${width},h_${width},c_fill,g_auto,q_auto,f_auto`
    : `w_${width},c_limit,q_auto,f_auto`;
  return url.replace('/upload/', `/upload/${t}/`);
}

interface Props extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  /** target width in pixels (the picture is shown small, so 160 is plenty for an avatar) */
  size?: number;
  /** crop to a square around the face (use for avatars) */
  square?: boolean;
}

export default function CachedImage({ uri, size = 400, square = false, style, contentFit = 'cover', ...rest }: Props) {
  if (!uri) return null;
  return (
    <Image
      source={{ uri: optimizeUrl(uri, size, square) }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={120}
      recyclingKey={uri}
      {...rest}
    />
  );
}
