// mobile/src/utils/selectedClass.ts
// Which class the student is looking at right now.
// A student can be in several classes. The quest/submission lists come from the
// server for ALL classes, so we also remember which group belongs to which
// class, and use that to show only the selected class.
import { useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getMyClasses, getClassGroups } from '../api/classrooms';
import { ClassSummary } from '../types/classrooms';

export interface ClassScope {
  userId: number | null;
  classes: ClassSummary[];
  selectedId: number | null;
  groupClass: Record<number, number>; // group id -> class id
  loaded: boolean;
}

let state: ClassScope = { userId: null, classes: [], selectedId: null, groupClass: {}, loaded: false };
const listeners = new Set<() => void>();

function set(next: ClassScope) {
  state = next;
  listeners.forEach((l) => l());
}

const storageKey = (userId: number) => `selected_class_${userId}`;

async function readSaved(userId: number): Promise<number | null> {
  try {
    const v = await SecureStore.getItemAsync(storageKey(userId));
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

/** Load the student's classes (and their groups). Returns the fresh state. */
export async function refreshClasses(userId: number): Promise<ClassScope> {
  const classes = await getMyClasses();
  const groupClass: Record<number, number> = {};
  await Promise.all(
    classes.map(async (c) => {
      try {
        const groups = await getClassGroups(c.id);
        groups.forEach((g) => { groupClass[g.id] = c.id; });
      } catch {
        // this class's groups could not load; its items will be shown anyway
      }
    })
  );

  const keep = state.userId === userId ? state.selectedId : null;
  const saved = keep ?? (await readSaved(userId));
  const selectedId = classes.some((c) => c.id === saved) ? saved : classes[0]?.id ?? null;

  set({ userId, classes, selectedId, groupClass, loaded: true });
  return state;
}

export async function selectClass(classId: number) {
  set({ ...state, selectedId: classId });
  if (state.userId !== null) {
    try { await SecureStore.setItemAsync(storageKey(state.userId), String(classId)); } catch { /* not important */ }
  }
}

export function clearSelectedClass() {
  set({ userId: null, classes: [], selectedId: null, groupClass: {}, loaded: false });
}

/** True when an item (by its group id) belongs to the selected class. */
export function inSelectedClass(scope: ClassScope, groupId: number): boolean {
  if (scope.classes.length <= 1 || scope.selectedId === null) return true;
  const classId = scope.groupClass[groupId];
  return classId === undefined || classId === scope.selectedId; // unknown group: do not hide it
}

export function selectedClassName(scope: ClassScope): string {
  return scope.classes.find((c) => c.id === scope.selectedId)?.class_name ?? 'No class joined';
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useClassScope(): ClassScope {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
