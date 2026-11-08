// mobile/src/components/OfflineBanner.tsx
// A small floating note at the top of the screen. It only shows when there is
// no signal, or when submissions are waiting on the phone to be sent.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T } from '../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../utils/networkStatus';

function ageText(savedAt: number): string {
  const minutes = Math.max(1, Math.round((Date.now() - savedAt) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export default function OfflineBanner() {
  const { offline, cachedAt, pending } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  if (!offline && pending === 0) return null;

  const waiting =
    pending > 0 ? `${pending} submission${pending > 1 ? 's' : ''} waiting to be sent.` : '';

  let message: string;
  if (offline && cachedAt) {
    message = `No signal. Showing saved data (${ageText(cachedAt)}). ${waiting}`.trim();
  } else if (offline) {
    message = `No signal. Please check your connection. ${waiting}`.trim();
  } else {
    message = waiting;
  }

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 6 }]}>
      <View style={styles.pill}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 999, elevation: 999 },
  pill: { backgroundColor: T('#5C2C16'), borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, maxWidth: '92%' },
  text: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
