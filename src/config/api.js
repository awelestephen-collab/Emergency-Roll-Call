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

  // 3. Dynamic host detection: If running locally or on custom server, use same host
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, port, origin } = window.location;
    // Vite dev server running on port 5173 -> talk directly to Express backend on 3001
    if (port === '5173') {
      return `http://${hostname}:3001`;
    }
    // If served from Express directly (port 3001) or custom domain/LAN IP, use origin
    if (port === '3001' || (hostname !== 'localhost' && !hostname.includes('github.io'))) {
      return origin;
    }
  }

  // 4. Default production cloud hub for GitHub Pages / static hosting
  return 'https://falcon-emergency-roll-call.onrender.com';
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
