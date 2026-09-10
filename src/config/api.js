// Central configuration for backend API and WebSocket endpoints

const STORAGE_KEY_BACKEND = 'emergency_backend_url';

export function getBackendUrl() {
  // 1. Explicit user/admin override stored in localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BACKEND);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {}

  // 2. Build-time Vite environment variable
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.trim().replace(/\/+$/, '');
  }

  // 3. If running locally or on local IP network
  if (
    typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.')
    )
  ) {
    return window.location.origin;
  }

  // 4. Default for static hosting (GitHub Pages / Vercel without custom backend set)
  return '';
}

export function setBackendUrl(url) {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(STORAGE_KEY_BACKEND);
    } else {
      localStorage.setItem(STORAGE_KEY_BACKEND, url.trim().replace(/\/+$/, ''));
    }
  } catch {}
}

export function getApiUrl(path) {
  const base = getBackendUrl();
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return base ? base + cleanPath : cleanPath;
}
