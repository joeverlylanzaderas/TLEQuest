// mobile/src/components/AnimatedSplash.tsx
// The splash screen, drawn by the app (so it can move) on the same cream as the login screen:
//   1. the logo (60% of the screen wide) drops in with a bounce, then floats while sparkles twinkle
//   2. once the saved session is checked (and at least ~1.7 s have passed), it glides up
//      to the exact spot of the logo on the login screen, growing to login size
//   3. the login screen's fields rise in while it glides, then the logos swap with a short cross-fade
// If someone is already signed in, it just fades away. With "reduce motion" on, nothing moves, it just fades.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AnimatedLogo } from './AnimatedLogo';
import { motionReduced } from './Motion';
import { splashBus, useSplashState } from '../splash/splashBus';

const LOGO = require('../../assets/images/tlequest-logo3.png');
const logoSrc = Image.resolveAssetSource(LOGO);
const LOGO_RATIO = logoSrc?.width && logoSrc?.height ? logoSrc.width / logoSrc.height : 1.306;

const BG = '#faf6e8';        // same as the login screen background
const MIN_SHOW_MS = 1700;    // the drop-in gets to finish before the glide starts
const WAIT_RECT_MS = 1200;   // how long to wait for the login screen to say where its logo is
const GLIDE_MS = 900;

function Dot({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 550, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 550, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [v, delay]);
  return (
    <Animated.View
      style={{
        width: 9, height: 9, borderRadius: 5, backgroundColor: '#7A5A2B',
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
      }}
    />
  );
}

interface Props {
  appReady: boolean; // the saved session has been checked
  toLogo: boolean;   // nobody is signed in, so the login screen is next
}

export default function AnimatedSplash({ appReady, toLogo }: Props) {
  const state = useSplashState();
  const { width: W, height: H } = useWindowDimensions();
  const reduced = motionReduced();

  const boxW = Math.round(W * 0.6);
  const boxH = Math.round(boxW / LOGO_RATIO);
  const left = Math.round((W - boxW) / 2);
  const top = Math.round(H * 0.486 - boxH / 2);

  const pop = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const glide = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(1)).current;
  const dotsOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;

  const [minDone, setMinDone] = useState(false);
  const [rectWaitDone, setRectWaitDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const started = useRef(false);
  const nativeHidden = useRef(false);

  // the drop-in
  useEffect(() => {
    if (reduced) return;
    const a = Animated.timing(pop, {
      toValue: 1, duration: 1000, delay: 150, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [pop, reduced]);

  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), reduced ? 500 : MIN_SHOW_MS);
    return () => clearTimeout(t);
  }, [reduced]);

  useEffect(() => {
    if (!appReady) return;
    const t = setTimeout(() => setRectWaitDone(true), WAIT_RECT_MS);
    return () => clearTimeout(t);
  }, [appReady]);

  // leave: glide into the login screen (or just fade)
  useEffect(() => {
    if (started.current || !state.active || !appReady || !minDone) return;
    if (toLogo && !reduced && !state.rect && !rectWaitDone) return; // still waiting for the login screen
    started.current = true;
    setLeaving(true);
    splashBus.beginHandoff();

    const swapAndFinish = () => {
      splashBus.showLogo();
      Animated.timing(logoOpacity, { toValue: 0, duration: 220, useNativeDriver: true })
        .start(() => splashBus.finish());
    };

    const rect = state.rect;
    if (reduced || !toLogo || !rect) {
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(dotsOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => { splashBus.showLogo(); splashBus.finish(); });
      return;
    }

    Animated.parallel([
      Animated.timing(glide, { toValue: 1, duration: GLIDE_MS, easing: Easing.bezier(0.65, 0, 0.25, 1), useNativeDriver: true }),
      Animated.timing(bgOpacity, { toValue: 0, duration: 250, useNativeDriver: true }), // same cream as login, so nothing visibly changes
      Animated.timing(dotsOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(swapAndFinish);
  }, [state.active, state.rect, appReady, minDone, rectWaitDone, toLogo, reduced,
      glide, bgOpacity, dotsOpacity, logoOpacity]);

  if (!state.active) return null;

  // glide target: the login logo's centre and size
  const rect = state.rect;
  const dx = rect ? rect.x + rect.width / 2 - (left + boxW / 2) : 0;
  const dy = rect ? rect.y + rect.height / 2 - (top + boxH / 2) : 0;
  const endScale = rect ? rect.width / boxW : 1;

  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}
      pointerEvents={leaving ? 'none' : 'auto'}
      onLayout={() => {
        if (nativeHidden.current) return;
        nativeHidden.current = true;
        SplashScreen.hideAsync().catch(() => {});
      }}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: BG, opacity: bgOpacity }]} />

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', left: 0, right: 0, top: Math.round(H * 0.886),
          flexDirection: 'row', justifyContent: 'center', gap: 10, opacity: dotsOpacity,
        }}
      >
        {!reduced && (<><Dot delay={0} /><Dot delay={150} /><Dot delay={300} /></>)}
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute', left, top, width: boxW, height: boxH, opacity: logoOpacity,
          transform: [
            { translateX: glide.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
            { translateY: glide.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
            { scale: glide.interpolate({ inputRange: [0, 1], outputRange: [1, endScale] }) },
          ],
        }}
      >
        <Animated.View
          style={{
            opacity: pop.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateY: pop.interpolate({ inputRange: [0, 0.55, 0.78, 1], outputRange: [-34, 8, -3, 0] }) },
              { scale: pop.interpolate({ inputRange: [0, 0.55, 0.78, 1], outputRange: [0.55, 1.06, 0.99, 1] }) },
              { rotate: pop.interpolate({ inputRange: [0, 0.55, 0.78, 1], outputRange: ['-6deg', '2deg', '-0.8deg', '0deg'] }) },
            ],
          }}
        >
          <AnimatedLogo source={LOGO} width={boxW} height={boxH} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
