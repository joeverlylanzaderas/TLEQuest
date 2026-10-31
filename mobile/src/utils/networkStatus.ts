// mobile/src/utils/networkStatus.ts
// One small shared status that the offline banner reads:
//  - offline:  the last request could not reach the server (no/weak signal)
//  - cachedAt: when the saved data being shown was stored
//  - pending:  how many submissions are waiting on the phone to be sent
import { useSyncExternalStore } from 'react';

export interface NetworkState {
  offline: boolean;
  cachedAt: number | null;
  pending: number;
}

let state: NetworkState = { offline: false, cachedAt: null, pending: 0 };
const listeners = new Set<() => void>();

function update(patch: Partial<NetworkState>) {
  const next = { ...state, ...patch };
  if (next.offline === state.offline && next.cachedAt === state.cachedAt && next.pending === state.pending) {
    return; // nothing changed, do not re-render anyone
  }
  state = next;
  listeners.forEach((listener) => listener());
}

export function markOffline(cachedAt: number | null) {
  update({ offline: true, cachedAt });
}

export function markOnline() {
  update({ offline: false, cachedAt: null });
}

export function setPendingCount(pending: number) {
  update({ pending });
}

export function getNetworkState(): NetworkState {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNetworkStatus(): NetworkState {
  return useSyncExternalStore(subscribe, getNetworkState, getNetworkState);
}
