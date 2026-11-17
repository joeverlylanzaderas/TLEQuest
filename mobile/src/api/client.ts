import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { saveToCache, readFromCache, hasCache } from '../utils/offlineCache';
import { markOffline, markOnline } from '../utils/networkStatus';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://tlequest.duckdns.org/api';


// --- Bridge so this file (outside the component tree) can tell
// AuthContext to actually clear its `user` state on a hard session failure.
type SignOutHandler = () => void;
let onForceSignOut: SignOutHandler | null = null;
export function registerForceSignOutHandler(handler: SignOutHandler) {
  onForceSignOut = handler;
}
// ---

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 s: 10 s was too short for weak signal
});

// --- Weak-signal retry: only for GET (safe to repeat), only when the request
// never got a proper answer (no connection, timeout) or the server was briefly
// unavailable. POST/PATCH are NOT retried, so nothing is submitted twice.
const RETRY_DELAYS_MS = [1000, 2000];
const WEAK_SIGNAL_MESSAGE = 'Weak or no signal. Please check your connection and try again.';
const SERVER_DOWN_STATUSES = [502, 503, 504];
// When a saved copy exists, do not make the student wait 30 s: give up after 8 s
const CACHED_REQUEST_TIMEOUT_MS = 8000;

function isGet(config: any): boolean {
  return String(config?.method ?? '').toLowerCase() === 'get';
}

function isRetryable(error: any): boolean {
  if (!isGet(error?.config)) return false;
  if (!error.response) return true; // network error or timeout
  return SERVER_DOWN_STATUSES.includes(error.response.status);
}

// Who is logged in (the saved copies are kept per user)
async function currentUserId(): Promise<number | null> {
  try {
    const stored = await SecureStore.getItemAsync('user');
    const id = stored ? JSON.parse(stored)?.id : null;
    return typeof id === 'number' ? id : null;
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // GET requests: remember where to keep a saved copy of the answer.
  // A request can opt out with { _skipCache: true }.
  const extra = config as any;
  if (isGet(config) && !extra._skipCache) {
    const userId = await currentUserId();
    if (userId !== null) {
      const key = apiClient.getUri(config);
      extra._cacheUser = userId;
      extra._cacheKey = key;
      if (await hasCache(userId, key)) {
        config.timeout = Math.min(config.timeout ?? CACHED_REQUEST_TIMEOUT_MS, CACHED_REQUEST_TIMEOUT_MS);
      }
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    markOnline(); // the server answered, so we have signal
    const cfg = response.config as any;
    if (cfg?._cacheKey && cfg._cacheUser != null) {
      void saveToCache(cfg._cacheUser, cfg._cacheKey, response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Any real answer (even an error answer) means the server is reachable
    if (error.response && !SERVER_DOWN_STATUSES.includes(error.response.status)) {
      markOnline();
    }

    // No signal (or server briefly down) on a GET: show the last saved copy if we have one
    const cannotReach = !error.response || SERVER_DOWN_STATUSES.includes(error.response.status);
    if (cannotReach && originalRequest?._cacheKey && originalRequest._cacheUser != null) {
      const cached = await readFromCache(originalRequest._cacheUser, originalRequest._cacheKey);
      if (cached) {
        markOffline(cached.savedAt);
        return {
          data: cached.data,
          status: 200,
          statusText: 'OK (saved copy)',
          headers: {},
          config: originalRequest,
          request: null,
          fromCache: true,
        };
      }
    }

    // Retry GET requests on a weak connection
    if (originalRequest && isRetryable(error)) {
      const attempt = originalRequest._retryCount ?? 0;
      if (attempt < RETRY_DELAYS_MS.length) {
        originalRequest._retryCount = attempt + 1;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        return apiClient(originalRequest);
      }
    }

    // No response at all after retries: show a clear message instead of "Network Error"
    if (!error.response) {
      markOffline(null);
      error.message = WEAK_SIGNAL_MESSAGE;
    }

    // Login / token-refresh calls: a 401 there just means "wrong username or password" (or an
    // expired refresh token). Pass the real answer through so the login screen can show it.
    const isAuthCall = String(originalRequest?.url ?? '').includes('/accounts/login/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthCall) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/accounts/login/refresh/`, {
          refresh: refreshToken,
        });

        await SecureStore.setItemAsync('access_token', data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user');
        onForceSignOut?.(); // actually clears AuthContext's user state
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);