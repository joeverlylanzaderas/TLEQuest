// admin-web/src/theme/theme.ts
import { apiClient } from '../api/client';

export type ThemeKey = 'default' | 'school';
const STORE_KEY = 'tlequest_theme';

/** Switches the whole admin web to the given theme right away. */
export function applyTheme(theme: ThemeKey) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(STORE_KEY, theme); } catch { /* ignore */ }
}

/** Call once at startup: use the saved theme instantly, then ask the server. */
export function initTheme() {
  let saved: ThemeKey = 'default';
  try { saved = localStorage.getItem(STORE_KEY) === 'school' ? 'school' : 'default'; } catch { /* ignore */ }
  applyTheme(saved);
  apiClient.get('/core/theme/')
    .then((res) => applyTheme(res.data?.theme === 'school' ? 'school' : 'default'))
    .catch(() => { /* offline: keep the saved theme */ });
}