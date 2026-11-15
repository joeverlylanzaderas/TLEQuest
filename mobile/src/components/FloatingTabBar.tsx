// mobile/src/components/FloatingTabBar.tsx
// The floating pill bottom navigation used by both the student and the teacher app.
//
// - The bar floats OVER the screens (absolute), so content scrolls behind it; screens keep ~120px bottom padding.
// - A coloured "bubble" slides (spring, slight overshoot) to the tab you tap.
// - The active tab shows icon + label, the others show only their icon.
// - The icon pops, and shrinks a little while pressed.
// - Reduce-motion: no slide, the change is instant.
//
// Performance: EVERYTHING that moves is a transform / opacity driven by ONE animated number
// (the position of the active tab) with the NATIVE driver, so it runs on the UI thread and stays
// smooth even while the next screen is rendering. No widths are animated, and the animation
// starts the moment you press (it does not wait for the navigation to finish).
//
// <FloatingTabBar {...tabBarProps} />    <- used by <Tabs tabBar={...}>
// <TabBarView items activeIndex onPress /> <- plain version (the quest step screen uses it)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { T, activeTheme } from '../theme/theme';
import { BounceOnFocus, motionReduced } from './Motion';

const SCHOOL = activeTheme === 'school';
// Cream used behind the screens (the bar itself floats over them).
export const NAV_STRIP_BG = T('#F5EDD8');
const BAR_BG = SCHOOL ? '#FFFFFF' : '#FFF9EC';
const BUBBLE = SCHOOL ? '#1E4D8F' : '#F5B921';
const ACTIVE_FG = SCHOOL ? '#FFFFFF' : '#3A2410';
const IDLE_FG = SCHOOL ? '#5B6B85' : '#7A6244';
const SHADOW = SCHOOL ? '#14233F' : '#3A2B1A';

const BAR_H = 64;
const BORDER = 1.5;
const BORDER_COLOR = SCHOOL ? 'rgba(20,35,63,0.55)' : 'rgba(58,43,26,0.55)';
const LIFT = 14; // extra space under the pill so it does not sit right on the screen edge
const PAD = 8;
const TAB_H = 48;
const BUBBLE_TOP = (BAR_H - BORDER * 2 - TAB_H) / 2;
const ICON = 24;
const GAP = 6;
const LABEL_SIZE = 13;
const SIDE = 10; // breathing room left/right of icon+label inside the bubble

// Bottom padding for every scroll view that sits under the bar, so the LAST item can scroll fully
// above it: bar strip (8 + bar + lift + safe-area) + 24 breathing room.
export const NAV_CLEARANCE = 8 + BAR_H + LIFT + Math.max(initialWindowMetrics?.insets.bottom ?? 24, 12) + 24;

export interface TabBarItem {
  key: string;
  label: string;
  icon: string; // Ionicons name
}

// Same icons as before, picked by route name.
const ICONS: Record<string, string> = {
  quests: 'restaurant-outline',
  submissions: 'ribbon-outline',
  home: 'home-outline',
  dashboard: 'home-outline',
  progress: 'bar-chart-outline',
  profile: 'person-outline',
  settings: 'settings-outline',
  classes: 'people-outline',
};

