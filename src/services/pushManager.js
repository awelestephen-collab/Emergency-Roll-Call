import { getApiUrl } from '../config/api';

const DEFAULT_VAPID_PUBLIC_KEY = 'BBVFvuJHe6CcnhmjzNM1QdGnbqxlVHzmKzfcXGxLN2qhEdtHbN1Ua5UZ4WgMzuUl8PbWEzHi6hD5tkbrLY5Kw_s';
const STORAGE_KEY_SUBSCRIBED = 'emergency_push_subscribed';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushManager = {
  isPushSupported() {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  getPermissionStatus() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  },

  async getExistingSubscription() {
    if (!this.isPushSupported()) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.getSubscription();
    } catch (e) {
      console.warn('[PushManager] Error getting subscription:', e);
      return null;
    }
  },

  async isSubscribed() {
    if (!this.isPushSupported()) return false;
    if (Notification.permission !== 'granted') return false;
    const sub = await this.getExistingSubscription();
    return !!sub;
  },

  async fetchPublicKey() {
    try {
      const res = await fetch(getApiUrl('/api/push/public-key'));
      if (res.ok) {
        const data = await res.json();
        if (data.publicKey) return data.publicKey;
      }
    } catch (e) {
      console.warn('[PushManager] Could not fetch public key from server, using default:', e);
    }
    return DEFAULT_VAPID_PUBLIC_KEY;
  },

  async subscribe(metadata = {}) {
    if (!this.isPushSupported()) {
      throw new Error('Push notifications are not supported on this browser/device.');
    }

    // 1. Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission was not granted.');
    }

    // 2. Fetch VAPID key
    const publicKey = await this.fetchPublicKey();
    const convertedVapidKey = urlBase64ToUint8Array(publicKey);

    // 3. Ensure service worker is ready
    const reg = await navigator.serviceWorker.ready;

    // 4. Subscribe with PushManager
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    // 5. Register subscription with backend server
    const payload = {
      subscription: subscription.toJSON(),
      staffId: metadata.staffId || null,
      staffName: metadata.staffName || null,
      deviceInfo: navigator.userAgent
    };

    let syncedWithServer = false;
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(getApiUrl('/api/push/subscribe'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          syncedWithServer = true;
          break;
        }
        lastError = new Error(`Server returned status ${res.status}`);
      } catch (err) {
        lastError = err;
      }
    }

    if (!syncedWithServer) {
      console.error('[PushManager] Failed to register push subscription with backend:', lastError);
      throw new Error('Could not finish notification setup on server. Please check your connection and try again.');
    }

    localStorage.setItem(STORAGE_KEY_SUBSCRIBED, 'true');
    console.info('[PushManager] Push subscription active and synced with backend.');
    return subscription;
  },

  async unsubscribe() {
    try {
      const sub = await this.getExistingSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        // Notify server
        await fetch(getApiUrl('/api/push/unsubscribe'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint })
        }).catch(() => {});
      }
      localStorage.removeItem(STORAGE_KEY_SUBSCRIBED);
      return true;
    } catch (e) {
      console.error('[PushManager] Failed to unsubscribe:', e);
      return false;
    }
  },

  async sendTestAlert() {
    const sub = await this.getExistingSubscription();
    try {
      const res = await fetch(getApiUrl('/api/push/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub ? sub.toJSON() : null })
      });
      if (res.ok) {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return { success: true, message: 'Test alert dispatched' };
        }
      }
    } catch (e) {
      console.warn('[PushManager] Backend push test endpoint failed, falling back to local SW notification:', e);
    }

    // Fallback: If backend is unreachable or returns non-JSON, trigger local notification via Service Worker
    if (this.isPushSupported() && Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification('🚨 TEST EMERGENCY ALERT', {
          body: 'Test alert successful: Your phone will ring and vibrate when an evacuation drill is declared!',
          icon: './icon-192.png',
          badge: './icon-192.png',
          vibrate: [500, 200, 500, 200, 1000],
          tag: 'emergency-test',
          renotify: true,
          requireInteraction: true,
          data: {
            url: './?autoAlarm=1',
            type: 'TEST'
          }
        });
        return { success: true, message: 'Local lock-screen test notification triggered!' };
      } catch (localErr) {
        console.error('[PushManager] Local notification fallback error:', localErr);
        throw new Error(localErr.message || 'Could not display test notification.');
      }
    }

    throw new Error('Could not display test alert. Ensure notification permissions are granted.');
  },

  openNotificationSettings() {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isFirefox = /firefox/i.test(ua);
    const settingsUrl = isFirefox
      ? 'about:preferences#privacy'
      : 'chrome://settings/content/notifications';

    try {
      const opened = window.open(settingsUrl, '_blank', 'noopener,noreferrer');
      return !!opened;
    } catch (err) {
      console.warn('[PushManager] Could not open notification settings URL:', err);
      return false;
    }
  }
};
