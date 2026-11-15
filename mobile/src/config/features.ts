// mobile/src/config/features.ts
// Experimental features. These need native code that only exists in a NEW build
// (a development build), so they are off in normal EAS Update bundles.
//
//   QUEST_MAP_ENABLED  the "Map" view on the student Quests tab (needs react-native-svg)
//
// It is on while running a development build (npx expo start --dev-client, where __DEV__ is true).
// To switch it on in another build, set EXPO_PUBLIC_QUEST_MAP=1 for that build.
export const QUEST_MAP_ENABLED: boolean =
  (typeof __DEV__ !== 'undefined' && __DEV__) || process.env.EXPO_PUBLIC_QUEST_MAP === '1';
