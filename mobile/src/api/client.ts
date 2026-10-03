import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BASE_URL = 'http://192.168.11.113:8000/api'; // LAN IP


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
  timeout: 10000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
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