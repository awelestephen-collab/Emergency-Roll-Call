import express from 'express';
import { store } from '../store.js';
import { pushService } from '../services/pushService.js';

export function createIncidentsRouter(io) {
  const router = express.Router();
  const buildAlertId = (scope) => `${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // GET /api/incidents/active - Current incident and live roster
  router.get('/active', (req, res) => {
    try {
      const summary = store.getRosterSummary();
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/incidents/declare - Start new emergency evacuation
  router.post('/declare', (req, res) => {
    try {
      const { type, declaredBy, notes, simulatedDrill, escalationThresholdSeconds } = req.body;
      const summary = store.declareIncident({
        type: type || 'Fire Evacuation',
        declaredBy: declaredBy || 'Safety Warden',
        notes: notes || '',
        simulatedDrill: !!simulatedDrill,
        escalationThresholdSeconds: escalationThresholdSeconds || 300
      });

      // Broadcast to all connected sockets
      const alertId = buildAlertId('declare');
      console.log(`[AlertDispatch] emergency_declared ${alertId} incident=${summary.incident.id}`);
      io.emit('emergency_declared', { ...summary, alertId });

      // Broadcast Web Push to wake up locked/closed mobile devices
      const isDrill = !!simulatedDrill;
      const incidentTitle = isDrill
        ? `🚨 DRILL: ${summary.incident.type.toUpperCase()}`
        : `🚨 EMERGENCY: ${summary.incident.type.toUpperCase()}`;
      const incidentBody = isDrill
        ? `PRACTICE DRILL declared by ${summary.incident.declaredBy}. Proceed to muster points and tap here to check in.`
        : `CRITICAL ALERT declared by ${summary.incident.declaredBy}! Evacuate immediately and tap here to check in.`;

      pushService.broadcastAlert({
        alertId,
        title: incidentTitle,
        body: incidentBody,
        tag: 'emergency-alert',
        requireInteraction: true,
        data: {
          incidentId: summary.incident.id,
          simulatedDrill: isDrill,
          url: './'
        }
      }).catch(err => console.error('[PushBroadcast] Error in /declare:', err));

      res.status(201).json(summary);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/incidents/trigger-alarm - IoT / Webhook integration for physical alarms
  router.post('/trigger-alarm', (req, res) => {
    try {
      const { source = 'Physical Fire Alarm Panel', zone = 'Zone 1 (All Floors)', secretKey } = req.body;

      // Optional secret key validation
      if (process.env.ALARM_WEBHOOK_KEY && secretKey !== process.env.ALARM_WEBHOOK_KEY) {
        return res.status(401).json({ error: 'Unauthorized webhook request' });
      }

      const summary = store.declareIncident({
        type: 'Fire Evacuation (Automated Sensor)',
        declaredBy: `Automated Alarm System (${source})`,
        notes: `Triggered automatically by building alarm sensor in: ${zone}`,
        simulatedDrill: false,
        escalationThresholdSeconds: 300
      });

      const alertId = buildAlertId('sensor');
      console.log(`[AlertDispatch] trigger-alarm ${alertId} incident=${summary.incident.id}`);
      io.emit('emergency_declared', { ...summary, alertId });

      // Web Push alert
      pushService.broadcastAlert({
        alertId,
        title: '🚨 FIRE ALARM SENSOR TRIPPED',
        body: `Building alarm sensor active in: ${zone}. Evacuate immediately and check in!`,
        tag: 'emergency-alert',
        requireInteraction: true,
        data: {
          incidentId: summary.incident.id,
          url: './'
        }
      }).catch(err => console.error('[PushBroadcast] Error in /trigger-alarm:', err));

      res.json({ message: 'Emergency session initiated by automated alarm', summary });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/incidents/all-clear - End incident & close muster session
  router.post('/all-clear', (req, res) => {
    try {
      const { closedBy, finalNotes } = req.body;
      const closedRecord = store.closeIncident({
        closedBy: closedBy || 'Chief Safety Warden',
        finalNotes: finalNotes || ''
      });

      const summary = store.getRosterSummary();
      const alertId = buildAlertId('all-clear');
      io.emit('all_clear_declared', { closedRecord, summary, alertId });

      // Web Push all clear
      pushService.broadcastAlert({
        alertId,
        title: '✅ ALL CLEAR DECLARED',
        body: `All Clear declared by ${closedBy || 'Chief Warden'}. You may safely return to your designated areas.`,
        tag: 'emergency-all-clear',
        requireInteraction: false,
        data: { url: './' }
      }).catch(err => console.error('[PushBroadcast] Error in /all-clear:', err));

      res.json({ message: 'Incident closed successfully', incident: closedRecord });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/incidents/siren - Remotely sound or silence sirens on all staff devices
  router.post('/siren', (req, res) => {
    try {
      const { playing } = req.body;
      const alertId = buildAlertId('siren');
      io.emit('siren_state_changed', { playing: !!playing, alertId });
      console.log(`[AlertDispatch] siren_state_changed ${alertId} playing=${!!playing}`);

      if (playing) {
        pushService.broadcastAlert({
          alertId,
          title: '🚨 EVACUATION SIREN SOUNDING',
          body: 'Safety Warden has sounded the evacuation alarm! Evacuate immediately!',
          tag: 'emergency-siren',
          requireInteraction: true,
          data: { url: './' }
        }).catch(err => console.error('[PushBroadcast] Error in /siren:', err));
      }

      res.json({ success: true, playing: !!playing });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/incidents/history - Historical incidents archive
  router.get('/history', (req, res) => {
    try {
      const history = store.getIncidentHistory();
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/incidents/muster-points - Get muster points list
  router.get('/muster-points', (req, res) => {
    try {
      const points = store.getMusterPoints();
      res.json(points);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/incidents/staff - Get staff directory
  router.get('/staff', (req, res) => {
    try {
      const staff = store.getStaff();
      res.json(staff);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
