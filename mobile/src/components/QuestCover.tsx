// mobile/src/components/QuestCover.tsx
// A quest's cover photo, or the kitchen icon when the teacher didn't add one.
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import CachedImage from './CachedImage';
import { T } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  url?: string | null;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
}

export default function QuestCover({ url, style, iconSize = 26 }: Props) {
  return (
    <View
      style={[
       { backgroundColor: T('#B8895C'), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
        style,
      ]}
    >
      {url ? (
        <CachedImage uri={url} size={600} style={{ width: '100%', height: '100%' }} />
      ) : (
        <Ionicons name="restaurant" size={iconSize} color="#fff" />
      )}
    </View>
  );
}
