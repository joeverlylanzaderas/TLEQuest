// mobile/src/ml/classifier.ts
import { Image } from 'react-native';
import { Asset } from 'expo-asset';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'jpeg-js';

// Confirmed from Colab Cell 9 output: exact strings and exact order
export const CLASS_NAMES = ['ACCEPTED', 'FOR REVIEW'] as const;
export type ClassificationLabel = typeof CLASS_NAMES[number];

// If the model says ACCEPTED but is less sure than this, send it to the
// teacher as FOR REVIEW instead. Tune this after real-world testing.
export const CONFIDENCE_THRESHOLD = 0.75;

// Fallback input size. The real size is read from the loaded model, so a
// retrained model with a different input size (e.g. 384) works by just
// replacing tlequest_classifier.tflite, with no code change.
const DEFAULT_SIZE = 224;

function getModelInputSize(model: any): number {
  const shape = model?.inputs?.[0]?.shape; // [1, H, W, 3]
  const size = Array.isArray(shape) ? Number(shape[1]) : NaN;
  return Number.isFinite(size) && size > 0 ? size : DEFAULT_SIZE;
}

export interface ClassificationResult {
  label: ClassificationLabel;
  confidence: number;                  // confidence of the final label (0-1)
  probabilities: Record<string, number>; // raw model output per class
  elapsedMs: number;
  // Debug helpers: the exact image the model received, and the size of the
  // original photo. Used by the classifier-test screen to spot rotation or
  // stretching problems.
  inputPreviewUri?: string;
  originalWidth?: number;
  originalHeight?: number;
}

// The training photos were rotated to an upright portrait view (glass on the
// upper right). Phone cameras often hand us the raw landscape file (e.g.
// 4128 x 3096), so when a photo is wider than it is tall we rotate it first.
// Degrees clockwise. Try 90 first; if "What the AI sees" is upside-down use
// 270, and use 0 to turn this off.
const LANDSCAPE_ROTATE_DEGREES = 0;

// The native module is required lazily so that importing this file never
// crashes in Expo Go (it only exists inside the development build).
let modelInstance: any = null;

export async function loadModel() {
  if (!modelInstance) {
    const tflite = (() => {
      try {
        return require('react-native-fast-tflite');
      } catch {
        throw new Error('AI model is not available in this app build.');
      }
    })();
    const asset = Asset.fromModule(require('../../assets/model/tlequest_classifier.tflite'));
    if (!asset.localUri) await asset.downloadAsync();
    const url = asset.localUri || asset.uri;
    modelInstance = await tflite.loadTensorflowModel({ url }, []);
  }
  return modelInstance;
}

const LOOKUP = new Uint8Array(256);
'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  .split('')
  .forEach((ch, i) => { LOOKUP[ch.charCodeAt(0)] = i; });

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const e1 = LOOKUP[clean.charCodeAt(i)];
    const e2 = LOOKUP[clean.charCodeAt(i + 1)];
    const e3 = i + 2 < clean.length ? LOOKUP[clean.charCodeAt(i + 2)] : 0;
    const e4 = i + 3 < clean.length ? LOOKUP[clean.charCodeAt(i + 3)] : 0;
    if (p < bytes.length) bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < bytes.length) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < bytes.length) bytes[p++] = ((e3 & 3) << 6) | e4;
  }
  return bytes;
}

/**
 * Takes a local photo URI (from the in-app camera) and returns the model's verdict.
 * Mirrors the Colab training pipeline exactly:
 *   resize 224x224 (stretch) -> RGB -> pixel / 127.5 - 1  (MobileNetV2 preprocess_input)
 */
export async function classifyImage(imageUri: string): Promise<ClassificationResult> {
  const started = Date.now();
  console.log('CLASSIFY: start');

  // 0. Load the model first so we know the input size it expects
  const model = await loadModel();
  const SIZE = getModelInputSize(model);
  console.log('CLASSIFY: model input size', SIZE);

  // 0b. Only look up the photo size when we actually need it (rotation).
  // Image.getSize reads just the file header, so it is nearly instant. The old
  // code decoded and re-encoded the full 12 MP photo here, which cost seconds.
  let originalWidth: number | undefined;
  let originalHeight: number | undefined;
  const actions: any[] = [];
  if (LANDSCAPE_ROTATE_DEGREES) {
    const size = await new Promise<{ w: number; h: number }>((resolve, reject) =>
      Image.getSize(imageUri, (w, h) => resolve({ w, h }), reject)
    );
    originalWidth = size.w;
    originalHeight = size.h;
    if (size.w > size.h) actions.push({ rotate: LANDSCAPE_ROTATE_DEGREES });
  }

  // 1. Resize once (stretch, same as Roboflow) and get the JPEG as base64
  actions.push({ resize: { width: SIZE, height: SIZE } });
  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    actions,
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!resized.base64) throw new Error('Could not read the photo.');
  console.log('CLASSIFY: resized');

  // 2. Decode the JPEG into raw RGBA pixels (pure JS)
  const decoded = decode(base64ToBytes(resized.base64), { useTArray: true, formatAsRGBA: true });
  console.log('CLASSIFY: decoded', decoded.width, decoded.height);
  if (decoded.width !== SIZE || decoded.height !== SIZE) {
    throw new Error(`Unexpected image size ${decoded.width}x${decoded.height}`);
  }

  // 3. RGBA -> RGB float32 in [-1, 1]
  const input = new Float32Array(SIZE * SIZE * 3);
  const rgba = decoded.data;
  for (let i = 0, j = 0; i < rgba.length; i += 4) {
    input[j++] = rgba[i] / 127.5 - 1;
    input[j++] = rgba[i + 1] / 127.5 - 1;
    input[j++] = rgba[i + 2] / 127.5 - 1;
  }
  console.log('CLASSIFY: input ready', input.length);

  // 4. Run the model (v3 of react-native-fast-tflite works with ArrayBuffers)
  console.log('CLASSIFY: running model');
  const outputs = await model.run([input.buffer]);
  console.log('CLASSIFY: model done, outputs =', outputs.length);
  const probs = Array.from(new Float32Array(outputs[0] as ArrayBuffer));
  console.log('CLASSIFY: probs =', probs);

  const probabilities: Record<string, number> = {};
  CLASS_NAMES.forEach((name, i) => { probabilities[name] = probs[i]; });

  const topIndex = probs[0] >= probs[1] ? 0 : 1;
  let label: ClassificationLabel = CLASS_NAMES[topIndex];
  let confidence = probs[topIndex];

  if (label === 'ACCEPTED' && confidence < CONFIDENCE_THRESHOLD) {
    label = 'FOR REVIEW';
    confidence = probs[1];
  }

  return {
    label,
    confidence,
    probabilities,
    elapsedMs: Date.now() - started,
    inputPreviewUri: resized.uri,
    originalWidth,
    originalHeight,
  };
}