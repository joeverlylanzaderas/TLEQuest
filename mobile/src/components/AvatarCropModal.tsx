// mobile/src/components/AvatarCropModal.tsx
// Our own square crop screen for profile pictures. The phone's built-in cropper has a tiny
// "crop" button that is easy to miss, so this one has a big "Crop" button instead.
//  - drag with one finger to move the picture
//  - pinch with two fingers (or use the + / - buttons) to zoom
// The square is cut out with expo-image-manipulator and handed back to the caller.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Image, Modal, TouchableOpacity, StyleSheet, PanResponder,
  ActivityIndicator, useWindowDimensions, GestureResponderEvent,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const ORANGE = '#F26B1D';
const MAX_ZOOM = 4;

interface Props {
  visible: boolean;
  uri: string | null;
  onCancel: () => void;
  /** Called with the cropped square image (512 x 512 JPEG). */
  onDone: (croppedUri: string) => void;
}

function touchDistance(e: GestureResponderEvent): number | null {
  const t = e.nativeEvent.touches;
  if (!t || t.length < 2) return null;
  const dx = t[0].pageX - t[1].pageX;
  const dy = t[0].pageY - t[1].pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function AvatarCropModal({ visible, uri, onCancel, onDone }: Props) {
  const { width: screenW } = useWindowDimensions();
  const box = Math.min(screenW - 48, 340); // the square crop area, in screen pixels

  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // how far the picture centre is from the box centre
  const [busy, setBusy] = useState(false);

  // Live copies for the gesture handlers (they are created once)
  const live = useRef({ zoom: 1, x: 0, y: 0, natural: null as { w: number; h: number } | null });
  const gesture = useRef({ startX: 0, startY: 0, startZoom: 1, startDist: 0 });

  useEffect(() => {
    setZoom(1); setOffset({ x: 0, y: 0 }); setNatural(null); setBusy(false);
    live.current = { zoom: 1, x: 0, y: 0, natural: null };
    if (!uri) return;
    Image.getSize(
      uri,
      (w, h) => { setNatural({ w, h }); live.current.natural = { w, h }; },
      () => setNatural(null),
    );
  }, [uri]);

  // scale that makes the picture just cover the box at zoom 1
  const baseScale = natural ? box / Math.min(natural.w, natural.h) : 1;

  function clamp(z: number, x: number, y: number) {
    const n = live.current.natural;
    if (!n) return { z, x, y };
    const zz = Math.min(MAX_ZOOM, Math.max(1, z));
    const s = (box / Math.min(n.w, n.h)) * zz;
    const maxX = Math.max(0, (n.w * s - box) / 2);
    const maxY = Math.max(0, (n.h * s - box) / 2);
    return { z: zz, x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  }

  function apply(z: number, x: number, y: number) {
    const c = clamp(z, x, y);
    live.current.zoom = c.z; live.current.x = c.x; live.current.y = c.y;
    setZoom(c.z);
    setOffset({ x: c.x, y: c.y });
  }

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          gesture.current = { startX: live.current.x, startY: live.current.y, startZoom: live.current.zoom, startDist: 0 };
        },
        onPanResponderMove: (e, g) => {
          const dist = touchDistance(e);
          if (dist !== null) {
            // two fingers: zoom
            if (gesture.current.startDist === 0) {
              gesture.current.startDist = dist;
              gesture.current.startZoom = live.current.zoom;
            }
            apply(gesture.current.startZoom * (dist / gesture.current.startDist), live.current.x, live.current.y);
          } else if (gesture.current.startDist === 0) {
            // one finger: move
            apply(live.current.zoom, gesture.current.startX + g.dx, gesture.current.startY + g.dy);
          }
        },
        onPanResponderRelease: () => { gesture.current.startDist = 0; },
        onPanResponderTerminate: () => { gesture.current.startDist = 0; },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [box],
  );

  async function handleCrop() {
    if (!uri || !natural || busy) return;
    setBusy(true);
    try {
      const s = baseScale * zoom;           // screen pixels per picture pixel
      const side = box / s;                 // the visible square, in picture pixels
      const cx = natural.w / 2 - offset.x / s;
      const cy = natural.h / 2 - offset.y / s;
      const sideI = Math.max(1, Math.min(Math.floor(side), natural.w, natural.h));
      const originX = Math.max(0, Math.min(natural.w - sideI, Math.round(cx - side / 2)));
      const originY = Math.max(0, Math.min(natural.h - sideI, Math.round(cy - side / 2)));
      const out = await ImageManipulator.manipulateAsync(
        uri,
        [
          { crop: { originX, originY, width: sideI, height: sideI } },
          { resize: { width: 512, height: 512 } },
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );
      onDone(out.uri);
    } catch {
      // if cropping fails for any reason, fall back to the picture as it is
      onDone(uri);
    } finally {
      setBusy(false);
    }
  }

  const imgW = natural ? natural.w * baseScale * zoom : box;
  const imgH = natural ? natural.h * baseScale * zoom : box;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.screen}>
        <Text style={styles.title}>Move and zoom your photo</Text>
        <Text style={styles.sub}>Drag to move, pinch to zoom. The circle is what others will see.</Text>

        <View style={[styles.box, { width: box, height: box }]} {...pan.panHandlers}>
          {uri && natural ? (
            <Image
              source={{ uri }}
              style={{
                position: 'absolute',
                width: imgW, height: imgH,
                left: (box - imgW) / 2 + offset.x,
                top: (box - imgH) / 2 + offset.y,
              }}
              resizeMode="stretch"
            />
          ) : (
            <ActivityIndicator color="#fff" />
          )}
          <View pointerEvents="none" style={[styles.circle, { borderRadius: box / 2 }]} />
        </View>

        <View style={styles.zoomRow}>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => apply(zoom - 0.25, offset.x, offset.y)} accessibilityLabel="Zoom out">
            <Text style={styles.zoomText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => apply(zoom + 0.25, offset.x, offset.y)} accessibilityLabel="Zoom in">
            <Text style={styles.zoomText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.cropBtn, (!natural || busy) && { opacity: 0.6 }]}
          onPress={handleCrop}
          disabled={!natural || busy}
          accessibilityRole="button"
          accessibilityLabel="Crop and use this photo"
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.cropText}>Crop</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={busy}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  sub: { color: '#D1D5DB', fontSize: 12, textAlign: 'center', marginBottom: 18 },
  box: { backgroundColor: '#000', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  circle: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: '#fff' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 },
  zoomBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  zoomText: { color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 28 },
  zoomLabel: { color: '#fff', fontSize: 13, fontWeight: '700', minWidth: 48, textAlign: 'center' },
  cropBtn: {
    marginTop: 22, alignSelf: 'stretch', height: 54, borderRadius: 27, backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
  },
  cropText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  cancelBtn: { marginTop: 10, alignSelf: 'stretch', height: 48, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#E5E7EB', fontSize: 15, fontWeight: '700' },
});
