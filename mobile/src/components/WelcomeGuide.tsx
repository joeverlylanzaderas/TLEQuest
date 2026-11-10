// mobile/src/components/WelcomeGuide.tsx
// Shown once, the first time someone reaches their home area after logging in.
//  - student: the illustrated "How it works" guide (with Skip help)
//  - teacher: the 4-card welcome pop-up (unchanged)
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { T } from '../theme/theme';
import { hasSeenGuide, markGuideSeen } from '../utils/guideSeen';
import { WELCOME, GuideRole, TileColor } from './GuideContent';
import HowItWorks from './HowItWorks';

const BROWN = T('#5C2C16');
const MUTED = T('#8A6A2A');
const GOLD = T('#F5B921');
const LINE = T('#EADEC9');

const TILE: Record<TileColor, { bg: string; icon: string }> = {
  gold: { bg: GOLD, icon: '#3A2B1A' },
  brown: { bg: BROWN, icon: '#FFFFFF' },
  blue: { bg: '#3E6FA3', icon: '#FFFFFF' },
  green: { bg: '#166B3A', icon: '#FFFFFF' },
};

export default function WelcomeGuide({ role }: { role: GuideRole }) {
  return role === 'student' ? <StudentGuide /> : <TeacherWelcome />;
}

// ------------------------------------------------------------------ student
function StudentGuide() {
  const { user } = useAuth();
  const userId = user?.id;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (userId == null) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    hasSeenGuide(userId).then((seen) => {
      console.log('[WelcomeGuide] user', userId, 'already seen:', seen);
      if (alive && !seen) {
        // Wait a moment: a screen opened while the page is still sliding in
        // after login can be dropped on some Android phones.
        timer = setTimeout(() => {
          if (alive) setVisible(true);
        }, 700);
      }
    });
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [userId]);

  function finish() {
    setVisible(false);
    if (userId != null) markGuideSeen(userId);
  }

  return <HowItWorks visible={visible} role="student" onClose={finish} />;
}

// ------------------------------------------------------------------ teacher (as before)
function TeacherWelcome() {
  const { user } = useAuth();
  const userId = user?.id;
  const slides = WELCOME.teacher;
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (userId == null) return;
    let alive = true;
    hasSeenGuide(userId).then((seen) => {
      if (alive && !seen) {
        setIndex(0);
        setVisible(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  function finish() {
    setVisible(false);
    if (userId != null) markGuideSeen(userId);
  }

  const slide = slides[index];
  const isLast = index === slides.length - 1;
  const tile = TILE[slide.color];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={finish}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <Text style={styles.counter}>{index + 1} OF {slides.length}</Text>
            <TouchableOpacity
              onPress={finish}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Skip the guide"
            >
              <Text style={styles.skip}>Skip</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.tile, { backgroundColor: tile.bg }]}>
            <Ionicons name={slide.icon} size={64} color={tile.icon} />
          </View>

          <View style={styles.textBox}>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>

          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, isLast && styles.buttonLast]}
            onPress={() => (isLast ? finish() : setIndex((i) => i + 1))}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, isLast && styles.buttonTextLast]}>
              {isLast ? "Let's start" : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(40,22,12,0.62)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: '#FFFFFF', borderRadius: 28, padding: 24, alignItems: 'center' },
  topRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: MUTED },
  skip: { fontSize: 14, fontWeight: '800', color: BROWN },
  tile: { width: 132, height: 132, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  textBox: { minHeight: 116, alignItems: 'center', marginTop: 18 },
  title: { fontSize: 24, fontWeight: '900', color: BROWN, textAlign: 'center', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22, color: MUTED, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center', marginVertical: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: LINE },
  dotOn: { width: 24, backgroundColor: BROWN },
  button: { width: '100%', height: 52, borderRadius: 14, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center' },
  buttonLast: { backgroundColor: GOLD },
  buttonText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  buttonTextLast: { color: '#3A2B1A' },
});
