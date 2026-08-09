import axios from 'axios';

const TOKEN_STORAGE_KEY = 'hrckmp_token';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
});

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

// Attachments are served from the API origin's /uploads path (see
// server/src/app.js), not under /api/v1 — this strips that suffix so
// record_attachments.file_path can be turned into a fetchable URL.
export function apiOrigin() {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return base.replace(/\/api\/v1\/?$/, '') || window.location.origin;
}

axiosClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      setToken(null);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
