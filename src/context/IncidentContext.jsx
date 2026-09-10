import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { soundSynthesizer } from '../components/AudioAlarm';

const IncidentContext = createContext(null);

const STORAGE_KEY_USER = 'emergency_selected_staff_id';
const STORAGE_KEY_OFFLINE_QUEUE = 'emergency_offline_checkins';

export function IncidentProvider({ children }) {
  const [activeIncident, setActiveIncident] = useState(null);
  const [roster, setRoster] = useState([]);
  const [musterPoints, setMusterPoints] = useState([]);
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [stats, setStats] = useState({
    totalStaff: 0,
    accountedCount: 0,
    unaccountedCount: 0,
    accountabilityPercentage: 0,
    manualSightCount: 0,
    assistanceNeededCount: 0,
    musterPointBreakdown: {}
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [escalationStage, setEscalationStage] = useState('NORMAL'); // 'NORMAL', 'WARNING', 'CRITICAL'
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const socketRef = useRef(null);

  // Load saved user and offline queue from localStorage
  useEffect(() => {
    try {
      const savedQueue = localStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE);
      if (savedQueue) {
        setOfflineQueue(JSON.parse(savedQueue));
      }
    } catch (e) {
      console.error('Error loading offline queue:', e);
    }

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update summary helper
  const applySummary = useCallback((summary) => {
    if (!summary) return;
    setActiveIncident(summary.incident || null);
    setRoster(summary.roster || []);
    setStats({
      totalStaff: summary.totalStaff || 0,
      accountedCount: summary.accountedCount || 0,
      unaccountedCount: summary.unaccountedCount || 0,
      accountabilityPercentage: summary.accountabilityPercentage || 0,
      manualSightCount: summary.manualSightCount || 0,
      assistanceNeededCount: summary.assistanceNeededCount || 0,
      musterPointBreakdown: summary.musterPointBreakdown || {}
    });
  }, []);

  // Sync offline items with server
  const syncOfflineQueue = async () => {
    try {
      const queueRaw = localStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE);
      if (!queueRaw) return;
      const queue = JSON.parse(queueRaw);
      if (queue.length === 0) return;

      console.log(`[Offline Sync] Synchronizing ${queue.length} offline check-ins...`);
      const res = await fetch('/api/checkin/batch-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: queue })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.removeItem(STORAGE_KEY_OFFLINE_QUEUE);
        setOfflineQueue([]);
        if (data.summary) {
          applySummary(data.summary);
        }
        console.log('[Offline Sync] Batch sync completed successfully');
      }
    } catch (err) {
      console.warn('[Offline Sync] Failed to sync offline queue:', err);
    }
  };

  // Socket.io initialization
  useEffect(() => {
    const socket = io({
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('[Socket] Connected to server');
      syncOfflineQueue();
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      console.log('[Socket] Disconnected from server');
    });

    socket.on('initial_state', (summary) => {
      applySummary(summary);
    });

    socket.on('emergency_declared', (summary) => {
      applySummary(summary);
      soundSynthesizer.playWarningBeep();
    });

    socket.on('roster_updated', (summary) => {
      applySummary(summary);
    });

    socket.on('all_clear_declared', ({ closedRecord, summary }) => {
      applySummary(summary);
      soundSynthesizer.playSafeChime();
    });

    return () => {
      socket.disconnect();
    };
  }, [applySummary]);

  // Initial data fetch: active incident, muster points, staff directory
  useEffect(() => {
    async function loadData() {
      try {
        const [activeRes, pointsRes, staffRes] = await Promise.all([
          fetch('/api/incidents/active'),
          fetch('/api/incidents/muster-points'),
          fetch('/api/incidents/staff')
        ]);

        if (activeRes.ok) {
          const summary = await activeRes.json();
          applySummary(summary);
        }
        if (pointsRes.ok) {
          const points = await pointsRes.json();
          setMusterPoints(points);
        }
        if (staffRes.ok) {
          const staff = await staffRes.json();
          setStaffDirectory(staff);

          // Restore saved user identity
          const savedId = localStorage.getItem(STORAGE_KEY_USER);
          if (savedId) {
            const found = staff.find(s => s.id === savedId);
            if (found) setCurrentUser(found);
          }
        }
      } catch (e) {
        console.error('Error fetching initial data:', e);
      }
    }
    loadData();
  }, [applySummary]);

  // Escalation countdown and elapsed timer
  useEffect(() => {
    if (!activeIncident || activeIncident.status !== 'ACTIVE') {
      setElapsedSeconds(0);
      setEscalationStage('NORMAL');
      return;
    }

    const interval = setInterval(() => {
      const declaredTime = new Date(activeIncident.declaredAt).getTime();
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - declaredTime) / 1000));
      setElapsedSeconds(elapsed);

      // Thresholds:
      // 0-180s (3 min): NORMAL
      // 180-300s (3-5 min): WARNING
      // 300s+ (5+ min): CRITICAL ESCALATION
      const escalationSec = activeIncident.escalationThresholdSeconds || 300;
      if (elapsed >= escalationSec) {
        setEscalationStage('CRITICAL');
      } else if (elapsed >= 180) {
        setEscalationStage('WARNING');
      } else {
        setEscalationStage('NORMAL');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeIncident]);

  // Handle current user selection
  const selectCurrentUser = (staffMember) => {
    setCurrentUser(staffMember);
    if (staffMember) {
      localStorage.setItem(STORAGE_KEY_USER, staffMember.id);
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  };

  // Toggle siren sound
  const toggleSiren = () => {
    if (isSirenPlaying) {
      soundSynthesizer.stopSiren();
      setIsSirenPlaying(false);
    } else {
      soundSynthesizer.startSiren();
      setIsSirenPlaying(true);
    }
  };

  // Toggle mute all audio
  const toggleMute = () => {
    const muted = soundSynthesizer.toggleMute();
    setIsAudioMuted(muted);
    if (muted) setIsSirenPlaying(false);
  };

  // Self check-in action
  const submitSelfCheckIn = async ({ staffId, musterPointId, status = 'SAFE', notes = '' }) => {
    const id = staffId || (currentUser ? currentUser.id : null);
    if (!id) throw new Error('Please select your name from the staff directory.');

    // Attempt to acquire geolocation
    let gps = null;
    try {
      if ('geolocation' in navigator) {
        gps = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 3500, maximumAge: 10000 }
          );
        });
      }
    } catch (e) {
      gps = null;
    }

    const payload = {
      staffId: id,
      musterPointId,
      status,
      checkInMethod: 'SELF_APP',
      gps,
      notes,
      timestamp: new Date().toISOString()
    };

    if (!isOnline) {
      // Queue offline
      const updatedQueue = [...offlineQueue, payload];
      setOfflineQueue(updatedQueue);
      localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(updatedQueue));

      // Optimistically update local roster
      setRoster(prev => prev.map(s => s.id === id ? {
        ...s,
        status,
        checkIn: {
          ...payload,
          staffName: s.name,
          musterPointName: musterPoints.find(m => m.id === musterPointId)?.name || 'Muster Point',
          gpsStatus: gps ? 'GPS Captured (Offline)' : 'UNVERIFIED'
        }
      } : s));

      soundSynthesizer.playSafeChime();
      return { success: true, offline: true };
    }

    // Submit online
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit check-in');
    }

    const data = await res.json();
    soundSynthesizer.playSafeChime();
    return data;
  };

  // Warden manual override action
  const submitWardenOverride = async ({ staffId, musterPointId, status, verifiedBy, notes }) => {
    const res = await fetch('/api/checkin/warden-override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId, musterPointId, status, verifiedBy, notes })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to override status');
    }

    soundSynthesizer.playSafeChime();
    return await res.json();
  };

  // Declare emergency action
  const declareEmergency = async ({ type, declaredBy, notes, simulatedDrill, escalationThresholdSeconds }) => {
    const res = await fetch('/api/incidents/declare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, declaredBy, notes, simulatedDrill, escalationThresholdSeconds })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to declare emergency');
    }

    const data = await res.json();
    applySummary(data);
    soundSynthesizer.playWarningBeep();
    return data;
  };

  // Issue all-clear action
  const issueAllClear = async ({ closedBy, finalNotes }) => {
    const res = await fetch('/api/incidents/all-clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closedBy, finalNotes })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to issue all-clear');
    }

    const data = await res.json();
    soundSynthesizer.stopSiren();
    setIsSirenPlaying(false);
    soundSynthesizer.playSafeChime();
    return data;
  };

  return (
    <IncidentContext.Provider
      value={{
        activeIncident,
        roster,
        musterPoints,
        staffDirectory,
        stats,
        currentUser,
        selectCurrentUser,
        isOnline,
        offlineQueue,
        socketConnected,
        elapsedSeconds,
        escalationStage,
        isSirenPlaying,
        isAudioMuted,
        toggleSiren,
        toggleMute,
        submitSelfCheckIn,
        submitWardenOverride,
        declareEmergency,
        issueAllClear,
        syncOfflineQueue
      }}
    >
      {children}
    </IncidentContext.Provider>
  );
}

export function useIncident() {
  const context = useContext(IncidentContext);
  if (!context) {
    throw new Error('useIncident must be used within an IncidentProvider');
  }
  return context;
}
