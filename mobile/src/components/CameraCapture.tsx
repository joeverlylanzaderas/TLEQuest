// mobile/src/components/CameraCapture.tsx
// The full-screen camera used to photograph a finished quest.
// Live camera only (no gallery). The preview is exactly what gets photographed:
// the guide corners, tips and grid are drawn on top and never crop the photo.
import React, { useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ActivityIndicator, Animated, StyleSheet, useWindowDimensions,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../theme/theme';

const GOLD = T('#F5B921');
const BG = '#1C1410';
const SOFT = 'rgba(255,255,255,0.16)';

interface Props {
  visible: boolean;
  /** Shown at the top, e.g. the quest name */
  title: string;
  onClose: () => void;
  /** Called with the local file uri of the photo */
  onCaptured: (uri: string) => void;
}

export default function CameraCapture({ visible, title, onClose, onCaptured }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const [torch, setTorch] = useState(false);
  const [grid, setGrid] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');
  const flash = useRef(new Animated.Value(0)).current;

  // Small phones (like the Galaxy J5, about 640dp tall) get a tighter layout:
  // smaller bars, and the tips move inside the preview so the photo area stays big.
  const compact = height < 700;
  const topPad = Math.max(insets.top, 20) + (compact ? 4 : 8);
  const bottomPad = Math.max(insets.bottom, 12) + (compact ? 8 : 16);

  // Biggest 3:4 preview that fits between the top bar and the controls
  const TOP_BAR = compact ? 52 : 64;
  const TIPS = compact ? 0 : 40;
  const CONTROLS = compact ? 96 : 120;
  const SHUTTER = compact ? 72 : 84;
  const availH = height - topPad - TOP_BAR - TIPS - CONTROLS - bottomPad - 8;
  const previewW = Math.max(200, Math.min(width - 32, (availH * 3) / 4));

  function close() {
    setTorch(false);
    setError('');
    onClose();
  }

  async function capture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    setError('');
    // quick white flash so the student sees the photo was taken
    Animated.sequence([
      Animated.timing(flash, { toValue: 0.85, duration: 70, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setTorch(false);
      onCaptured(photo.uri);
    } catch {
      setError('Could not take the photo. Please try again.');
    } finally {
      setCapturing(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={close}>
      <View style={[styles.screen, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        {/* Top bar */}
        <View style={[styles.topBar, { height: TOP_BAR }]}>
          <TouchableOpacity
            style={styles.roundBtn}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close camera"
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.topSmall} numberOfLines={1}>{title}</Text>
            <Text style={styles.topTitle}>Photo of your finished work</Text>
          </View>
        </View>

        {/* Preview + guides */}
        <View style={styles.previewWrap}>
          <View style={[styles.preview, { width: previewW }]}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              ratio="4:3"
              enableTorch={torch}
            />

            <View pointerEvents="none" style={styles.roundMask} />

            {grid && (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <View style={[styles.gridV, { left: '33.33%' }]} />
                <View style={[styles.gridV, { left: '66.66%' }]} />
                <View style={[styles.gridH, { top: '33.33%' }]} />
                <View style={[styles.gridH, { top: '66.66%' }]} />
              </View>
            )}

            {/* gold corners (decoration only, the whole preview is photographed) */}
            <View pointerEvents="none" style={[styles.corner, styles.tl]} />
            <View pointerEvents="none" style={[styles.corner, styles.tr]} />
            <View pointerEvents="none" style={[styles.corner, styles.bl]} />
            <View pointerEvents="none" style={[styles.corner, styles.br]} />

            {compact && (
              <View pointerEvents="none" style={styles.hintPill}>
                <Text style={styles.hintText} numberOfLines={1}>Fit it all · good light · hold steady</Text>
              </View>
            )}

            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />
          </View>
        </View>

        {/* Tips (tall phones). Small phones show them inside the preview instead. */}
        {!compact && (
          <View style={styles.tipsRow}>
            <Tip icon="sunny-outline" text="Good light" />
            <Tip icon="scan-outline" text="Fit it all" />
            <Tip icon="hand-left-outline" text="Hold steady" />
          </View>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Controls */}
        <View style={[styles.controls, { height: CONTROLS }]}>
          <TouchableOpacity
            style={[styles.roundBtn, grid && styles.roundBtnOn]}
            onPress={() => setGrid((g) => !g)}
            accessibilityRole="button"
            accessibilityLabel="Toggle grid"
          >
            <Ionicons name="grid-outline" size={22} color={grid ? '#3A2B1A' : '#fff'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shutterOuter, { width: SHUTTER, height: SHUTTER, borderRadius: SHUTTER / 2 }]}
            onPress={capture}
            disabled={capturing}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
          >
            <View style={[styles.shutterInner, { width: SHUTTER - 22, height: SHUTTER - 22, borderRadius: (SHUTTER - 22) / 2 }]}>
              {capturing ? <ActivityIndicator color="#3A2B1A" /> : null}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roundBtn, torch && styles.roundBtnOn]}
            onPress={() => setTorch((t) => !t)}
            accessibilityRole="button"
            accessibilityLabel="Toggle flashlight"
          >
            <Ionicons name={torch ? 'flash' : 'flash-outline'} size={22} color={torch ? '#3A2B1A' : '#fff'} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Tip({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.tip}>
      <Ionicons name={icon} size={14} color={GOLD} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

const CORNER = 28;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, paddingHorizontal: 16 },
  topBar: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 12 },
  roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: SOFT, alignItems: 'center', justifyContent: 'center' },
  roundBtnOn: { backgroundColor: GOLD },
  topSmall: { fontSize: 12, color: '#D9C9A8' },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },

  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Same shape as the first working version: a plain 3:4 box, no rounded clipping on the camera itself
  // (rounded clipping can break the live preview on some Android phones).
  preview: { aspectRatio: 3 / 4, overflow: 'hidden', backgroundColor: '#2A1F18' },
  // Rounded look drawn ON TOP of the preview: a thick border in the screen color with a rounded hole
  roundMask: { position: 'absolute', left: -24, top: -24, right: -24, bottom: -24, borderWidth: 24, borderColor: BG, borderRadius: 48 },
  flash: { backgroundColor: '#fff' },
  hintPill: { position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' },
  hintText: { color: '#fff', fontSize: 12, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, overflow: 'hidden' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.35)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.35)' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: GOLD },
  tl: { left: 14, top: 14, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 10 },
  tr: { right: 14, top: 14, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 10 },
  bl: { left: 14, bottom: 14, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 10 },
  br: { right: 14, bottom: 14, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 10 },

  tipsRow: { height: 40, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: SOFT, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  tipText: { color: '#EBD9BF', fontSize: 12, fontWeight: '600' },
  error: { color: '#FCA5A5', fontSize: 12, textAlign: 'center', marginBottom: 4 },

  controls: { height: 120, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 12 },
  shutterOuter: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
});