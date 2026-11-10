// mobile/src/components/HowItWorks.tsx
// The illustrated "How it works" help (pictures + one short line each).
// Opened from a "How it works" row in Profile (student) and Settings (teacher).
// Pictures are drawn with plain Views and Ionicons, so no extra packages are needed.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, HEADER_BG, HEADER_TEXT } from '../theme/theme';
import { HELP_PAGES, GuideRole, HelpScene } from './GuideContent';

const PAGE = T('#F5EDD8');
const BROWN = T('#5C2C16');
const MUTED = T('#8A6A2A');
const GOLD = T('#F5B921');
const ORANGE = T('#EA580C');
const LINE = T('#EADEC9');
const GREEN = '#22C55E';
const DARK_GREEN = '#166534';
const BLUE = '#3E6FA3';
const INK = '#3A2B1A';

// ---------------------------------------------------------------- pictures
function Bar({ w, color = LINE, h = 10 }: { w: number | string; color?: string; h?: number }) {
  return <View style={{ width: w as any, height: h, borderRadius: h / 2, backgroundColor: color }} />;
}

function Diamond({ size = 54 }: { size?: number }) {
  return <View style={{ width: size, height: size, backgroundColor: BLUE, transform: [{ rotate: '45deg' }] }} />;
}

function Scene({ name }: { name: HelpScene }) {
  switch (name) {
    case 'tapQuest':
      return (
        <View style={{ width: 176, height: 104 }}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: 152, height: 86, borderRadius: 14, backgroundColor: BROWN, padding: 12, justifyContent: 'space-between' }}>
            <Bar w={56} color={GOLD} h={8} />
            <Bar w={100} color="#EBD9BF" h={8} />
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' }}>
              <View style={{ width: '50%', height: 8, borderRadius: 4, backgroundColor: GOLD }} />
            </View>
          </View>
          <View style={{ position: 'absolute', right: 0, bottom: 0, width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: GOLD, opacity: 0.55, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: GOLD }} />
          </View>
          <Ionicons name="hand-left" size={32} color={INK} style={{ position: 'absolute', right: 8, bottom: -6 }} />
        </View>
      );

    case 'oneStep':
      return (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="checkmark-circle" size={28} color={GREEN} />
            <Bar w={120} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="checkmark-circle" size={28} color={GREEN} />
            <Bar w={96} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: GOLD, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: INK }}>3</Text>
            </View>
            <View style={{ width: 138, height: 30, borderRadius: 10, borderWidth: 3, borderColor: GOLD, backgroundColor: '#FFF8E6', justifyContent: 'center', paddingHorizontal: 10 }}>
              <Bar w={78} color={BROWN} h={8} />
            </View>
          </View>
        </View>
      );

    case 'camera':
      return (
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: GOLD, opacity: 0.3 }} />
          <View style={{ position: 'absolute', width: 98, height: 98, borderRadius: 49, borderWidth: 4, borderColor: GOLD, opacity: 0.55 }} />
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="camera" size={36} color={GOLD} />
          </View>
        </View>
      );

    case 'frame': {
      const corner = { position: 'absolute' as const, width: 26, height: 26, borderColor: GOLD };
      return (
        <View style={{ width: 120, height: 112, alignItems: 'center', justifyContent: 'center' }}>
          <View style={[corner, { left: 0, top: 0, borderLeftWidth: 5, borderTopWidth: 5, borderTopLeftRadius: 8 }]} />
          <View style={[corner, { right: 0, top: 0, borderRightWidth: 5, borderTopWidth: 5, borderTopRightRadius: 8 }]} />
          <View style={[corner, { left: 0, bottom: 0, borderLeftWidth: 5, borderBottomWidth: 5, borderBottomLeftRadius: 8 }]} />
          <View style={[corner, { right: 0, bottom: 0, borderRightWidth: 5, borderBottomWidth: 5, borderBottomRightRadius: 8 }]} />
          <Diamond />
        </View>
      );
    }

    case 'tickChecklist':
      return (
        <View style={{ gap: 10 }}>
          {[true, true, false].map((on, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: on ? DARK_GREEN : BROWN, backgroundColor: on ? GREEN : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                {on && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Bar w={110} />
            </View>
          ))}
          <Ionicons name="hand-left" size={30} color={INK} style={{ position: 'absolute', right: -34, bottom: -4 }} />
        </View>
      );

    case 'unlockNext':
      return (
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <Ionicons key={i} name="checkbox" size={22} color={DARK_GREEN} />
            ))}
          </View>
          <View style={{ backgroundColor: BROWN, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Proceed to Next Step</Text>
            <Ionicons name="arrow-forward" size={16} color={GOLD} />
          </View>
        </View>
      );

    case 'allDone':
      return (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Ionicons name="trophy" size={52} color={GOLD} />
          <Text style={{ fontSize: 17, fontWeight: '900', color: BROWN, textAlign: 'center' }}>{'All Steps\nCompleted!'}</Text>
        </View>
      );

    case 'allowCamera':
      return (
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={{ backgroundColor: ORANGE, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="camera" size={18} color="#FFFFFF" />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Take a Photo</Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: MUTED }}>Allow camera?</Text>
            <View style={{ backgroundColor: BLUE, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>Allow</Text>
            </View>
          </View>
        </View>
      );

    case 'retake':
      return (
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={{ width: 120, height: 78, borderRadius: 12, backgroundColor: '#E4EDF7', alignItems: 'center', justifyContent: 'center' }}>
            <Diamond size={36} />
          </View>
          <View style={{ backgroundColor: ORANGE, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Retake</Text>
          </View>
        </View>
      );

    case 'submitNow':
      return (
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={{ backgroundColor: ORANGE, borderRadius: 12, paddingHorizontal: 26, paddingVertical: 11 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>Submit Now</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="sparkles" size={14} color={MUTED} />
            <Text style={{ fontSize: 12, fontStyle: 'italic', color: MUTED }}>Checking your output with AI...</Text>
          </View>
        </View>
      );

    case 'leader':
      return (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          {['#F7C9C0', '#FBE3A6'].map((c) => (
            <View key={c} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c }} />
          ))}
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="star" size={18} color={GOLD} />
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#CFE0F5', borderWidth: 3, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera" size={22} color="#1F4D7A" />
            </View>
          </View>
        </View>
      );

    case 'teacherChecks':
      return (
        <View style={{ width: 170, height: 100 }}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: 130, height: 72, borderRadius: 18, backgroundColor: '#DCFCE7', borderWidth: 3, borderColor: DARK_GREEN, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={44} color={DARK_GREEN} />
          </View>
          <View style={{ position: 'absolute', right: 0, bottom: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="person" size={22} color={GOLD} />
          </View>
        </View>
      );

    case 'rewards':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 26 }}>
          <Ionicons name="star" size={64} color={GOLD} />
          <Ionicons name="ribbon" size={58} color={ORANGE} />
        </View>
      );

    case 'classCode':
      return (
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={{ backgroundColor: BROWN, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 }}>
            <Text style={{ fontSize: 26, fontWeight: '900', letterSpacing: 5, color: GOLD }}>K7XQPM</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: MUTED }}>Class invite code</Text>
        </View>
      );

    case 'joinByCode':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Ionicons name="phone-portrait-outline" size={50} color={BROWN} />
          <Ionicons name="arrow-forward" size={26} color={MUTED} />
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#CFE0F5', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="people" size={36} color="#1F4D7A" />
          </View>
        </View>
      );

    case 'questSteps':
      return (
        <View style={{ gap: 8 }}>
          {[120, 96, 110].map((w, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: BROWN }} />
              <Bar w={w} />
              <View style={{ backgroundColor: '#FFF1C7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#6B4A00' }}>+10</Text>
              </View>
            </View>
          ))}
        </View>
      );

    case 'assignTo':
      return (
        <View style={{ flexDirection: 'row', gap: 14 }}>
          {['Group 1', 'Group 2'].map((g) => (
            <View key={g} style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: BROWN, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {['#F7C9C0', '#CFE0F5', '#FBE3A6'].map((c) => (
                  <View key={c} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c }} />
                ))}
              </View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: BROWN }}>{g}</Text>
            </View>
          ))}
        </View>
      );

    case 'checkPhoto':
      return (
        <View style={{ width: 150, height: 100 }}>
          <View style={{ width: 150, height: 100, borderRadius: 14, backgroundColor: '#E4EDF7', alignItems: 'center', justifyContent: 'center' }}>
            <Diamond size={46} />
          </View>
          <View style={{ position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Ionicons name="sparkles" size={11} color={DARK_GREEN} />
            <Text style={{ fontSize: 10, fontWeight: '800', color: DARK_GREEN }}>Looks correct · 92%</Text>
          </View>
        </View>
      );

    case 'decide':
      return (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ borderWidth: 2, borderColor: BROWN, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: BROWN }}>Ask to redo</Text>
          </View>
          <View style={{ backgroundColor: DARK_GREEN, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>Approve</Text>
          </View>
        </View>
      );
  }
}

