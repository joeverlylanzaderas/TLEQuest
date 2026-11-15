// mobile/src/components/ConsentGate.tsx
// Blocks the student / teacher area until the user has agreed to the current Terms and Privacy Policy.
//   - Wrap the whole area once, in app/(student)/_layout.tsx and app/(teacher)/_layout.tsx.
//   - Asked once per policy version. The answer is saved on the server (with date and version) and on the phone.
//   - Works offline: an agreement made without internet is sent to the server later.
//   - Declining logs the user out.
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, Switch, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { T } from '../theme/theme';
import { getConsent, acceptConsent } from '../api/accounts';
import { readLocalConsent, writeLocalConsent } from '../utils/consentStore';
import { POLICY_VERSION, APP_NAME } from '../legal/legalContent';
import { LegalReader, LegalTab } from './LegalDocs';

const PAGE = T('#F5EDD8');
const BROWN = T('#5C2C16');
const MUTED = T('#8A6A2A');
const GOLD = T('#F5B921');
const LINE = T('#EADEC9');

type Status = 'checking' | 'needed' | 'ok';

export default function ConsentGate({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<Status>('checking');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState<LegalTab | null>(null);

  // Tell the server (best effort). Marks the phone copy as synced when it worked.
  const syncToServer = useCallback(async () => {
    if (userId == null) return;
    try {
      await acceptConsent(POLICY_VERSION);
      await writeLocalConsent(userId, { version: POLICY_VERSION, synced: true });
    } catch {
      // offline or server problem: we try again the next time the app opens
    }
  }, [userId]);

  useEffect(() => {
    if (userId == null) return;
    let alive = true;
    setStatus('checking');
    setAgreed(false);
    setReading(null);
    (async () => {
      const local = await readLocalConsent(userId);
      const agreedHere = local?.version === POLICY_VERSION;
      if (agreedHere) {
        // never make the user wait: let them in now, and make sure the server knows
        if (alive) setStatus('ok');
        if (!local!.synced) syncToServer();
        return;
      }
      try {
        const s = await getConsent();
        if (!alive) return;
        if (s.accepted) {
          await writeLocalConsent(userId, { version: POLICY_VERSION, synced: true });
          setStatus('ok');
        } else {
          setStatus('needed');
        }
      } catch {
        if (alive) setStatus('needed'); // no answer from the server: ask (the agreement is saved offline)
      }
    })();
    return () => { alive = false; };
  }, [userId, syncToServer]);

  async function accept() {
    if (userId == null || !agreed || busy) return;
    setBusy(true);
    await writeLocalConsent(userId, { version: POLICY_VERSION, synced: false });
    setStatus('ok');
    setBusy(false);
    syncToServer();
  }

  if (status === 'ok') return <>{children}</>;

  return (
    <View style={styles.blank}>
      {status === 'checking' ? <ActivityIndicator color={BROWN} /> : null}
      <Modal visible={status === 'needed'} animationType="fade" onRequestClose={() => {}}>
        {reading ? (
          <LegalReader initialTab={reading} onClose={() => setReading(null)} closeLabel="Back" />
        ) : (
          <View style={[styles.page, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
            <ScrollView contentContainerStyle={styles.scroll}>
              <View style={styles.badge}>
                <Ionicons name="shield-checkmark" size={34} color={BROWN} />
              </View>
              <Text style={styles.title}>Before you start</Text>
              <Text style={styles.lead}>
                Please read how {APP_NAME} works and how it handles your information.
              </Text>

              <View style={styles.points}>
                <Point icon="school-outline" text="TLEQuest is a learning helper. Your teacher makes the final decision on your work." />
                <Point icon="camera-outline" text="We keep your name, class, progress and the photos your group submits, for learning and teacher review." />
                <Point icon="lock-closed-outline" text="Only your teacher and the app administrators can see them. We never sell your data." />
              </View>

              <TouchableOpacity style={styles.linkRow} onPress={() => setReading('terms')} accessibilityRole="button">
                <Text style={styles.linkText}>Read the Terms and Conditions</Text>
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkRow} onPress={() => setReading('privacy')} accessibilityRole="button">
                <Text style={styles.linkText}>Read the Privacy Policy</Text>
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.agreeRow} activeOpacity={0.8} onPress={() => setAgreed((v) => !v)} accessibilityRole="switch" accessibilityState={{ checked: agreed }}>
                <Switch
                  value={agreed}
                  onValueChange={setAgreed}
                  trackColor={{ false: '#D8CBB4', true: GOLD }}
                  thumbColor="#FFFFFF"
                />
                <Text style={styles.agreeText}>I have read and agree to the Terms and Conditions and the Privacy Policy.</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.cta, !agreed && styles.ctaOff]}
              onPress={accept}
              disabled={!agreed || busy}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ disabled: !agreed }}
            >
              <Text style={[styles.ctaText, !agreed && styles.ctaTextOff]}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.decline} onPress={signOut} accessibilityRole="button">
              <Text style={styles.declineText}>Decline and log out</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </View>
  );
}

function Point({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.point}>
      <Ionicons name={icon} size={22} color={BROWN} />
      <Text style={styles.pointText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: PAGE, alignItems: 'center', justifyContent: 'center' },
  page: { flex: 1, backgroundColor: PAGE, paddingHorizontal: 20 },
  scroll: { paddingBottom: 16 },
  badge: { width: 64, height: 64, borderRadius: 32, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 8 },
  title: { fontSize: 28, fontWeight: '900', color: BROWN, textAlign: 'center', marginTop: 14 },
  lead: { fontSize: 15, lineHeight: 22, color: MUTED, textAlign: 'center', marginTop: 6 },
  points: { marginTop: 18, gap: 12 },
  point: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14 },
  pointText: { flex: 1, fontSize: 14.5, lineHeight: 21, color: BROWN },
  linkRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, borderWidth: 1.5, borderColor: LINE, paddingHorizontal: 14, height: 50 },
  linkText: { fontSize: 15, fontWeight: '800', color: BROWN },
  agreeRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14 },
  agreeText: { flex: 1, fontSize: 14.5, lineHeight: 21, fontWeight: '700', color: BROWN },
  cta: { height: 54, borderRadius: 16, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center' },
  ctaOff: { backgroundColor: '#E4D8C2' },
  ctaText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  ctaTextOff: { color: '#A99774' },
  decline: { alignSelf: 'center', paddingVertical: 14 },
  declineText: { fontSize: 14, fontWeight: '700', color: MUTED, textDecorationLine: 'underline' },
});
