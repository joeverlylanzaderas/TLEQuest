// mobile/src/utils/dates.ts
// Helpers for the start/due dates of a quest. The backend stores full timestamps,
// the teacher picks calendar days:
//   start date -> the beginning of that day (students see the quest from then on)
//   due date   -> the END of that day (a quest "due Oct 20" is still open all of Oct 20)

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 0, 0);
}

export function startOfDayISO(d: Date | null): string | null {
  return d ? startOfDay(d).toISOString() : null;
}

export function endOfDayISO(d: Date | null): string | null {
  return d ? endOfDay(d).toISOString() : null;
}

export function parseISODate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatPickedDate(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
