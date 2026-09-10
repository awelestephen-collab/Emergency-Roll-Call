import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const STAFF_FILE = path.join(DATA_DIR, 'defaultStaff.json');
const MUSTER_FILE = path.join(DATA_DIR, 'defaultMusterPoints.json');
const HISTORY_FILE = path.join(DATA_DIR, 'incidentHistory.json');
const ACTIVE_FILE = path.join(DATA_DIR, 'activeIncident.json');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load seed data
let staffList = [];
let musterPoints = [];
let incidentHistory = [];
let activeIncident = null;

try {
  if (fs.existsSync(STAFF_FILE)) {
    staffList = JSON.parse(fs.readFileSync(STAFF_FILE, 'utf-8'));
  }
} catch (e) {
  console.error('Error reading staff file:', e);
}

try {
  if (fs.existsSync(MUSTER_FILE)) {
    musterPoints = JSON.parse(fs.readFileSync(MUSTER_FILE, 'utf-8'));
  }
} catch (e) {
  console.error('Error reading muster points file:', e);
}

try {
  if (fs.existsSync(HISTORY_FILE)) {
    incidentHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } else {
    // Seed one completed historical drill for reference
    incidentHistory = [
      {
        id: "INC-2026-0814-DRILL",
        type: "Scheduled Fire Evacuation Drill",
        declaredAt: "2026-08-14T10:00:00.000Z",
        allClearAt: "2026-08-14T10:07:35.000Z",
        durationSeconds: 455,
        declaredBy: "Sarah Jenkins (Chief Safety Warden)",
        status: "CLOSED",
        totalStaff: 12,
        accountedCount: 12,
        unaccountedCount: 0,
        manualSightCount: 2,
        assistanceNeededCount: 0,
        notes: "Quarterly Q3 Fire Drill. Total clear time: 7m 35s. Good compliance at Muster Point A.",
        musterPointBreakdown: {
          "MUSTER-A": 7,
          "MUSTER-B": 3,
          "MUSTER-C": 2
        }
      }
    ];
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(incidentHistory, null, 2));
  }
} catch (e) {
  console.error('Error reading history file:', e);
}

try {
  if (fs.existsSync(ACTIVE_FILE)) {
    activeIncident = JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf-8'));
  }
} catch (e) {
  console.error('Error reading active incident file:', e);
}

function persistActiveIncident() {
  try {
    if (activeIncident) {
      fs.writeFileSync(ACTIVE_FILE, JSON.stringify(activeIncident, null, 2));
    } else if (fs.existsSync(ACTIVE_FILE)) {
      fs.unlinkSync(ACTIVE_FILE);
    }
  } catch (e) {
    console.error('Error persisting active incident:', e);
  }
}

function persistHistory() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(incidentHistory, null, 2));
  } catch (e) {
    console.error('Error persisting incident history:', e);
  }
}

