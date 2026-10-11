// mobile/src/components/KeyboardSafe.tsx
import React from 'react';
import { KeyboardAvoidingView, StyleProp, ViewStyle } from 'react-native';

// Lifts its content above the on-screen keyboard on BOTH Android and iOS.
// (The app runs edge-to-edge on Android, where the OS no longer resizes the
// window for the keyboard, so KeyboardAvoidingView must do it with 'padding'.)
export default function KeyboardSafe({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <KeyboardAvoidingView style={[{ flex: 1 }, style]} behavior="padding">
      {children}
    </KeyboardAvoidingView>
  );
}
