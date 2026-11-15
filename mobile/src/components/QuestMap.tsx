// mobile/src/components/QuestMap.tsx
// EXPERIMENTAL: the student's quests drawn as a winding "journey" along a road, like a level map.
//   - quests are plates along a placemat road: first quest at the bottom, trophy (finish line) at the top
//   - three colours for three states:  Finished = green + check,  Ongoing = gold + play,  Not started = grey
//   - tap a plate to see its info bubble (any quest, even one not started yet); tap the same plate again to open it;
//     tap anywhere else on the map to close the bubble (none is open by default)
//   - the road is gold up to the quest the student is on, and the map opens already scrolled to it
// The road and plates are drawn in code with react-native-svg - needs a development build.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, Animated, Easing,
  RefreshControl, LayoutChangeEvent,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import QuestCover from './QuestCover';
import { PressableScale, motionReduced } from './Motion';
import { NAV_CLEARANCE } from './FloatingTabBar';
import { QuestProgress } from '../types/assignments';

export type MapStatus = 'in_progress' | 'completed' | 'not_started';
export interface MapEntry { item: QuestProgress; status: MapStatus }

interface Props {
  entries: MapEntry[];
  onOpen: (item: QuestProgress) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** How many px of the map sit underneath the screen header (the header has rounded corners). */
  topInset?: number;
  /** Small controls shown floating at the top-left of the map (e.g. the Map/List switch). */
  toolbar?: React.ReactNode;
}

const BG = require('../../assets/images/home-bg (1).png'); // same background as the Home screen

const INK = '#3A1D0E';
const GOLD = '#F5B921';
const ORANGE = '#C2410C';
const GREEN = '#15803D';
const CREAM = '#FFF9EA';
const BROWN = '#4A2412';

// One look per state, so they can't be mixed up (colour + icon + word)
const STATUS = {
  completed:   { label: 'Finished',    rim: '#4ADE80', tint: '#DCFCE7', ink: '#14532D', edge: '#15803D' },
  in_progress: { label: 'Ongoing',     rim: '#F5B921', tint: '#FFF1BF', ink: '#7C2D12', edge: '#3A1D0E' },
  not_started: { label: 'Not started', rim: '#CBD2DC', tint: '#F1F3F6', ink: '#475569', edge: '#64748B' },
} as const;

const STEP_Y = 184;       // vertical distance between two quests
const TOP_PAD = 300;      // room above the last quest for the trophy (and the floating buttons)
const NODE = 80;          // plate size
const NODE_CUR = 116;     // plate size for the quest the student is on
const BUBBLE_W = 164;
const X_PATTERN = [0.3, 0.68, 0.34, 0.7]; // where each quest sits across the width (zig-zag)

type Pt = { x: number; y: number };

function seg(a: Pt, b: Pt) {
  const my = (a.y + b.y) / 2;
  return ` C ${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y}`;
}

