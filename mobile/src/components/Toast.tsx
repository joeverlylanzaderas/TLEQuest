// mobile/src/components/Toast.tsx
// One consistent way to confirm the result of an action (saved / failed).
//   const toast = useToast();
//   toast.success('Changes saved');
//   toast.error('Could not save changes.');
// Rule of thumb used across the app:
//   - Toast  -> the RESULT of an action (success or server failure)
//   - Alert  -> validation problems and destructive "Are you sure?" confirmations
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastKind = 'success' | 'error';

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi>({ success: () => {}, error: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const STYLES: Record<ToastKind, { bg: string; icon: 'checkmark-circle' | 'alert-circle' }> = {
  success: { bg: '#15803D', icon: 'checkmark-circle' },
  error: { bg: '#B3261E', icon: 'alert-circle' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ id: number; kind: ToastKind; message: string } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [opacity, translateY]);

  const show = useCallback((kind: ToastKind, message: string) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setToast({ id: Date.now(), kind, message });
    opacity.setValue(0);
    translateY.setValue(-20);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    // errors stay a bit longer so they can be read
    hideTimer.current = setTimeout(hide, kind === 'error' ? 4500 : 2500);
  }, [hide, opacity, translateY]);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const api = useMemo<ToastApi>(() => ({
    success: (m) => show('success', m),
    error: (m) => show('error', m),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.wrap, { top: insets.top + 8, opacity, transform: [{ translateY }] }]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={hide}
            style={[styles.toast, { backgroundColor: STYLES[toast.kind].bg }]}
          >
            <Ionicons name={STYLES[toast.kind].icon} size={20} color="#fff" />
            <Text style={styles.text}>{toast.message}</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 9999, elevation: 10 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  text: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700' },
});