// ---------------------------------------------------------------- the help screen
interface Props {
  visible: boolean;
  role: GuideRole;
  onClose: () => void;
}

export default function HowItWorks({ visible, role, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const pages = HELP_PAGES[role];
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (visible) setPage(0);
  }, [visible]);

  const isFirst = page === 0;
  const isLast = page === pages.length - 1;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
          <Text style={styles.headerTitle}>How it works</Text>
          <Text style={styles.headerSub}>A quick guide to TLEQuest</Text>
        </View>

        <ScrollView style={styles.cardScroll} contentContainerStyle={styles.card} showsVerticalScrollIndicator={false}>
          {pages[page].map((item) => (
            <View key={item.scene} style={styles.item}>
              <View style={styles.scene}>
                <Scene name={item.scene} />
              </View>
              <Text style={styles.caption}>{item.caption}</Text>
            </View>
          ))}
        </ScrollView>

        {!isLast ? (
          <TouchableOpacity
            style={styles.skipWrap}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Skip help"
          >
            <Text style={styles.skipText}>Skip help</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipWrap} />
        )}

        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <TouchableOpacity
            style={styles.circle}
            onPress={() => (isFirst ? onClose() : setPage((p) => p - 1))}
            accessibilityRole="button"
            accessibilityLabel={isFirst ? 'Close help' : 'Previous page'}
          >
            <Ionicons name={isFirst ? 'close' : 'chevron-back'} size={26} color={BROWN} />
          </TouchableOpacity>

          <View style={styles.dots}>
            {pages.map((_, i) => (
              <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
            ))}
          </View>

          {isLast ? (
            <TouchableOpacity style={styles.donePill} onPress={onClose} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Done">
              <Text style={styles.doneText}>Got it</Text>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.next}
              onPress={() => setPage((p) => p + 1)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Next page"
            >
              <Ionicons name="chevron-forward" size={30} color={GOLD} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** The "How it works" row for Profile / Settings. It opens the help screen by itself. */
export function HowItWorksRow({ role }: { role: GuideRole }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={styles.row}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="How it works"
      >
        <Ionicons name="help-circle-outline" size={20} color={BROWN} />
        <Text style={styles.rowText}>How it works</Text>
        <Ionicons name="chevron-forward" size={16} color={MUTED} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
      <HowItWorks visible={open} role={role} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE },
  header: { backgroundColor: HEADER_BG, paddingBottom: 48, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: HEADER_TEXT },
  headerSub: { fontSize: 13, color: HEADER_TEXT, opacity: 0.8, marginTop: 2 },

  cardScroll: { flex: 1, marginTop: -28, marginHorizontal: 20, backgroundColor: '#FFFFFF', borderRadius: 28, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  card: { padding: 18, gap: 18, flexGrow: 1, justifyContent: 'center' },
  item: { alignItems: 'center', gap: 10 },
  scene: { width: '100%', height: 140, borderRadius: 20, backgroundColor: PAGE, borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
  caption: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: BROWN, textAlign: 'center' },

  skipWrap: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  skipText: { fontSize: 15, fontWeight: '800', color: BROWN, textDecorationLine: 'underline' },

  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  circle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
  next: { width: 68, height: 68, borderRadius: 34, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center' },
  donePill: { height: 68, paddingHorizontal: 24, borderRadius: 34, backgroundColor: DARK_GREEN, flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneText: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: LINE },
  dotOn: { width: 24, backgroundColor: BROWN },

  row: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14 },
  rowText: { fontSize: 14, fontWeight: '800', color: BROWN },
});
