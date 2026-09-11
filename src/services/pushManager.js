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

    try {
      const res = await fetch(getApiUrl('/api/push/subscribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        console.warn('[PushManager] Server returned status:', res.status);
      }
    } catch (err) {
      console.error('[PushManager] Failed to send subscription to server:', err);
    }

    localStorage.setItem(STORAGE_KEY_SUBSCRIBED, 'true');
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
    const res = await fetch(getApiUrl('/api/push/test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub ? sub.toJSON() : null })
    });
    return res.json();
  }
};
