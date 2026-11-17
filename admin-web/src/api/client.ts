//admin-web/src/api/client.ts
import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://tlequest.duckdns.org/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 3000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // A 401 from the login call itself just means "wrong username or password" — it must not
    // go through the token-refresh logic, or the real error message gets replaced by a generic one.
    const isAuthCall = String(originalRequest?.url ?? '').includes('/accounts/login/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthCall) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/accounts/login/refresh/`, {
          refresh: refreshToken,
        });

        localStorage.setItem('access_token', data.access);
        // Refresh tokens rotate: keep the new one, the old one is now blacklisted.
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        // Tell the app the session is over, so it goes back to the login screen right away.
        window.dispatchEvent(new Event('auth:expired'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
