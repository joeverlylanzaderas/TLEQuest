// mobile/src/components/Motion.tsx
// Small animation helpers built on React Native's own Animated API
// (no extra packages, so they ship with a normal EAS Update).
//
//   <FadeIn delay={80}>…</FadeIn>            fade + slide up when it appears
//   <PressableScale onPress={…}>…</…>        presses shrink a little, release springs back
//   <AnimatedBar percent={60} … />           progress bar that grows to its value
//   <CountUp value={120} />                  number that counts up
//   <Pop>…</Pop>                             springy "pop" in (badges, check marks)
//   useShake()                               wiggle for wrong input
//   <Confetti active />                      one burst of confetti
//
// All of them skip the movement when the phone has "Remove animations" / reduce motion on.
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Animated, Easing, AccessibilityInfo, Pressable, StyleProp, ViewStyle, TextStyle,
  View, Dimensions, StyleSheet, PressableProps,
} from 'react-native';

// ---- reduce motion (read once, then kept up to date) ----
let reduceMotion = false;
try {
  AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduceMotion = !!v; }).catch(() => {});
  AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => { reduceMotion = !!v; });
} catch {
  // not important
}
export const motionReduced = () => reduceMotion;

// ---------------------------------------------------------------- FadeIn
interface FadeInProps {
  children?: React.ReactNode;
  delay?: number;
  duration?: number;
  /** Pixels it travels while appearing. */
  distance?: number;
  from?: 'bottom' | 'top' | 'left' | 'right' | 'none';
  style?: StyleProp<ViewStyle>;
}

export function FadeIn({ children, delay = 0, duration = 420, distance = 16, from = 'bottom', style }: FadeInProps) {
  const v = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) { v.setValue(1); return; }
    const a = Animated.timing(v, {
      toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, []);
  const offset = v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  const transform =
    from === 'left' ? [{ translateX: Animated.multiply(offset, -1) }]
    : from === 'right' ? [{ translateX: offset }]
    : from === 'top' ? [{ translateY: Animated.multiply(offset, -1) }]
    : from === 'none' ? []
    : [{ translateY: offset }];
  return <Animated.View style={[style, { opacity: v, transform }]}>{children}</Animated.View>;
}

// ---------------------------------------------------------------- PressableScale
interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Style for the outer touch area (use for flex / alignSelf / width in the parent's layout). */
  containerStyle?: StyleProp<ViewStyle>;
  /** Size while pressed (default 0.96). */
  scaleTo?: number;
}

export function PressableScale({ children, style, containerStyle, scaleTo = 0.96, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (value: number, bounce: boolean) => {
    if (reduceMotion) return;
    Animated.spring(s, {
      toValue: value, useNativeDriver: true, speed: bounce ? 22 : 40, bounciness: bounce ? 10 : 0,
    }).start();
  };
  return (
    <Pressable
      {...rest}
      style={containerStyle}
      onPressIn={(e) => { to(scaleTo, false); onPressIn?.(e); }}
      onPressOut={(e) => { to(1, true); onPressOut?.(e); }}
    >
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------- AnimatedBar
interface AnimatedBarProps {
  percent: number;
  trackStyle?: StyleProp<ViewStyle>;
  fillStyle?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
}

/** Progress bar. `trackStyle`/`fillStyle` are the same styles you already had (height, colors, radius). */
export function AnimatedBar({ percent, trackStyle, fillStyle, delay = 150, duration = 800 }: AnimatedBarProps) {
  const clamped = Math.max(0, Math.min(100, percent || 0));
  const v = useRef(new Animated.Value(reduceMotion ? clamped : 0)).current;
  useEffect(() => {
    if (reduceMotion) { v.setValue(clamped); return; }
    const a = Animated.timing(v, {
      toValue: clamped, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
  }, [clamped]);
  const width = v.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={trackStyle}>
      <Animated.View style={[fillStyle, { width }]} />
    </View>
  );
}

// ---------------------------------------------------------------- CountUp
interface CountUpProps {
  value: number;
  duration?: number;
  delay?: number;
  style?: StyleProp<TextStyle>;
  suffix?: string;
}

export function CountUp({ value, duration = 900, delay = 150, style, suffix = '' }: CountUpProps) {
  const [shown, setShown] = useState(reduceMotion ? value : 0);
  const v = useRef(new Animated.Value(reduceMotion ? value : 0)).current;
  useEffect(() => {
    if (reduceMotion) { setShown(value); return; }
    const id = v.addListener(({ value: n }) => setShown(Math.round(n)));
    const a = Animated.timing(v, {
      toValue: value, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    });
    a.start();
    return () => { a.stop(); v.removeListener(id); };
  }, [value]);
  return <Animated.Text style={style}>{shown}{suffix}</Animated.Text>;
}

// ---------------------------------------------------------------- Pop
export function Pop({ children, delay = 0, style }: { children?: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) { v.setValue(1); return; }
    const a = Animated.spring(v, { toValue: 1, delay, friction: 4, tension: 120, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, []);
  return (
    <Animated.View style={[style, { opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------- useShake
export function useShake() {
  const x = useRef(new Animated.Value(0)).current;
  const shake = useCallback(() => {
    if (reduceMotion) return;
    Animated.sequence([
      Animated.timing(x, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(x, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(x, { toValue: 7, duration: 60, useNativeDriver: true }),
      Animated.timing(x, { toValue: -7, duration: 60, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [x]);
  return { shakeStyle: { transform: [{ translateX: x }] } as ViewStyle, shake };
}

// ---------------------------------------------------------------- Confetti
const CONFETTI_COLORS = ['#F5B921', '#EA580C', '#22C55E', '#38BDF8', '#F472B6', '#A78BFA'];

interface Piece { left: number; size: number; color: string; delay: number; drift: number; spin: number; fall: number }

export function Confetti({ active, count = 36, onDone }: { active: boolean; count?: number; onDone?: () => void }) {
  const { width, height } = Dimensions.get('window');
  const pieces: Piece[] = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * width,
        size: 6 + Math.random() * 7,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 450,
        drift: (Math.random() - 0.5) * 120,
        spin: 360 + Math.random() * 540,
        fall: height * (0.55 + Math.random() * 0.4),
      })),
    [count, width, height]
  );
  const progress = useRef(pieces.map(() => new Animated.Value(0))).current;
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!active || reduceMotion) return;
    setRunning(true);
    progress.forEach((p) => p.setValue(0));
    const anims = pieces.map((pc, i) =>
      Animated.timing(progress[i], { toValue: 1, duration: 1700, delay: pc.delay, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    const all = Animated.parallel(anims);
    all.start(({ finished }) => {
      if (finished) { setRunning(false); onDone?.(); }
    });
    return () => all.stop();
  }, [active]);

  if (!running) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((pc, i) => {
        const p = progress[i];
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute', top: -20, left: pc.left, width: pc.size, height: pc.size * 0.6,
              backgroundColor: pc.color, borderRadius: 2,
              opacity: p.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, pc.fall] }) },
                { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, pc.drift] }) },
                { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${pc.spin}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- TabIcon
/** Bottom-tab icon that bounces when its tab becomes the active one. */
export function BounceOnFocus({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  const s = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!focused || reduceMotion) return;
    s.setValue(0.7);
    Animated.spring(s, { toValue: 1, friction: 3, tension: 140, useNativeDriver: true }).start();
  }, [focused]);
  return <Animated.View style={{ transform: [{ scale: s }] }}>{children}</Animated.View>;
}