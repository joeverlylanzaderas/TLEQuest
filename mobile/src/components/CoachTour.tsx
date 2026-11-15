// mobile/src/components/CoachTour.tsx
// The guided tour (teacher and student): a dimmed screen with ONE part lit up and a card that explains it.
//
//   <CoachProvider role="teacher">  wrap a role's area once (app/(teacher)/_layout.tsx, app/(student)/_layout.tsx)
//   const target = useCoachTarget();   in a screen:  <View {...target('review-tabs')}> ... </View>
//   useScreenTour('teacher-review');  (student: 'student-quests', ...)   in a screen: shows that screen's tip the first time it opens
//   <GuidedTourRow />          Settings/Profile rows: replay the tour / show the tips again
//
// Every tour can be skipped. If a lit-up part cannot be found (for example an empty list),
// the card is simply shown in the middle of the screen, so the tour never gets stuck.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { T } from '../theme/theme';
import { hasSeenGuide } from '../utils/guideSeen';
import { hasSeenTour, markTourSeen, resetTours, tipsAreOff, setTipsOff } from '../utils/coachSeen';
import { COACH_TOURS, MAIN_TOUR_IDS, TIPS_COVERED_BY_MAIN_TOUR, tourIdsFor, CoachRole, CoachStep } from './CoachContent';

const BROWN = T('#5C2C16');
const MUTED = T('#8A6A2A');
const GOLD = T('#F5B921');
const LINE = T('#EADEC9');
const DIM = 'rgba(40,22,12,0.74)';
const PAD = 6; // breathing room around the lit-up part

interface Rect { x: number; y: number; w: number; h: number }

interface CoachApi {
  role: CoachRole;
  /** id of this role's full tour */
  mainTourId: string;
  register: (id: string, node: any) => void;
  /** Start a tour now (also used by the "Guided tour" row in Settings). */
  start: (tourId: string) => void;
  /** Start a tour only if this user has not seen it yet. */
  startOnce: (tourId: string) => void;
  /** Forget what was shown and turn the tips back on. */
  resetTips: () => Promise<void>;
}

const CoachContext = createContext<CoachApi | null>(null);

export function useCoach(): CoachApi | null {
  return useContext(CoachContext);
}

/** target('id') -> props to spread on a <View> so the tour can light it up. Safe without a provider. */
export function useCoachTarget() {
  const coach = useCoach();
  const register = coach?.register;
  return useCallback(
    (id: string) => ({
      ref: (node: any) => register?.(id, node),
      collapsable: false as const,
    }),
    [register]
  );
}

/** Put in a screen: its tip shows the first time the user opens it. */
export function useScreenTour(tourId: string) {
  const coach = useCoach();
  const startOnce = coach?.startOnce;
  useFocusEffect(
    useCallback(() => {
      startOnce?.(tourId);
    }, [startOnce, tourId])
  );
}