export const store = {
  getStaff() {
    return staffList;
  },

  getMusterPoints() {
    return musterPoints;
  },

  getActiveIncident() {
    return activeIncident;
  },

  getIncidentHistory() {
    return incidentHistory;
  },

  declareIncident({ type = 'Fire Evacuation', declaredBy = 'Incident Commander', notes = '', simulatedDrill = false, escalationThresholdSeconds = 300 }) {
    const now = new Date().toISOString();
    const incidentId = `INC-${Date.now().toString().slice(-6)}`;
    
    activeIncident = {
      id: incidentId,
      type,
      declaredBy,
      declaredAt: now,
      status: 'ACTIVE',
      notes,
      isDrill: simulatedDrill,
      escalationThresholdSeconds, // default 300s = 5 min
      checkIns: {}, // keyed by staffId
      timeline: [
        {
          timestamp: now,
          action: 'EMERGENCY_DECLARED',
          description: `Emergency declared: ${type} by ${declaredBy}. Full building evacuation ordered.`
        }
      ]
    };

    persistActiveIncident();
    return this.getRosterSummary();
  },

  recordCheckIn({ staffId, musterPointId = 'MUSTER-A', status = 'SAFE', checkInMethod = 'SELF_APP', gps = null, notes = '', verifiedBy = null }) {
    if (!activeIncident || activeIncident.status !== 'ACTIVE') {
      throw new Error('No active emergency evacuation incident is currently in progress.');
    }

    const staffMember = staffList.find(s => s.id === staffId);
    if (!staffMember) {
      throw new Error(`Staff member ID "${staffId}" not found in directory.`);
    }

    const musterPoint = musterPoints.find(m => m.id === musterPointId) || musterPoints[0];
    const now = new Date().toISOString();

    // Check GPS proximity if coordinates provided
    let gpsStatus = 'UNVERIFIED';
    let distanceMeters = null;
    if (gps && gps.latitude && gps.longitude && musterPoint) {
      distanceMeters = calculateHaversineDistance(
        gps.latitude,
        gps.longitude,
        musterPoint.latitude,
        musterPoint.longitude
      );
      gpsStatus = distanceMeters <= (musterPoint.radiusMeters || 100) ? 'VERIFIED_ON_SITE' : 'REMOTE_OR_OFF_TARGET';
    }

    const checkInRecord = {
      staffId,
      staffName: staffMember.name,
      department: staffMember.department,
      role: staffMember.role,
      officeLocation: staffMember.officeLocation,
      phone: staffMember.phone,
      musterPointId: musterPoint.id,
      musterPointName: musterPoint.name,
      status, // 'SAFE', 'NEEDS_ASSISTANCE', 'MANUAL_SIGHT_CONFIRMED', 'MISSING_FLAGGED'
      checkInMethod, // 'SELF_APP', 'WARDEN_SIGHT', 'WARDEN_MANUAL', 'OFFLINE_SYNC'
      gpsStatus,
      distanceMeters: distanceMeters !== null ? Math.round(distanceMeters) : null,
      timestamp: now,
      verifiedBy: verifiedBy || (checkInMethod === 'SELF_APP' ? staffMember.name : 'Emergency Warden'),
      notes
    };

    activeIncident.checkIns[staffId] = checkInRecord;

    // Append to timeline
    activeIncident.timeline.push({
      timestamp: now,
      action: status === 'NEEDS_ASSISTANCE' ? 'ASSISTANCE_REQUESTED' : 'CHECK_IN',
      staffId,
      staffName: staffMember.name,
      description: `${staffMember.name} checked in as ${status} at ${musterPoint.name} (${checkInMethod})`
    });

    persistActiveIncident();
    return this.getRosterSummary();
  },

  bulkCheckIn(records) {
    if (!activeIncident || activeIncident.status !== 'ACTIVE') {
      throw new Error('No active emergency evacuation incident is currently in progress.');
    }

    records.forEach(rec => {
      try {
        this.recordCheckIn(rec);
      } catch (e) {
        console.error('Bulk checkin error for record:', rec, e.message);
      }
    });

    return this.getRosterSummary();
  },

  closeIncident({ closedBy = 'Chief Safety Warden', finalNotes = '' }) {
    if (!activeIncident) {
      throw new Error('No active incident to close.');
    }

    const now = new Date().toISOString();
    const durationSeconds = Math.max(1, Math.round((new Date(now).getTime() - new Date(activeIncident.declaredAt).getTime()) / 1000));
    const summary = this.getRosterSummary();

    const closedRecord = {
      id: activeIncident.id,
      type: activeIncident.type,
      declaredAt: activeIncident.declaredAt,
      allClearAt: now,
      durationSeconds,
      declaredBy: activeIncident.declaredBy,
      closedBy,
      isDrill: activeIncident.isDrill,
      status: 'CLOSED',
      totalStaff: summary.totalStaff,
      accountedCount: summary.accountedCount,
      unaccountedCount: summary.unaccountedCount,
      manualSightCount: summary.manualSightCount,
      assistanceNeededCount: summary.assistanceNeededCount,
      notes: finalNotes || activeIncident.notes || 'All-clear given. Building cleared and checked.',
      musterPointBreakdown: summary.musterPointBreakdown,
      checkIns: activeIncident.checkIns,
      timeline: [
        ...activeIncident.timeline,
        {
          timestamp: now,
          action: 'ALL_CLEAR_ISSUED',
          description: `All clear issued by ${closedBy}. Evacuation session closed.`
        }
      ]
    };

    incidentHistory.unshift(closedRecord);
    persistHistory();

    activeIncident = null;
    persistActiveIncident();

    return closedRecord;
  },

  getRosterSummary() {
    if (!activeIncident) {
      return {
        active: false,
        incident: null,
        totalStaff: staffList.length,
        accountedCount: 0,
        unaccountedCount: staffList.length,
        manualSightCount: 0,
        assistanceNeededCount: 0,
        roster: staffList.map(s => ({
          ...s,
          status: 'UNACCOUNTED',
          checkIn: null
        }))
      };
    }

    const checkIns = activeIncident.checkIns || {};
    let accountedCount = 0;
    let manualSightCount = 0;
    let assistanceNeededCount = 0;
    const musterPointBreakdown = {};

    musterPoints.forEach(m => {
      musterPointBreakdown[m.id] = 0;
    });

    const roster = staffList.map(staff => {
      const checkIn = checkIns[staff.id];
      let status = 'UNACCOUNTED';

      if (checkIn) {
        status = checkIn.status;
        if (status === 'SAFE' || status === 'MANUAL_SIGHT_CONFIRMED') {
          accountedCount++;
          if (status === 'MANUAL_SIGHT_CONFIRMED') manualSightCount++;
          if (checkIn.musterPointId && musterPointBreakdown[checkIn.musterPointId] !== undefined) {
            musterPointBreakdown[checkIn.musterPointId]++;
          }
        } else if (status === 'NEEDS_ASSISTANCE') {
          assistanceNeededCount++;
          accountedCount++;
        }
      }

      return {
        ...staff,
        status, // 'UNACCOUNTED' (Red), 'SAFE' (Green), 'MANUAL_SIGHT_CONFIRMED' (Yellow/Blue), 'NEEDS_ASSISTANCE' (Orange/Pulse)
        checkIn: checkIn || null
      };
    });

    const unaccountedCount = staffList.length - accountedCount;
    const accountabilityPercentage = staffList.length > 0 ? Math.round((accountedCount / staffList.length) * 100) : 100;

    return {
      active: true,
      incident: activeIncident,
      totalStaff: staffList.length,
      accountedCount,
      unaccountedCount,
      accountabilityPercentage,
      manualSightCount,
      assistanceNeededCount,
      musterPointBreakdown,
      roster
    };
  }
};

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}
