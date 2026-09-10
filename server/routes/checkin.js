import express from 'express';
import { store } from '../store.js';

export function createCheckInRouter(io) {
  const router = express.Router();

  // POST /api/checkin - Staff one-tap self check-in
  router.post('/', (req, res) => {
    try {
      const { staffId, musterPointId, status, checkInMethod, gps, notes } = req.body;

      if (!staffId) {
        return res.status(400).json({ error: 'staffId is required for check-in' });
      }

      const summary = store.recordCheckIn({
        staffId,
        musterPointId: musterPointId || 'MUSTER-A',
        status: status || 'SAFE',
        checkInMethod: checkInMethod || 'SELF_APP',
        gps: gps || null,
        notes: notes || ''
      });

      // Broadcast roster update in real time
      io.emit('roster_updated', summary);

      const staff = summary.roster.find(s => s.id === staffId);
      res.status(200).json({
        success: true,
        message: 'Check-in recorded successfully',
        staffRecord: staff
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/checkin/warden-override - Warden manual sight confirmation or missing flagging
  router.post('/warden-override', (req, res) => {
    try {
      const { staffId, musterPointId, status, verifiedBy, notes } = req.body;

      if (!staffId) {
        return res.status(400).json({ error: 'staffId is required' });
      }

      const summary = store.recordCheckIn({
        staffId,
        musterPointId: musterPointId || 'MUSTER-A',
        status: status || 'MANUAL_SIGHT_CONFIRMED',
        checkInMethod: 'WARDEN_SIGHT',
        verifiedBy: verifiedBy || 'Safety Warden (Sight Check)',
        notes: notes || 'Visually confirmed at muster point by warden'
      });

      io.emit('roster_updated', summary);

      const staff = summary.roster.find(s => s.id === staffId);
      res.json({
        success: true,
        message: 'Status updated by warden',
        staffRecord: staff
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/checkin/batch-sync - Sync offline queue when connection restored
  router.post('/batch-sync', (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Array of items required for batch sync' });
      }

      const summary = store.bulkCheckIn(items);
      io.emit('roster_updated', summary);

      res.json({
        success: true,
        syncedCount: items.length,
        summary
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