// ---------------------------------------------------------------- legend
function Legend() {
  return (
    <View style={styles.legend} pointerEvents="none">
      {(['completed', 'in_progress', 'not_started'] as const).map((k) => (
        <View key={k} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: STATUS[k].rim, borderColor: STATUS[k].edge }]} />
          <Text style={styles.legendText}>{STATUS[k].label}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------- the map
export default function QuestMap({ entries, onOpen, refreshing = false, onRefresh, topInset = 0, toolbar }: Props) {
  const { width: W } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [viewH, setViewH] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const didScroll = useRef(false);

  const n = entries.length;
  const bottomPad = NAV_CLEARANCE + 160;
  const H = TOP_PAD + Math.max(0, n - 1) * STEP_Y + bottomPad;

  // The quest the student is on: first one in progress, else first one not started, else the last one
  const current = useMemo(() => {
    let i = entries.findIndex((e) => e.status === 'in_progress');
    if (i < 0) i = entries.findIndex((e) => e.status === 'not_started');
    return i < 0 ? Math.max(0, n - 1) : i;
  }, [entries, n]);
  const allDone = n > 0 && entries.every((e) => e.status === 'completed');
  const shown = selected !== null && selected < n ? selected : null; // quest whose bubble is open (none by default)

  const tileH = (W * 1280) / 720;
  const tiles = Math.max(1, Math.ceil(H / tileH));

  const pts: Pt[] = useMemo(
    () => entries.map((_, i) => ({
      x: n === 1 ? W * 0.5 : W * X_PATTERN[i % X_PATTERN.length],
      y: H - bottomPad - i * STEP_Y,
    })),
    [entries, n, W, H, bottomPad],
  );

  const roads = useMemo(() => {
    if (n === 0) return { full: '', done: '' };
    const start: Pt = { x: pts[0].x, y: pts[0].y + 104 };
    const finish: Pt = { x: W * 0.5, y: pts[n - 1].y - 125 };
    let full = `M ${start.x} ${start.y} L ${pts[0].x} ${pts[0].y}`;
    let done = full;
    for (let i = 1; i < n; i++) {
      full += seg(pts[i - 1], pts[i]);
      if (i <= current) done += seg(pts[i - 1], pts[i]);
    }
    full += seg(pts[n - 1], finish);
    if (allDone) done = full;
    return { full, done };
  }, [pts, n, W, current, allDone]);

  // Open already scrolled to the current quest (only once)
  useEffect(() => {
    if (didScroll.current || !viewH || n === 0) return;
    didScroll.current = true;
    const y = Math.max(0, Math.min(H - viewH, pts[current].y - viewH / 2));
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: false }));
  }, [viewH, n, H, pts, current]);

  // Glow + bobbing for the current quest
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (motionReduced()) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0.3] });
  const bob = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  function renderNode(e: MapEntry, i: number) {
    const { item, status } = e;
    const p = pts[i];
    const isCur = i === current;
    const st = STATUS[status];
    const S = isCur ? NODE_CUR : NODE;
    const ring = isCur ? 12 : 9;
    const photo = S - 2 * (ring + 3);

    const plate = (
      <View style={{ width: S, height: S }}>
        <Svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
          <Circle cx={S / 2} cy={S / 2} r={S / 2 - 2} fill={st.rim} stroke={st.edge} strokeWidth={3} />
          <Circle cx={S / 2} cy={S / 2} r={S / 2 - 2 - ring} fill="#FFFBF0" stroke={st.edge} strokeWidth={2} />
        </Svg>
        <View style={[styles.photoWrap, { left: (S - photo) / 2, top: (S - photo) / 2, width: photo, height: photo, borderRadius: photo / 2 }]}>
          <QuestCover url={item.quest_cover_image_url} style={{ width: photo, height: photo }} iconSize={Math.round(photo * 0.5)} />
          {status === 'not_started' ? <View style={styles.dim} /> : null}
        </View>
        <View style={[styles.numBadge, { backgroundColor: status === 'not_started' ? '#64748B' : BROWN }]}>
          <Text style={styles.numText}>{i + 1}</Text>
        </View>
        <View style={[styles.stateBadge, { backgroundColor: status === 'completed' ? GREEN : status === 'in_progress' ? ORANGE : '#64748B' }]}>
          <Ionicons
            name={status === 'completed' ? 'checkmark' : status === 'in_progress' ? 'play' : 'ellipsis-horizontal'}
            size={status === 'in_progress' ? 13 : 16}
            color="#fff"
          />
        </View>
      </View>
    );

    const labelW = 140;
    const labelLeft = Math.max(8, Math.min(W - 8 - labelW, p.x - labelW / 2));

    return (
      <React.Fragment key={item.id}>
        {isCur && !motionReduced() ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, {
              left: p.x - S * 0.8, top: p.y - S * 0.8, width: S * 1.6, height: S * 1.6, borderRadius: S * 0.8,
              opacity: glowOpacity, transform: [{ scale: glowScale }],
            }]}
          />
        ) : null}

        <PressableScale
          // first tap shows the bubble, tapping the same plate again opens the quest
          onPress={() => (shown === i ? onOpen(item) : setSelected(i))}
          accessibilityRole="button"
          accessibilityLabel={`${i + 1}. ${item.quest_title}, ${st.label}`}
          containerStyle={{ position: 'absolute', left: p.x - S / 2, top: p.y - S / 2, width: S, height: S }}
          scaleTo={0.92}
        >
          {isCur && !motionReduced() ? <Animated.View style={{ transform: [{ translateY: bob }] }}>{plate}</Animated.View> : plate}
        </PressableScale>

        {shown !== i ? (
          <View
            pointerEvents="none"
            style={[styles.label, { left: labelLeft, top: p.y + S / 2 + 8, width: labelW, backgroundColor: st.tint, borderColor: st.edge }]}
          >
            <Text style={[styles.labelText, { color: st.ink }]} numberOfLines={2}>{item.quest_title}</Text>
          </View>
        ) : null}
      </React.Fragment>
    );
  }

  function renderBubble() {
    if (n === 0 || shown === null) return null;
    const { item, status } = entries[shown];
    const st = STATUS[status];
    const p = pts[shown];
    const S = shown === current ? NODE_CUR : NODE;
    const left = Math.max(10, Math.min(W - 10 - BUBBLE_W, p.x < W / 2 ? p.x + S / 2 + 6 : p.x - S / 2 - 6 - BUBBLE_W));
    const pct = Math.max(0, Math.min(100, Math.round(item.percent_complete)));
    const btn =
      status === 'not_started' ? { text: 'START', bg: GREEN, fg: '#fff' }
      : status === 'completed' ? { text: 'REVIEW', bg: '#DCFCE7', fg: '#14532D' }
      : { text: 'CONTINUE', bg: GOLD, fg: INK };

    return (
      // an empty onPress so touching the bubble itself doesn't count as touching the map behind it
      <Pressable onPress={() => {}} style={[styles.bubble, { left, top: p.y - 66, width: BUBBLE_W }]}>
        <View style={[styles.chip, { backgroundColor: st.tint, borderColor: st.edge }]}>
          <Text style={[styles.chipText, { color: st.ink }]}>{st.label.toUpperCase()}</Text>
        </View>
        <Text style={styles.bubbleTitle} numberOfLines={3}>{item.quest_title}</Text>
        <View style={styles.barOuter}>
          <View style={[styles.barInner, { width: `${Math.max(status === 'not_started' ? 0 : 4, pct)}%`, backgroundColor: status === 'completed' ? GREEN : ORANGE }]} />
        </View>
        <Text style={styles.bubbleMeta}>
          {status === 'not_started' ? 'Not started yet' : status === 'completed' ? 'All steps done' : `${pct}% complete`}
        </Text>
        <PressableScale
          onPress={() => onOpen(item)}
          style={[styles.bubbleBtn, { backgroundColor: btn.bg, borderColor: status === 'completed' ? GREEN : INK }]}
          accessibilityRole="button"
          accessibilityLabel={`${btn.text} ${item.quest_title}`}
        >
          <Text style={[styles.bubbleBtnText, { color: btn.fg }]}>{btn.text}</Text>
        </PressableScale>
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        onLayout={(e: LayoutChangeEvent) => setViewH(e.nativeEvent.layout.height)}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BROWN} progressViewOffset={topInset} /> : undefined}
      >
        {/* tapping the empty map closes the bubble */}
        <Pressable style={{ width: W, height: H }} onPress={() => setSelected(null)}>
          {/* Same paper texture as the Home screen, tiled (every second tile flipped so the joins are hidden) */}
          {Array.from({ length: tiles }).map((_, k) => (
            <Image
              key={k}
              source={BG}
              resizeMode="cover"
              style={{ position: 'absolute', left: 0, top: k * tileH, width: W, height: tileH, transform: [{ scaleY: k % 2 ? -1 : 1 }] }}
            />
          ))}

          {/* The road */}
          {n > 0 ? (
            <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Path d={roads.full} stroke={INK} strokeWidth={48} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Path d={roads.full} stroke="#C99A5E" strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Path d={roads.full} stroke="#E4C28F" strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Path d={roads.done} stroke={GOLD} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Path d={roads.full} stroke={CREAM} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 12" fill="none" opacity={0.9} />
            </Svg>
          ) : null}

          {/* START flag */}
          {n > 0 ? (
            <View style={[styles.startFlag, { left: pts[0].x - 44, top: pts[0].y + 100 }]}>
              <Text style={styles.startText}>START</Text>
            </View>
          ) : null}

          {/* Finish line at the top */}
          {n > 0 ? (
            <>
              <View style={[styles.finish, { left: W / 2 - 40, top: pts[n - 1].y - 125 - 40 }, allDone ? styles.finishDone : null]}>
                <Ionicons name="trophy" size={36} color={allDone ? INK : '#7A6B55'} />
              </View>
              <View style={[styles.finishTag, { left: W / 2 - 40, top: pts[n - 1].y - 125 + 46 }]}>
                <Text style={styles.finishTagText}>FINISH</Text>
              </View>
            </>
          ) : null}

          {entries.map(renderNode)}
          {renderBubble()}
        </Pressable>
      </ScrollView>

      {/* Floating controls (stay put while the map scrolls) */}
      <View pointerEvents="box-none" style={[styles.overlay, { top: topInset + 10 }]}>
        {toolbar}
        <Legend />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  overlay: { position: 'absolute', left: 16, right: 16, gap: 8, alignItems: 'flex-start' },
  legend: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,249,234,0.95)', borderWidth: 2, borderColor: INK,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  legendText: { fontSize: 11, fontWeight: '800', color: BROWN },

  glow: { position: 'absolute', backgroundColor: 'rgba(245,185,33,0.55)' },
  photoWrap: { position: 'absolute', overflow: 'hidden', backgroundColor: '#B8895C' },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(241,243,246,0.35)' },
  numBadge: {
    position: 'absolute', left: -4, top: -4, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: CREAM,
    alignItems: 'center', justifyContent: 'center',
  },
  numText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  stateBadge: {
    position: 'absolute', right: -4, bottom: -4, width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: CREAM, alignItems: 'center', justifyContent: 'center',
  },
  label: {
    position: 'absolute', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, borderWidth: 2, alignItems: 'center', gap: 1,
  },
  labelText: { fontSize: 12, fontWeight: '900', textAlign: 'center' },

  bubble: {
    position: 'absolute', padding: 10, borderRadius: 18, backgroundColor: '#fff', borderWidth: 2, borderColor: INK,
    gap: 7, shadowColor: INK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6,
  },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 8, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center' },
  chipText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  bubbleTitle: { fontSize: 13, fontWeight: '900', color: '#7C2D12' },
  barOuter: { height: 10, borderRadius: 5, backgroundColor: '#EADFC4', borderWidth: 2, borderColor: INK, overflow: 'hidden' },
  barInner: { height: '100%' },
  bubbleMeta: { fontSize: 11, fontWeight: '800', color: '#7A4A2E' },
  bubbleBtn: { height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  bubbleBtnText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },

  startFlag: {
    position: 'absolute', width: 88, height: 34, borderRadius: 17, backgroundColor: GREEN, borderWidth: 2, borderColor: INK,
    alignItems: 'center', justifyContent: 'center',
  },
  startText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  finish: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: '#D8CDB6', borderWidth: 3, borderColor: '#6B5D48',
    alignItems: 'center', justifyContent: 'center',
  },
  finishDone: { backgroundColor: GOLD, borderColor: INK },
  finishTag: { position: 'absolute', width: 80, alignItems: 'center' },
  finishTagText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, color: BROWN },
});