// ------------------------------------------------------------------ provider
export function CoachProvider({ children, role = 'teacher' }: { children: React.ReactNode; role?: CoachRole }) {
  const MAIN_TOUR_ID = MAIN_TOUR_IDS[role];
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();

  const targets = useRef(new Map<string, any>());
  const startedThisSession = useRef(new Set<string>());
  const lastRoute = useRef<string | null>(null); // the screen the tour last opened
  const [tourId, setTourId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const activeRef = useRef<string | null>(null);
  activeRef.current = tourId;

  const register = useCallback((id: string, node: any) => {
    if (node) targets.current.set(id, node);
    else targets.current.delete(id);
  }, []);

  const open = useCallback((id: string) => {
    startedThisSession.current.add(id);
    lastRoute.current = null; // the first step always opens its screen
    setIndex(0);
    setTourId(id);
  }, []);

  const start = useCallback((id: string) => {
    if (COACH_TOURS[id]) open(id);
  }, [open]);

  const startOnce = useCallback((id: string) => {
    const def = COACH_TOURS[id];
    if (userId == null || !def || startedThisSession.current.has(id) || activeRef.current) return;
    (async () => {
      if (def.kind === 'tips' && (await tipsAreOff(userId))) return;
      if (await hasSeenTour(userId, id)) return;
      setTimeout(() => {
        if (!activeRef.current && !startedThisSession.current.has(id)) open(id);
      }, 600); // let the screen finish sliding in first
    })();
  }, [userId, open]);

  const resetTips = useCallback(async () => {
    if (userId == null) return;
    startedThisSession.current.clear();
    await resetTours(userId, tourIdsFor(role));
  }, [userId, role]);

  // Teachers who already saw the old welcome pop-up get the guided tour once, too.
  // (A brand-new teacher gets it right after the welcome pop-up, see WelcomeGuide.tsx.)
  useEffect(() => {
    if (userId == null) return;
    let alive = true;
    (async () => {
      if (!(await hasSeenGuide(userId))) return;
      if (await hasSeenTour(userId, MAIN_TOUR_ID)) return;
      setTimeout(() => {
        if (alive && !activeRef.current && !startedThisSession.current.has(MAIN_TOUR_ID)) open(MAIN_TOUR_ID);
      }, 1500);
    })();
    return () => { alive = false; };
  }, [userId, open, MAIN_TOUR_ID]);

  const def = tourId ? COACH_TOURS[tourId] : null;
  const step = def ? def.steps[index] : null;

  function end(finished = false) {
    if (userId != null && tourId) {
      markTourSeen(userId, tourId);
      // walked through the whole tour: its screens' first-visit tips would only repeat it
      if (finished && tourId === MAIN_TOUR_ID) TIPS_COVERED_BY_MAIN_TOUR[role].forEach((t) => { markTourSeen(userId, t); startedThisSession.current.add(t); });
    }
    setTourId(null);
  }

  function next() {
    if (!def) return;
    if (index >= def.steps.length - 1) end(true);
    else setIndex(index + 1);
  }

  function back() {
    if (index > 0) setIndex(index - 1);
  }

  async function tipsOffAndEnd() {
    if (userId != null) await setTipsOff(userId, true);
    end();
  }

  const api = useMemo<CoachApi>(() => ({ role, mainTourId: MAIN_TOUR_ID, register, start, startOnce, resetTips }), [role, MAIN_TOUR_ID, register, start, startOnce, resetTips]);

  return (
    <CoachContext.Provider value={api}>
      <View style={{ flex: 1 }}>
      {children}
      {def && step ? (
        <CoachOverlay
          // one overlay for the whole tour: it animates from step to step
          key={tourId}
          step={step}
          index={index}
          total={def.steps.length}
          isTips={def.kind === 'tips'}
          targets={targets.current}
          onNext={next}
          onBack={back}
          onSkip={() => end(false)}
          onTipsOff={tipsOffAndEnd}
          navigate={(route) => {
            // true = we really changed screen (the new screen needs a moment to appear)
            if (lastRoute.current === route) return false;
            lastRoute.current = route;
            router.navigate(route as any);
            return true;
          }}
        />
      ) : null}
      </View>
    </CoachContext.Provider>
  );
}

// ------------------------------------------------------------------ the overlay
// ONE overlay stays mounted for the whole tour. Going to the next step does not remount it:
// the light "hole" glides to the new part, the card fades out, moves and fades back in.
const EASE = Easing.inOut(Easing.cubic);
const MOVE_MS = 380;
const BORDER = 2600; // thickness of the dim layer's border (bigger than any phone screen)

function CoachOverlay({
  step, index, total, isTips, targets, onNext, onBack, onSkip, onTipsOff, navigate,
}: {
  step: CoachStep;
  index: number;
  total: number;
  isTips: boolean;
  targets: Map<string, any>;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onTipsOff: () => void;
  navigate: (route: string) => boolean;
}) {
  // Drawn INSIDE the app window (not in a Modal), so coordinates match measureInWindow.
  // We still subtract the overlay's own origin so it is exact on every phone.
  const rootRef = useRef<View>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const ready = size.w > 0 && size.h > 0;

  // what the card currently shows (changes while the card is faded out)
  const [shown, setShown] = useState<{ step: CoachStep; index: number } | null>(null);
  const cardHRef = useRef(0);
  const firstRef = useRef(true);
  const closingRef = useRef(false);

  // animated values (layout props -> JS driver; opacity/transform -> native driver)
  const hx = useRef(new Animated.Value(0)).current;
  const hy = useRef(new Animated.Value(0)).current;
  const hw = useRef(new Animated.Value(0)).current;
  const hh = useRef(new Animated.Value(0)).current;
  const ringOp = useRef(new Animated.Value(0)).current; // JS (same node as the layout props)
  const cardTop = useRef(new Animated.Value(0)).current; // native (translateY)
  const cardOp = useRef(new Animated.Value(0)).current; // native
  const cardSlide = useRef(new Animated.Value(14)).current; // native
  const rootOp = useRef(new Animated.Value(0)).current; // native

  const holeTo = useCallback((r: Rect | null, animate: boolean) => {
    const { w: W, h: H } = sizeRef.current;
    let x = W / 2, y = H / 2, w = 0, h = 0;
    if (r) {
      x = Math.max(0, r.x - PAD);
      y = Math.max(0, r.y - PAD);
      w = Math.max(0, Math.min(W - x, r.w + PAD * 2));
      h = Math.max(0, Math.min(H - y, r.h + PAD * 2));
    }
    const to = [[hx, x], [hy, y], [hw, w], [hh, h]] as const;
    if (!animate) {
      to.forEach(([v, n]) => v.setValue(n));
      ringOp.setValue(r ? 1 : 0);
      return;
    }
    Animated.parallel([
      ...to.map(([v, n]) => Animated.timing(v, { toValue: n, duration: MOVE_MS, easing: EASE, useNativeDriver: false })),
      Animated.timing(ringOp, { toValue: r ? 1 : 0, duration: MOVE_MS, useNativeDriver: false }),
    ]).start();
  }, [hx, hy, hw, hh, ringOp]);

  // Walk to the current step: fade the card out, open the screen if needed, find the part, move, fade in.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(setTimeout(() => { if (!cancelled) fn(); }, ms));
    };

    const place = (r: Rect | null) => {
      const { h: H } = sizeRef.current;
      const cardH = cardHRef.current || 250;
      let top: number;
      if (r) {
        const below = r.y + r.h / 2 < H / 2;
        top = below ? Math.min(r.y + r.h + PAD + 14, H - cardH - 16) : Math.max(r.y - PAD - 14 - cardH, 16);
      } else {
        top = Math.max((H - cardH) / 2, 16);
      }
      const first = firstRef.current;
      firstRef.current = false;
      holeTo(r, true);
      if (first) cardTop.setValue(top);
      cardSlide.setValue(14);
      Animated.parallel([
        Animated.timing(cardTop, { toValue: top, duration: first ? 0 : MOVE_MS, easing: EASE, useNativeDriver: true }),
        Animated.timing(cardOp, { toValue: 1, duration: 260, delay: 120, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 320, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    };

    const reveal = (r: Rect | null) => {
      setShown({ step, index });
      later(() => place(r), 70); // let the new text lay out first, then we know the card height
    };

    const measure = (tries: number) => {
      if (!step.target) { reveal(null); return; }
      const node = targets.get(step.target);
      const root = rootRef.current;
      const retry = () => {
        if (tries >= 10) reveal(null); // not found: show the card in the middle, never get stuck
        else later(() => measure(tries + 1), 150);
      };
      if (node && root && typeof node.measureInWindow === 'function') {
        root.measureInWindow((ox: number, oy: number) => {
          if (cancelled) return;
          node.measureInWindow((x: number, y: number, w: number, h: number) => {
            if (cancelled) return;
            if (w > 0 && h > 0 && Number.isFinite(x) && Number.isFinite(y)) {
              reveal({ x: x - (ox || 0), y: y - (oy || 0), w, h });
            } else retry();
          });
        });
      } else retry();
    };

    const go = () => {
      const changedScreen = !!step.route && navigate(step.route);
      if (changedScreen) holeTo(null, true); // darken while the other screen slides in
      later(() => measure(0), changedScreen ? 650 : 30);
    };

    if (firstRef.current) {
      holeTo(null, false); // start closed in the middle, then open onto the first part
      Animated.timing(rootOp, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      go();
    } else {
      Animated.timing(cardOp, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
        if (!cancelled) go();
      });
    }
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [index, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // fade out, then tell the provider (Next on the last step, Skip, "don't show tips")
  const closeThen = useCallback((fn: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(rootOp, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(cardOp, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => fn());
  }, [rootOp, cardOp]);

  const skip = useCallback(() => closeThen(onSkip), [closeThen, onSkip]);

  // Android back button = Skip
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { skip(); return true; });
    return () => sub.remove();
  }, [skip]);

  const sh = shown;
  const isLast = sh ? sh.index === total - 1 : false;

  return (
    <View
      ref={rootRef}
      collapsable={false}
      style={styles.fill}
      pointerEvents="box-none"
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: rootOp }]} pointerEvents="box-none">
        {/* swallows every tap while the tour is open (also the lit-up part) */}
        <View style={StyleSheet.absoluteFillObject} onStartShouldSetResponder={() => true} />
        {/* ONE dim layer: a huge transparent-centred border. The centre is the light hole, so there are
            no seams between separate blocks and it glides as a single piece. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: Animated.subtract(hx, BORDER),
            top: Animated.subtract(hy, BORDER),
            width: Animated.add(hw, BORDER * 2),
            height: Animated.add(hh, BORDER * 2),
            borderWidth: BORDER,
            borderColor: DIM,
            borderRadius: BORDER + 18,
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { top: hy, left: hx, width: hw, height: hh, opacity: ringOp }]}
        />

        {sh ? (
          <Animated.View
            style={[
              styles.cardPos,
              styles.card,
              { top: 0, opacity: cardOp, transform: [{ translateY: Animated.add(cardTop, cardSlide) }] },
            ]}
            onLayout={(e) => { cardHRef.current = e.nativeEvent.layout.height; }}
          >
              <View style={styles.topRow}>
                <Text style={styles.counter}>{sh.index + 1} OF {total}</Text>
                <TouchableOpacity
                  onPress={skip}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Skip"
                >
                  <Text style={styles.skip}>Skip</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.title}>{sh.step.title}</Text>
              <Text style={styles.body}>{sh.step.body}</Text>

              <View style={styles.btnRow}>
                {sh.index > 0 ? (
                  <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityRole="button" accessibilityLabel="Back">
                    <Ionicons name="arrow-back" size={18} color={BROWN} />
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.nextBtn, isLast && styles.nextBtnLast]}
                  onPress={() => (isLast ? closeThen(onNext) : onNext())}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Text style={[styles.nextText, isLast && styles.nextTextLast]}>{isLast ? (isTips ? 'Got it' : 'Done') : 'Next'}</Text>
                </TouchableOpacity>
              </View>

              {isTips ? (
                <TouchableOpacity onPress={() => closeThen(onTipsOff)} style={styles.tipsOff} accessibilityRole="button">
                  <Text style={styles.tipsOffText}>Don't show tips again</Text>
                </TouchableOpacity>
              ) : null}
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

// ------------------------------------------------------------------ Settings rows
export function GuidedTourRow() {
  const coach = useCoach();
  const [done, setDone] = useState(false);
  if (!coach) return null;
  return (
    <>
      <TouchableOpacity
        style={styles.row}
        onPress={() => coach.start(coach.mainTourId)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Guided tour"
      >
        <Ionicons name="compass-outline" size={20} color={BROWN} />
        <Text style={styles.rowText}>Guided tour</Text>
        <Ionicons name="chevron-forward" size={16} color={MUTED} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.row}
        onPress={async () => { await coach.resetTips(); setDone(true); }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Show tips again"
      >
        <Ionicons name="bulb-outline" size={20} color={BROWN} />
        <Text style={styles.rowText}>{done ? 'Tips will show again' : 'Show tips again'}</Text>
        <Ionicons name={done ? 'checkmark' : 'chevron-forward'} size={16} color={MUTED} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 50 },
  dim: { position: 'absolute', backgroundColor: DIM },
  ring: { position: 'absolute', borderRadius: 18, borderWidth: 3, borderColor: GOLD },
  cardPos: { position: 'absolute', left: 16, right: 16 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20,
    elevation: 12, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  counter: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: MUTED },
  skip: { fontSize: 15, fontWeight: '800', color: BROWN },
  title: { fontSize: 22, fontWeight: '900', color: BROWN, marginBottom: 6 },
  body: { fontSize: 16, lineHeight: 23, color: MUTED },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 50, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: LINE },
  backText: { fontSize: 15, fontWeight: '800', color: BROWN },
  nextBtn: { flex: 1, height: 50, borderRadius: 14, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center' },
  nextBtnLast: { backgroundColor: GOLD },
  nextText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  nextTextLast: { color: '#3A2B1A' },
  tipsOff: { alignSelf: 'center', marginTop: 12, paddingVertical: 6 },
  tipsOffText: { fontSize: 13, fontWeight: '700', color: MUTED, textDecorationLine: 'underline' },

  row: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14 },
  rowText: { fontSize: 14, fontWeight: '800', color: BROWN },
});