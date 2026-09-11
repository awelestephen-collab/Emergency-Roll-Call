import express from 'express';
import { pushService } from '../services/pushService.js';

export function createPushRouter() {
  const router = express.Router();

  // GET /api/push/public-key - Fetch VAPID public key for browser push registration
  router.get('/public-key', (req, res) => {
    try {
      const publicKey = pushService.getPublicKey();
      res.json({ publicKey });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/push/subscribe - Register device push subscription
  router.post('/subscribe', (req, res) => {
    try {
      const { subscription, staffId, staffName, deviceInfo, userAgent } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Valid subscription object is required' });
      }

      const record = pushService.addSubscription(subscription, {
        staffId,
        staffName,
        deviceInfo: deviceInfo || req.headers['user-agent'] || 'Mobile Device',
        userAgent: userAgent || req.headers['user-agent'] || ''
      });

      res.status(201).json({
        success: true,
        message: 'Push subscription registered successfully',
        id: record.id,
        totalSubscribers: pushService.getSubscribersCount()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/push/unsubscribe - Unregister device
  router.post('/unsubscribe', (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint is required' });
      }

      pushService.removeSubscription(endpoint);
      res.json({ success: true, totalSubscribers: pushService.getSubscribersCount() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/push/test - Dispatch test notification
  router.post('/test', async (req, res) => {
    try {
      const { subscription } = req.body;
      const testPayload = {
        title: '🚨 TEST EMERGENCY ALERT',
        body: 'Test alert: Your phone will ring and vibrate when a drill is declared even if your screen is locked!',
        tag: 'emergency-test',
        vibrate: [500, 200, 500, 200, 1000],
        requireInteraction: true,
        data: {
          url: './',
          type: 'TEST'
        }
      };

      if (subscription && subscription.endpoint) {
        await pushService.sendToSubscription(subscription, testPayload);
        return res.json({ success: true, message: 'Direct test notification sent to device' });
      }

      const result = await pushService.broadcastAlert(testPayload);
      res.json({ success: true, message: 'Broadcast test alert dispatched', result });
    } catch (err) {
      console.error('[PushRouter] Test push error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/push/stats - Return count of registered devices
  router.get('/stats', (req, res) => {
    try {
      res.json({
        totalSubscribers: pushService.getSubscribersCount()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