// ------------------------------------------------------------------ the bar itself
export function TabBarView({
  items, activeIndex, onPress, showAllLabels = false,
}: {
  items: TabBarItem[];
  activeIndex: number;
  onPress: (index: number) => void;
  /** true: every tab shows its icon AND its label (teacher app); false: only the active tab shows its label. */
  showAllLabels?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return showAllLabels
    ? <AllLabelsBar items={items} activeIndex={activeIndex} onPress={onPress} insetBottom={insets.bottom} />
    : <PillBar items={items} activeIndex={Math.max(0, activeIndex)} onPress={onPress} />;
}

// Only the active tab shows its label (student app).
function PillBar({
  items, activeIndex, onPress,
}: {
  items: TabBarItem[];
  activeIndex: number;
  onPress: (index: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const n = items.length;
  const [innerW, setInnerW] = useState(0);
  // measured label widths (start with a guess so the first frame is already close)
  const [labelW, setLabelW] = useState<number[]>(() => items.map((i) => Math.ceil(i.label.length * 8.2)));

  const pos = useRef(new Animated.Value(activeIndex)).current;
  const scales = useRef(items.map(() => new Animated.Value(1))).current;
  const lastTarget = useRef(activeIndex);

  const goTo = (i: number) => {
    if (lastTarget.current === i) return;
    lastTarget.current = i;
    if (motionReduced()) { pos.setValue(i); return; }
    Animated.spring(pos, { toValue: i, friction: 7, tension: 110, useNativeDriver: true }).start();
  };
  // also follows navigation that did not come from a tap (back button, router.navigate…)
  useEffect(() => { goTo(activeIndex); }, [activeIndex]);

  const longest = Math.max(...labelW, 0);
  const wantActive = SIDE + ICON + GAP + longest + SIDE;
  const idleW = innerW > 0 ? Math.max(40, Math.min(60, (innerW - wantActive) / Math.max(n - 1, 1))) : 52;
  const activeW = innerW > 0 ? innerW - (n - 1) * idleW : wantActive;

  const press = (i: number, down: boolean) => {
    if (motionReduced()) return;
    Animated.spring(scales[i], { toValue: down ? 0.88 : 1, speed: down ? 40 : 22, bounciness: down ? 0 : 10, useNativeDriver: true }).start();
  };

  // Layout of tab i for the three situations (active tab left of it / it is active / active tab right of it).
  // Between them everything is linear in `pos`, so one interpolation per element is enough.
  const iconX = (i: number) => {
    const left = i * idleW;
    const asActive = left + (activeW - (ICON + GAP + labelW[i])) / 2;
    const afterActive = left + (activeW - idleW) + (idleW - ICON) / 2;
    const beforeActive = left + (idleW - ICON) / 2;
    return [afterActive, asActive, beforeActive];
  };
  const interp = (i: number, out: number[]) =>
    pos.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: out, extrapolate: 'clamp' });

  const bubbleX = pos.interpolate({ inputRange: [0, 1], outputRange: [0, idleW] });

  return (
    <View pointerEvents="box-none" style={[styles.strip, { paddingBottom: Math.max(insets.bottom, 12) + LIFT }]}>
      <View
        style={styles.bar}
        onLayout={(e) => setInnerW(e.nativeEvent.layout.width - PAD * 2 - BORDER * 2)}
        accessibilityRole="tablist"
      >
        {innerW > 0 && (
          <View pointerEvents="none" style={styles.layer}>
            {/* the sliding bubble */}
            <Animated.View style={[styles.bubble, { width: activeW, transform: [{ translateX: bubbleX }] }]} />

            {items.map((it, i) => {
              const focused = i === activeIndex;
              const xs = iconX(i);
              return (
                <React.Fragment key={it.key}>
                  <Animated.View
                    style={[styles.iconBox, { transform: [{ translateX: interp(i, xs) }, { scale: scales[i] }] }]}
                  >
                    <BounceOnFocus focused={focused}>
                      <Ionicons name={it.icon as any} size={ICON} color={focused ? ACTIVE_FG : IDLE_FG} />
                    </BounceOnFocus>
                  </Animated.View>
                  <Animated.View
                    style={[
                      styles.labelBox,
                      {
                        width: labelW[i] + 4,
                        opacity: pos.interpolate({
                          inputRange: [i - 1, i - 0.45, i, i + 0.45, i + 1],
                          outputRange: [0, 0, 1, 0, 0],
                          extrapolate: 'clamp',
                        }),
                        transform: [{ translateX: interp(i, xs.map((x) => x + ICON + GAP)) }],
                      },
                    ]}
                  >
                    <Text numberOfLines={1} style={styles.label}>{it.label}</Text>
                  </Animated.View>
                </React.Fragment>
              );
            })}
          </View>
        )}

        {/* invisible touch areas (they never animate, so taps are always instant) */}
        <View style={styles.hitRow}>
          {items.map((it, i) => (
            <Pressable
              key={it.key}
              style={{ width: i === activeIndex ? activeW : idleW, height: '100%', justifyContent: 'center' }}
              onPressIn={() => press(i, true)}
              onPressOut={() => press(i, false)}
              onPress={() => { goTo(i); onPress(i); }}
              accessibilityRole="tab"
              accessibilityLabel={it.label}
              accessibilityState={{ selected: i === activeIndex }}
            />
          ))}
        </View>

        {/* invisible copies, only used to measure how wide each label is */}
        <View pointerEvents="none" style={styles.measure} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {items.map((it, i) => (
            <Text
              key={it.key}
              style={styles.label}
              onLayout={(e) => {
                const w = Math.ceil(e.nativeEvent.layout.width);
                setLabelW((prev) => (prev[i] === w ? prev : prev.map((p, k) => (k === i ? w : p))));
              }}
            >
              {it.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ every tab shows icon + label (teacher)
// Same feel as the bar above: ONE animated number (active tab position) drives a sliding bubble
// (spring, native driver), the icon pops on focus and shrinks a little while pressed.
function AllLabelsBar({
  items, activeIndex, onPress, insetBottom,
}: {
  items: TabBarItem[];
  activeIndex: number;
  onPress: (index: number) => void;
  insetBottom: number;
}) {
  const n = items.length;
  const [innerW, setInnerW] = useState(0);
  // activeIndex is -1 on a screen that is not in the bar (e.g. Settings): then no tab is highlighted.
  const hasActive = activeIndex >= 0;
  const pos = useRef(new Animated.Value(Math.max(0, activeIndex))).current;
  const shown = useRef(new Animated.Value(hasActive ? 1 : 0)).current; // bubble opacity
  const scales = useRef(items.map(() => new Animated.Value(1))).current;
  const lastTarget = useRef(Math.max(0, activeIndex));

  const goTo = (i: number) => {
    if (lastTarget.current === i) return;
    lastTarget.current = i;
    if (motionReduced()) { pos.setValue(i); return; }
    Animated.spring(pos, { toValue: i, friction: 7, tension: 110, useNativeDriver: true }).start();
  };
  // also follows navigation that did not come from a tap (back button, router.navigate...)
  useEffect(() => {
    if (hasActive) goTo(activeIndex);
    if (motionReduced()) shown.setValue(hasActive ? 1 : 0);
    else Animated.timing(shown, { toValue: hasActive ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [activeIndex]);

  const tabW = innerW > 0 ? innerW / n : 0;
  const press = (i: number, down: boolean) => {
    if (motionReduced()) return;
    Animated.spring(scales[i], { toValue: down ? 0.9 : 1, speed: down ? 40 : 22, bounciness: down ? 0 : 10, useNativeDriver: true }).start();
  };
  const bubbleX = pos.interpolate({ inputRange: [0, Math.max(n - 1, 1)], outputRange: [0, tabW * Math.max(n - 1, 1)] });

  return (
    <View pointerEvents="box-none" style={[styles.strip, { paddingBottom: Math.max(insetBottom, 12) + LIFT }]}>
      <View
        style={styles.bar}
        onLayout={(e) => setInnerW(e.nativeEvent.layout.width - PAD * 2 - BORDER * 2)}
        accessibilityRole="tablist"
      >
        {tabW > 0 && (
          <View pointerEvents="none" style={styles.layer}>
            <Animated.View style={[styles.bubble, { width: tabW, opacity: shown, transform: [{ translateX: bubbleX }] }]} />
          </View>
        )}
        <View style={styles.hitRow}>
          {items.map((it, i) => {
            const focused = i === activeIndex;
            return (
              <Pressable
                key={it.key}
                style={[styles.allTab, { width: tabW > 0 ? tabW : undefined }]}
                onPressIn={() => press(i, true)}
                onPressOut={() => press(i, false)}
                onPress={() => { goTo(i); onPress(i); }}
                accessibilityRole="tab"
                accessibilityLabel={it.label}
                accessibilityState={{ selected: focused }}
              >
                <Animated.View style={[styles.allTabContent, { transform: [{ scale: scales[i] }] }]}>
                  <BounceOnFocus focused={focused}>
                    <Ionicons name={it.icon as any} size={22} color={focused ? ACTIVE_FG : IDLE_FG} />
                  </BounceOnFocus>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.allLabel, { color: focused ? ACTIVE_FG : IDLE_FG }]}>
                    {it.label}
                  </Text>
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ expo-router adapter
// showAllLabels: show every label (teacher). icons: per-route icon overrides, e.g. { submissions: 'checkbox-outline' }.
export function FloatingTabBar({ state, descriptors, navigation, showAllLabels = false, icons, hiddenRoutes = [] }: any) {
  // only the tabs that are really shown (href: null hides a route)
  const visible = state.routes
    .map((route: any, index: number) => ({ route, index }))
    .filter(({ route }: any) => descriptors[route.key]?.options?.href !== null && !hiddenRoutes.includes(route.name));

  const items: TabBarItem[] = visible.map(({ route }: any) => {
    const o = descriptors[route.key]?.options ?? {};
    return {
      key: route.key,
      label: typeof o.title === 'string' ? o.title : route.name,
      icon: icons?.[route.name] ?? ICONS[route.name] ?? 'ellipse-outline',
    };
  });
  // -1 when the current screen is not one of the visible tabs (e.g. Settings, opened from the header avatar)
  const activeIndex = visible.findIndex(({ index }: any) => index === state.index);

  const press = (i: number) => {
    const { route, index } = visible[i];
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (state.index !== index && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  return <TabBarView items={items} activeIndex={activeIndex} onPress={press} showAllLabels={showAllLabels} />;
}

const styles = StyleSheet.create({
  // transparent strip laid OVER the screens: content scrolls behind the floating pill
  strip: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 8, paddingHorizontal: 16 },
  bar: {
    height: BAR_H, borderRadius: BAR_H / 2, backgroundColor: BAR_BG,
    paddingHorizontal: PAD, justifyContent: 'center',
    borderWidth: BORDER, borderColor: BORDER_COLOR,
    elevation: 18, shadowColor: SHADOW, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
  },
  // everything visual lives here, in the bar's inner box (same origin as the touch row)
  layer: { position: 'absolute', left: PAD, top: 0, bottom: 0, right: PAD },
  bubble: {
    position: 'absolute', left: 0, top: BUBBLE_TOP, height: TAB_H, borderRadius: TAB_H / 2,
    backgroundColor: BUBBLE,
    shadowColor: BUBBLE, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  iconBox: { position: 'absolute', left: 0, top: BUBBLE_TOP, height: TAB_H, width: ICON, justifyContent: 'center', alignItems: 'center' },
  labelBox: { position: 'absolute', left: 0, top: BUBBLE_TOP, height: TAB_H, justifyContent: 'center' },
  label: { fontSize: LABEL_SIZE, fontWeight: '700', color: ACTIVE_FG },
  allTab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
  allTabContent: { height: TAB_H, justifyContent: 'center', alignItems: 'center', gap: 2 },
  allLabel: { fontSize: 11, fontWeight: '700', maxWidth: '100%' },
  hitRow: { flexDirection: 'row', height: '100%', alignItems: 'center' },
  measure: { position: 'absolute', left: 0, top: 0, opacity: 0, flexDirection: 'row', alignItems: 'flex-start' },
});