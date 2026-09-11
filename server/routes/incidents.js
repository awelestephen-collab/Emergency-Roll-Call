import express from 'express';
import { store } from '../store.js';

export function createIncidentsRouter(io) {
  const router = express.Router();

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
      io.emit('emergency_declared', summary);

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

      io.emit('emergency_declared', summary);
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
      io.emit('all_clear_declared', { closedRecord, summary });

      res.json({ message: 'Incident closed successfully', incident: closedRecord });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/incidents/siren - Remotely sound or silence sirens on all staff devices
  router.post('/siren', (req, res) => {
    try {
      const { playing } = req.body;
      io.emit('siren_state_changed', { playing: !!playing });
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
