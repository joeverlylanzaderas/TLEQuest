// mobile/src/components/Avatar.tsx
// One avatar for other people's photos (classmates, group members).
//  - The coloured circle with the first letter is ALWAYS there, so while the photo is still
//    downloading you see the initial instead of an empty ring; the photo fades in over it.
//  - Every person is requested at ONE small size (see AVATAR_PX), so the same download is reused by
//    the classmate strip, the popup, the group card and the group screen.
//  - prefetchAvatars(...) downloads the photos early (call it as soon as the list is known).
import React from 'react';
import { Image, Text, View, StyleProp, ViewStyle } from 'react-native';
import { thumbUrl } from '../utils/media';

export const AVATAR_PX = 84; // asks Cloudinary for ~252px, sharp enough for every size used (up to 84)

export const avatarUrl = (picture?: string | null) => thumbUrl(picture, AVATAR_PX);

export function prefetchAvatars(pictures: Array<string | null | undefined>) {
  const seen = new Set<string>();
  pictures.forEach((p) => {
    const url = avatarUrl(p);
    if (url && !seen.has(url)) {
      seen.add(url);
      Image.prefetch(url).catch(() => {});
    }
  });
}

interface Props {
  picture?: string | null;
  name: string;
  size: number;
  color?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ picture, name, size, color = '#f87171', textColor = '#fff', style }: Props) {
  const uri = avatarUrl(picture);
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
        style,
      ]}
    >
      <Text style={{ fontSize: size * 0.4, fontWeight: '800', color: textColor }}>
        {(name || '?').charAt(0).toUpperCase()}
      </Text>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ position: 'absolute', top: 0, left: 0, width: size, height: size }}
          resizeMode="cover"
          fadeDuration={150}
        />
      ) : null}
    </View>
  );
}
