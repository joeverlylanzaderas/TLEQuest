// mobile/src/components/AlertHost.tsx
// Turns every plain Android/iOS Alert.alert(...) in the app into one themed popup,
// so "Missing info", "Delete Step", "Check the dates"... all look the same and match the app.
// Nothing else has to change: screens keep calling Alert.alert(title, message, buttons).
// Mount <AlertHost /> once, in app/_layout.tsx.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AlertButton, Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { activeTheme } from '../theme/theme';
import { Pop } from './Motion';

type Kind = 'warning' | 'danger' | 'error' | 'success' | 'info';

interface Req {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

const SCHOOL = activeTheme === 'school';
const PAGE = SCHOOL ? '#FAF6E8' : '#FBF6EC';
const TEXT = SCHOOL ? '#18303D' : '#3B2417';
const SOFT = SCHOOL ? '#4B6575' : '#7A6455';
const PRIMARY = SCHOOL ? '#1E4D8F' : '#EA580C';

const KINDS: Record<Kind, { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> = {
  warning: { icon: 'alert', bg: '#FFF1C7', fg: '#B45309' },
  danger: { icon: 'trash', bg: '#FDE2E0', fg: '#B3261E' },
  error: { icon: 'close-circle', bg: '#FDE2E0', fg: '#B3261E' },
  success: { icon: 'checkmark-circle', bg: '#DCF2E3', fg: '#166B3A' },
  info: { icon: 'information-circle', bg: '#D6E6F8', fg: '#1F4D7A' },
};

function pickKind(req: Req): Kind {
  if (req.buttons.some((b) => b.style === 'destructive')) return 'danger';
  const t = req.title.toLowerCase();
  if (/success|published|saved|updated|done/.test(t)) return 'success';
  if (/error|could not|failed|invalid|wrong/.test(t)) return 'error';
  if (/missing|needed|no \w+|nothing|check|not published|permission|required|discard|note/.test(t)) return 'warning';
  return 'info';
}

export default function AlertHost() {
  const [queue, setQueue] = useState<Req[]>([]);
  const original = useRef(Alert.alert);

  useEffect(() => {
    const orig = Alert.alert;
    original.current = orig;
    Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
      setQueue((q) => [
        ...q,
        { title, message, buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }] },
      ]);
    };
    return () => {
      Alert.alert = orig;
    };
  }, []);

  const current = queue[0] ?? null;
  const scale = useRef(new Animated.Value(0.9)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) return;
    scale.setValue(0.9);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [current]);

  const close = useCallback((button?: AlertButton) => {
    Animated.timing(fade, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      setQueue((q) => q.slice(1));
      // run the button's action after the popup is gone
      setTimeout(() => button?.onPress?.(), 0);
    });
  }, [fade]);

  if (!current) return null;
  const kind = KINDS[pickKind(current)];
  const buttons = current.buttons.slice(0, 3);
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const stacked = buttons.length > 2;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => close(cancelBtn)}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <Pop style={[styles.iconCircle, { backgroundColor: kind.bg }]}>
            <Ionicons name={kind.icon} size={30} color={kind.fg} />
          </Pop>
          <Text style={styles.title}>{current.title}</Text>
          {current.message ? <Text style={styles.message}>{current.message}</Text> : null}

          <View style={[styles.buttons, stacked && { flexDirection: 'column' }]}>
            {buttons.map((b, i) => {
              const isCancel = b.style === 'cancel';
              const isDanger = b.style === 'destructive';
              const label = !b.text || b.text === 'OK' ? 'Got it' : b.text;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  onPress={() => close(b)}
                  style={[
                    styles.btn,
                    stacked ? { alignSelf: 'stretch' } : { flex: 1 },
                    isCancel ? styles.btnOutline : { backgroundColor: isDanger ? '#B3261E' : PRIMARY },
                  ]}
                >
                  <Text style={[styles.btnText, isCancel && { color: TEXT }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, backgroundColor: PAGE, borderRadius: 26, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 20, alignItems: 'center' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: '900', color: TEXT, textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 20, color: SOFT, textAlign: 'center', marginTop: 8 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 22, alignSelf: 'stretch' },
  btn: { height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnOutline: { borderWidth: 2, borderColor: TEXT, backgroundColor: 'transparent' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
