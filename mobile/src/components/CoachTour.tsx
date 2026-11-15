// mobile/src/components/CoachTour.tsx
// The teacher's guided tour: a dimmed screen with ONE part lit up and a card that explains it.
//
//   <CoachProvider>            wrap the teacher area once (see app/(teacher)/_layout.tsx)
//   const target = useCoachTarget();   in a screen:  <View {...target('review-tabs')}> ... </View>
//   useScreenTour('teacher-review');   in a screen: shows that screen's tip the first time it opens
//   <GuidedTourRow />          Settings rows: replay the tour / show the tips again
//
// Every tour can be skipped. If a lit-up part cannot be found (for example an empty list),
// the card is simply shown in the middle of the screen, so the tour never gets stuck.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { T } from '../theme/theme';
import { hasSeenGuide } from '../utils/guideSeen';
import { hasSeenTour, markTourSeen, resetTours, tipsAreOff, setTipsOff } from '../utils/coachSeen';
import { COACH_TOURS, ALL_TOUR_IDS, MAIN_TOUR_ID, TIPS_COVERED_BY_MAIN_TOUR, CoachStep } from './CoachContent';

const BROWN = T('#5C2C16');
const MUTED = T('#8A6A2A');
const GOLD = T('#F5B921');
const LINE = T('#EADEC9');
const DIM = 'rgba(40,22,12,0.74)';
const PAD = 6; // breathing room around the lit-up part

interface Rect { x: number; y: number; w: number; h: number }

interface CoachApi {
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
export function CoachProvider({ children }: { children: React.ReactNode }) {
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
    await resetTours(userId, ALL_TOUR_IDS);
  }, [userId]);

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
  }, [userId, open]);

  const def = tourId ? COACH_TOURS[tourId] : null;
  const step = def ? def.steps[index] : null;

  function end(finished = false) {
    if (userId != null && tourId) {
      markTourSeen(userId, tourId);
      // walked through the whole tour: its screens' first-visit tips would only repeat it
      if (finished && tourId === MAIN_TOUR_ID) TIPS_COVERED_BY_MAIN_TOUR.forEach((t) => { markTourSeen(userId, t); startedThisSession.current.add(t); });
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

  const api = useMemo<CoachApi>(() => ({ register, start, startOnce, resetTips }), [register, start, startOnce, resetTips]);

  return (
    <CoachContext.Provider value={api}>
      <View style={{ flex: 1 }}>
      {children}
      {def && step ? (
        <CoachOverlay
          // a new key per step, so the measuring starts fresh
          key={`${tourId}-${index}`}
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
  // The overlay is drawn INSIDE the app window (not in a Modal), so its coordinates are the same
  // as measureInWindow's. We still subtract the overlay's own origin, so it is exact on every phone
  // (with or without a status bar offset).
  const rootRef = useRef<View>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const W = size.w;
  const H = size.h;
  const [rect, setRect] = useState<Rect | null>(null);
  const [searching, setSearching] = useState(!!step.target);

  // Find the lit-up part. After opening another screen it may take a moment to appear, so retry a few times.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function giveUp() {
      if (!cancelled) setSearching(false); // no part to light: show the card in the middle
    }
    function attempt() {
      if (cancelled) return;
      if (!step.target) { setSearching(false); return; }
      const node = targets.get(step.target);
      const root = rootRef.current;
      if (node && root && typeof node.measureInWindow === 'function') {
        root.measureInWindow((ox: number, oy: number) => {
          if (cancelled) return;
          node.measureInWindow((x: number, y: number, w: number, h: number) => {
            if (cancelled) return;
            if (w > 0 && h > 0 && Number.isFinite(x) && Number.isFinite(y)) {
              setRect({ x: x - (ox || 0), y: y - (oy || 0), w, h });
              setSearching(false);
            } else retry();
          });
        });
      } else retry();
    }
    function retry() {
      tries += 1;
      if (tries > 10) giveUp();
      else timer = setTimeout(attempt, 150);
    }

    if (step.route && navigate(step.route)) {
      timer = setTimeout(attempt, 600);
    } else {
      attempt();
    }
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Android back button = Skip
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onSkip(); return true; });
    return () => sub.remove();
  }, [onSkip]);

  const isLast = index === total - 1;
  const showBelow = rect ? rect.y + rect.h / 2 < H / 2 : false;

  const card = (
    <View
      style={[
        styles.card,
        rect
          ? showBelow
            ? { top: Math.min(rect.y + rect.h + PAD + 12, H - 260) }
            : { bottom: Math.max(H - rect.y + PAD + 12, 16) }
          : { top: H / 2 - 130 },
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.counter}>{index + 1} OF {total}</Text>
        <TouchableOpacity
          onPress={onSkip}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Skip"
        >
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.body}>{step.body}</Text>

      <View style={styles.btnRow}>
        {index > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={18} color={BROWN} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.nextBtn, isLast && styles.nextBtnLast]} onPress={onNext} activeOpacity={0.85} accessibilityRole="button">
          <Text style={[styles.nextText, isLast && styles.nextTextLast]}>{isLast ? (isTips ? 'Got it' : 'Done') : 'Next'}</Text>
        </TouchableOpacity>
      </View>

      {isTips ? (
        <TouchableOpacity onPress={onTipsOff} style={styles.tipsOff} accessibilityRole="button">
          <Text style={styles.tipsOffText}>Don't show tips again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View
      ref={rootRef}
      collapsable={false}
      style={styles.fill}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <View style={styles.fill} pointerEvents="box-none">
        {rect ? (
          <>
            {/* four dim blocks around the lit-up part (taps on them do nothing) */}
            <View style={[styles.dim, { top: 0, left: 0, right: 0, height: Math.max(rect.y - PAD, 0) }]} />
            <View style={[styles.dim, { top: rect.y + rect.h + PAD, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.dim, { top: rect.y - PAD, left: 0, width: Math.max(rect.x - PAD, 0), height: rect.h + PAD * 2 }]} />
            <View style={[styles.dim, { top: rect.y - PAD, left: rect.x + rect.w + PAD, right: 0, height: rect.h + PAD * 2 }]} />
            {/* the lit-up part itself is not tappable during the tour */}
            <Pressable
              onPress={() => {}}
              accessible={false}
              style={{ position: 'absolute', top: rect.y - PAD, left: rect.x - PAD, width: rect.w + PAD * 2, height: rect.h + PAD * 2 }}
            />
            <View
              pointerEvents="none"
              style={[styles.ring, { top: rect.y - PAD, left: rect.x - PAD, width: rect.w + PAD * 2, height: rect.h + PAD * 2 }]}
            />
          </>
        ) : (
          <View style={[styles.dim, StyleSheet.absoluteFillObject]} />
        )}
        {searching || W === 0 ? null : card}
      </View>
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
        onPress={() => coach.start(MAIN_TOUR_ID)}
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
  card: {
    position: 'absolute', left: 16, right: 16, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20,
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
