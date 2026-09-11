import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const SUBS_FILE = path.join(DATA_DIR, 'pushSubscriptions.json');

// Standard VAPID credentials
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BBVFvuJHe6CcnhmjzNM1QdGnbqxlVHzmKzfcXGxLN2qhEdtHbN1Ua5UZ4WgMzuUl8PbWEzHi6hD5tkbrLY5Kw_s';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'zdH8OAZKa3AqL0mq1rQA-fqdDC7S1xHxuWplE92tAKw';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:safety@falcon-emergency.app';

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache of subscriptions
let subscriptions = [];

function loadSubscriptions() {
  try {
    if (fs.existsSync(SUBS_FILE)) {
      subscriptions = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[PushService] Error reading push subscriptions:', err);
    subscriptions = [];
  }
}

function saveSubscriptions() {
  try {
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subscriptions, null, 2), 'utf-8');
  } catch (err) {
    console.error('[PushService] Error saving push subscriptions:', err);
  }
}

// Initial load
loadSubscriptions();

export const pushService = {
  getPublicKey() {
    return VAPID_PUBLIC_KEY;
  },

  getAllSubscriptions() {
    return subscriptions;
  },

  getSubscribersCount() {
    return subscriptions.length;
  },

  addSubscription(subscription, metadata = {}) {
    if (!subscription || !subscription.endpoint) {
      throw new Error('Invalid push subscription: missing endpoint');
    }

    const existingIndex = subscriptions.findIndex(
      (s) => s.subscription.endpoint === subscription.endpoint
    );

    const record = {
      id: existingIndex >= 0 ? subscriptions[existingIndex].id : uuidv4(),
      subscription,
      staffId: metadata.staffId || null,
      staffName: metadata.staffName || null,
      deviceInfo: metadata.deviceInfo || 'Unknown Device',
      userAgent: metadata.userAgent || '',
      updatedAt: new Date().toISOString(),
      createdAt: existingIndex >= 0 ? subscriptions[existingIndex].createdAt : new Date().toISOString()
    };

    if (existingIndex >= 0) {
      subscriptions[existingIndex] = record;
    } else {
      subscriptions.push(record);
    }

    saveSubscriptions();
    console.log(`[PushService] Device subscribed. Total active devices: ${subscriptions.length}`);
    return record;
  },

  removeSubscription(endpoint) {
    const beforeCount = subscriptions.length;
    subscriptions = subscriptions.filter((s) => s.subscription.endpoint !== endpoint);
    if (subscriptions.length !== beforeCount) {
      saveSubscriptions();
      console.log(`[PushService] Device removed. Total active devices: ${subscriptions.length}`);
    }
    return { success: true };
  },

  async sendToSubscription(subscription, payload) {
    const stringifiedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const options = {
      TTL: 60 * 60 * 24, // 24 hours
      urgency: 'high' // Highest priority on FCM / APNs to wake sleeping devices
    };

    return webpush.sendNotification(subscription, stringifiedPayload, options);
  },

  async broadcastAlert(alertData) {
    const payload = {
      title: alertData.title || '🚨 EMERGENCY EVACUATION DRILL',
      body: alertData.body || 'Immediate evacuation ordered! Tap to open muster roll-call.',
      icon: alertData.icon || './icon-192.png',
      badge: alertData.badge || './icon-192.png',
      tag: alertData.tag || 'emergency-alert',
      vibrate: alertData.vibrate || [500, 200, 500, 200, 1000],
      requireInteraction: alertData.requireInteraction !== false, // Default true
      renotify: true,
      timestamp: Date.now(),
      data: {
        url: alertData.url || './',
        type: alertData.type || 'EVACUATION',
        incidentId: alertData.incidentId || null,
        ...alertData.data
      }
    };

    console.log(`[PushService] Broadcasting push alert to ${subscriptions.length} registered device(s)...`);

    let sent = 0;
    let failed = 0;
    const expiredEndpoints = [];

    const promises = subscriptions.map(async (item) => {
      try {
        await this.sendToSubscription(item.subscription, payload);
        sent++;
      } catch (err) {
        failed++;
        console.warn(`[PushService] Push failed for ${item.deviceInfo || 'device'}:`, err.statusCode || err.message);
        // HTTP 404 or 410 means subscription is permanently expired or unsubscribed
        if (err.statusCode === 404 || err.statusCode === 410) {
          expiredEndpoints.push(item.subscription.endpoint);
        }
      }
    });

    await Promise.all(promises);

    // Prune expired endpoints
    if (expiredEndpoints.length > 0) {
      console.log(`[PushService] Pruning ${expiredEndpoints.length} expired subscription(s)...`);
      subscriptions = subscriptions.filter(
        (s) => !expiredEndpoints.includes(s.subscription.endpoint)
      );
      saveSubscriptions();
    }

    console.log(`[PushService] Push broadcast complete: ${sent} sent, ${failed} failed, ${expiredEndpoints.length} pruned.`);
    return { sent, failed, pruned: expiredEndpoints.length, total: subscriptions.length };
  }
};
