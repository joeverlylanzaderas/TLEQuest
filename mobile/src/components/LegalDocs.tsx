// mobile/src/components/LegalDocs.tsx
// Reads the Terms and the Privacy Policy.
//   <LegalReader />       the reading view (tabs + text), used inside other screens/modals
//   <LegalModal />        the same in a full-screen modal (login screen, Settings/Profile)
//   <LegalRow />          a "Terms & Privacy" row for Settings and Profile
//   <LegalLinks />        "By logging in you agree to ..." line with two tappable links
import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../theme/theme';
import { TERMS, PRIVACY, LegalDoc, EFFECTIVE_DATE } from '../legal/legalContent';

const PAGE = T('#F5EDD8');
const BROWN = T('#5C2C16');
const MUTED = T('#8A6A2A');
const GOLD = T('#F5B921');
const LINE = T('#EADEC9');

export type LegalTab = 'terms' | 'privacy';

export function LegalReader({
  initialTab = 'terms', onClose, closeLabel = 'Close',
}: {
  initialTab?: LegalTab;
  onClose: () => void;
  closeLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<LegalTab>(initialTab);
  const doc: LegalDoc = tab === 'terms' ? TERMS : PRIVACY;

  return (
    <View style={[styles.page, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel={closeLabel}>
          <Ionicons name="arrow-back" size={20} color={BROWN} />
          <Text style={styles.closeText}>{closeLabel}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['terms', 'privacy'] as const).map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.tab, tab === k && styles.tabOn]}
            onPress={() => setTab(k)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === k }}
          >
            <Text style={[styles.tabText, tab === k && styles.tabTextOn]}>{k === 'terms' ? 'Terms' : 'Privacy'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView key={tab} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.date}>Effective {EFFECTIVE_DATE}</Text>
        <Text style={styles.intro}>{doc.intro}</Text>
        {doc.sections.map((s) => (
          <View key={s.heading} style={{ marginTop: 18 }}>
            <Text style={styles.heading}>{s.heading}</Text>
            {s.paragraphs.map((p, i) => (
              <Text key={i} style={styles.para}>{p}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function LegalModal({
  visible, initialTab, onClose,
}: {
  visible: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LegalReader initialTab={initialTab} onClose={onClose} />
    </Modal>
  );
}

/** A row for Settings (teacher) and Profile (student). */
export function LegalRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={styles.row}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Terms and Privacy Policy"
      >
        <Ionicons name="shield-checkmark-outline" size={20} color={BROWN} />
        <Text style={styles.rowText}>Terms & Privacy Policy</Text>
        <Ionicons name="chevron-forward" size={16} color={MUTED} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
      <LegalModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** "By logging in, you agree to the Terms and Privacy Policy" with two tappable links (login screen). */
export function LegalLinks({ style }: { style?: any }) {
  const [tab, setTab] = useState<LegalTab | null>(null);
  return (
    <>
      <Text style={[styles.links, style]}>
        By logging in you agree to the{' '}
        <Text style={styles.link} onPress={() => setTab('terms')} accessibilityRole="link">Terms</Text>
        {' '}and the{' '}
        <Text style={styles.link} onPress={() => setTab('privacy')} accessibilityRole="link">Privacy Policy</Text>.
      </Text>
      <LegalModal visible={tab !== null} initialTab={tab ?? 'terms'} onClose={() => setTab(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE },
  topRow: { paddingHorizontal: 16, paddingBottom: 6 },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12 },
  closeText: { fontSize: 15, fontWeight: '800', color: BROWN },
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: LINE },
  tab: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: BROWN },
  tabText: { fontSize: 14, fontWeight: '800', color: BROWN },
  tabTextOn: { color: '#FFFFFF' },
  title: { fontSize: 26, fontWeight: '900', color: BROWN },
  date: { fontSize: 12, fontWeight: '700', color: MUTED, marginTop: 2, letterSpacing: 0.5 },
  intro: { fontSize: 15, lineHeight: 22, color: BROWN, marginTop: 12 },
  heading: { fontSize: 17, fontWeight: '800', color: BROWN, marginBottom: 6 },
  para: { fontSize: 15, lineHeight: 22, color: MUTED, marginBottom: 8 },

  row: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14 },
  rowText: { fontSize: 14, fontWeight: '800', color: BROWN },
  links: { fontSize: 12.5, lineHeight: 18, color: MUTED, textAlign: 'center' },
  link: { fontWeight: '800', color: BROWN, textDecorationLine: 'underline' },
});
