// mobile/src/utils/shrinkAvatar.ts
// A profile picture only needs to be ~512 px. Shrinking it before upload makes the
// upload fast and, more important, makes the picture load fast every time it is shown.
import * as ImageManipulator from 'expo-image-manipulator';

export async function shrinkAvatar(uri: string): Promise<{ uri: string; ext: string; type: string }> {
  try {
    const r = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 512 } }], {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return { uri: r.uri, ext: 'jpg', type: 'image/jpeg' };
  } catch {
    const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
    return { uri, ext, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` };
  }
}
