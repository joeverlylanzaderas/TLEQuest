// mobile/src/components/AnimatedLogo.tsx
// The TLEQuest logo on the login screen, with a bit of life:
//  - floats gently up and down (starts after the screen's intro animation)
//  - little gold sparkles twinkle around it
//  - tap it: it wobbles, pops, and bursts out a ring of sparkles
//  - while signing in (busy): it hops, so you can see something is happening
// Everything is transform-only with the native driver. With "reduce motion" on, it stays still.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View, ImageSourcePropType } from 'react-native';
import { motionReduced } from './Motion';

const SPARKLE = '#F2B84B'; // the yellow of the logo

// A four-point sparkle: two thin diamonds (each = two triangles), a smaller diagonal pair, and a bright core.
// Built from plain Views, so there are no images or SVG to load.
function Diamond({ length, thick, color, rotate, opacity = 1, size }: {
  length: number; thick: number; color: string; rotate: string; opacity?: number; size: number;
}) {
  const half = length / 2;
  return (
    <View
      style={{
        position: 'absolute', left: (size - thick) / 2, top: (size - length) / 2, width: thick, height: length,
        opacity, transform: [{ rotate }],
      }}
    >
      <View style={{
        width: 0, height: 0, borderLeftWidth: thick / 2, borderRightWidth: thick / 2, borderBottomWidth: half,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
      }} />
      <View style={{
        width: 0, height: 0, borderLeftWidth: thick / 2, borderRightWidth: thick / 2, borderTopWidth: half,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color,
      }} />
    </View>
  );
}

function Star({ size, color = SPARKLE }: { size: number; color?: string }) {
  const thick = Math.max(3, size * 0.34);
  const small = size * 0.58;
  return (
    <View style={{ width: size, height: size }}>
      <Diamond size={size} length={small} thick={thick * 0.6} color={color} rotate="45deg" opacity={0.7} />
      <Diamond size={size} length={small} thick={thick * 0.6} color={color} rotate="-45deg" opacity={0.7} />
      <Diamond size={size} length={size} thick={thick} color={color} rotate="0deg" />
      <Diamond size={size} length={size} thick={thick} color={color} rotate="90deg" />
      <View
        style={{
          position: 'absolute', left: size * 0.4, top: size * 0.4, width: size * 0.2, height: size * 0.2,
          borderRadius: size * 0.1, backgroundColor: '#FFFFFF',
        }}
      />
    </View>
  );
}

// One star that grows, spins a little and fades, then rests, forever.
function Twinkle({ x, y, size, delay, period }: { x: number; y: number; size: number; delay: number; period: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.sequence([
          Animated.timing(t, { toValue: 1, duration: period * 0.4, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(t, { toValue: 0, duration: period * 0.3, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.delay(period * 0.9),
        ])
      ),
    ]);
    anim.start();
    return () => anim.stop();
  }, [t, delay, period]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        opacity: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
        transform: [
          { scale: t },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '25deg'] }) },
        ],
      }}
    >
      <Star size={size} />
    </Animated.View>
  );
}

// A ring of stars that flies outward once each time the logo is tapped.
function Burst({ progress, width, height, size }: { progress: Animated.Value; width: number; height: number; size: number }) {
  const count = 8;
  const radius = Math.max(width, height) * 0.62;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2;
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: width / 2 - size / 2,
              top: height / 2 - size / 2,
              opacity: progress.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * radius] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * radius * 0.75] }) },
                { scale: progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 0.2] }) },
                { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '120deg'] }) },
              ],
            }}
          >
            <Star size={size} />
          </Animated.View>
        );
      })}
    </>
  );
}

// where the always-on twinkles sit, as fractions of the logo box: x, y, relative size, start delay, period
const TWINKLES: [number, number, number, number, number][] = [
  [0.10, 0.18, 1.0, 1200, 2600],
  [0.90, 0.10, 1.3, 1900, 3000],
  [0.97, 0.58, 0.9, 2600, 2800],
  [0.04, 0.66, 0.8, 3200, 3200],
  [0.74, 0.94, 1.0, 2200, 2700],
  [0.32, 0.01, 0.8, 3600, 3100],
];

interface Props {
  source: ImageSourcePropType;
  width: number;
  height: number;
  busy?: boolean;
}

export function AnimatedLogo({ source, width, height, busy = false }: Props) {
  const float = useRef(new Animated.Value(0)).current; // 0..1, loops while idle
  const hop = useRef(new Animated.Value(0)).current;   // 0..1, loops while signing in
  const tap = useRef(new Animated.Value(0)).current;   // 0..1, one wobble per tap
  const burst = useRef(new Animated.Value(0)).current; // 0..1, the ring of stars after a tap
  const reduced = motionReduced();

  // gentle float
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), 900); // let the intro finish first
    return () => { clearTimeout(t); loop.stop(); };
  }, [float, reduced]);

  // hop while signing in
  useEffect(() => {
    if (!busy || reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hop, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: 360, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(120),
      ])
    );
    loop.start();
    return () => { loop.stop(); hop.setValue(0); };
  }, [busy, hop, reduced]);

  const wobble = () => {
    if (reduced) return;
    tap.setValue(0);
    Animated.timing(tap, { toValue: 1, duration: 750, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    burst.setValue(0);
    Animated.timing(burst, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const floatRot = float.interpolate({ inputRange: [0, 1], outputRange: ['-1deg', '1.2deg'] });
  const hopY = hop.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const tapRot = tap.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: ['0deg', '-9deg', '8deg', '-5deg', '2deg', '0deg'],
  });
  const tapScale = tap.interpolate({ inputRange: [0, 0.2, 1], outputRange: [1, 1.1, 1] });

  const star = Math.max(10, Math.round(width * 0.075));

  return (
    <Pressable onPress={wobble} accessibilityRole="image" accessibilityLabel="TLEQuest logo">
      <Animated.View
        style={{
          width,
          height,
          transform: [
            { translateY: floatY },
            { translateY: hopY },
            { rotate: floatRot },
            { rotate: tapRot },
            { scale: tapScale },
          ],
        }}
      >
        <Animated.Image source={source} resizeMode="contain" style={{ width, height }} />
        {!reduced && (
          <>
            {TWINKLES.map(([fx, fy, k, delay, period], i) => (
              <Twinkle key={i} x={fx * width} y={fy * height} size={Math.round(star * k)} delay={delay} period={period} />
            ))}
            <Burst progress={burst} width={width} height={height} size={star} />
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}