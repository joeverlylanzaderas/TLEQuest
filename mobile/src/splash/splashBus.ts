// mobile/src/splash/splashBus.ts
// Tiny shared state between the animated splash (drawn over everything in app/_layout.tsx)
// and the login screen, so the logo can glide from the splash into its exact spot on the login screen.
import { useSyncExternalStore } from 'react';

export interface Rect { x: number; y: number; width: number; height: number }

export interface SplashState {
  active: boolean;     // the splash overlay is still on screen
  handoff: boolean;    // the splash started leaving: the login screen may start its own entrance
  logoShown: boolean;  // the login screen's own logo may be visible now
  rect: Rect | null;   // where the logo sits on the login screen (window coordinates)
}

let state: SplashState = { active: true, handoff: false, logoShown: false, rect: null };
const listeners = new Set<() => void>();

function set(patch: Partial<SplashState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const splashBus = {
  setRect(rect: Rect) {
    const r = state.rect;
    if (!state.active) return;
    if (r && r.x === rect.x && r.y === rect.y && r.width === rect.width && r.height === rect.height) return;
    set({ rect });
  },
  beginHandoff() { set({ handoff: true }); },
  showLogo() { set({ logoShown: true }); },
  finish() { set({ active: false, handoff: true, logoShown: true }); },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
const getState = () => state;

export function useSplashState(): SplashState {
  return useSyncExternalStore(subscribe, getState, getState);
}
