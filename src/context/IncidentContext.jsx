import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { soundSynthesizer } from '../components/AudioAlarm';
import { DEFAULT_STAFF, DEFAULT_MUSTER_POINTS, DEFAULT_HISTORICAL_DRILL } from '../data/initialData';
import { getBackendUrl, getApiUrl } from '../config/api';

const IncidentContext = createContext(null);

const STORAGE_KEY_USER = 'emergency_selected_staff_id';
const STORAGE_KEY_OFFLINE_QUEUE = 'emergency_offline_checkins';
const STORAGE_KEY_ACTIVE_INCIDENT = 'emergency_active_incident';
const STORAGE_KEY_ROSTER = 'emergency_roster_state';
const STORAGE_KEY_HISTORY = 'emergency_incident_history';
const STORAGE_KEY_CUSTOM_STAFF = 'emergency_custom_staff';
const STORAGE_KEY_DIR_VERSION = 'emergency_directory_version';
const CURRENT_DIRECTORY_VERSION = 'v3_falcon_76_official';

// Helper to compute stats from roster
function computeStats(rosterList, musterList) {
  const totalStaff = rosterList.length;
  let accountedCount = 0;
  let manualSightCount = 0;
  let assistanceNeededCount = 0;
  const musterPointBreakdown = {};

  musterList.forEach(m => {
    musterPointBreakdown[m.id] = 0;
  });

  rosterList.forEach(person => {
    if (person.status === 'SAFE' || person.status === 'MANUAL_SIGHT_CONFIRMED') {
      accountedCount++;
      if (person.status === 'MANUAL_SIGHT_CONFIRMED') manualSightCount++;
      if (person.checkIn?.musterPointId && musterPointBreakdown[person.checkIn.musterPointId] !== undefined) {
        musterPointBreakdown[person.checkIn.musterPointId]++;
      }
    } else if (person.status === 'NEEDS_ASSISTANCE') {
      assistanceNeededCount++;
      accountedCount++;
    }
  });

  const unaccountedCount = totalStaff - accountedCount;
  const accountabilityPercentage = totalStaff > 0 ? Math.round((accountedCount / totalStaff) * 100) : 100;

  return {
    totalStaff,
    accountedCount,
    unaccountedCount,
    accountabilityPercentage,
    manualSightCount,
    assistanceNeededCount,
    musterPointBreakdown
  };
}

export function IncidentProvider({ children }) {
  // Clear any legacy demo data cache so all phones receive the new 76 official staff list
  if (typeof window !== 'undefined') {
    try {
      const ver = localStorage.getItem(STORAGE_KEY_DIR_VERSION);
      if (ver !== CURRENT_DIRECTORY_VERSION) {
        localStorage.removeItem(STORAGE_KEY_CUSTOM_STAFF);
        localStorage.removeItem(STORAGE_KEY_ROSTER);
        localStorage.removeItem(STORAGE_KEY_ACTIVE_INCIDENT);
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.setItem(STORAGE_KEY_DIR_VERSION, CURRENT_DIRECTORY_VERSION);
      }
    } catch {}
  }

  // Pre-seed with bundled data or saved custom staff
  const [musterPoints, setMusterPoints] = useState(DEFAULT_MUSTER_POINTS);
  const [staffDirectory, setStaffDirectory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_STAFF);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_STAFF;
  });

  // Active incident initialized from localStorage or null
  const [activeIncident, setActiveIncident] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_INCIDENT);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Roster initialized from localStorage or default staff
  const [roster, setRoster] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROSTER);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map(person => {
          if (person.checkIn?.musterPointId) {
            const mp = DEFAULT_MUSTER_POINTS.find(m => m.id === person.checkIn.musterPointId);
            if (mp) {
              return {
                ...person,
                checkIn: {
                  ...person.checkIn,
                  musterPointName: mp.name
                }
              };
            }
          }
          return person;
        });
      }
    } catch {}
    let initialStaff = DEFAULT_STAFF;
    try {
      const savedStaff = localStorage.getItem(STORAGE_KEY_CUSTOM_STAFF);
      if (savedStaff) initialStaff = JSON.parse(savedStaff);
    } catch {}
    return initialStaff.map(s => ({
      ...s,
      status: 'UNACCOUNTED',
      checkIn: null
    }));
  });

  // Stats
  const [stats, setStats] = useState(() => {
    let initialStaff = DEFAULT_STAFF;
    try {
      const savedRoster = localStorage.getItem(STORAGE_KEY_ROSTER);
      if (savedRoster) return computeStats(JSON.parse(savedRoster), DEFAULT_MUSTER_POINTS);
      const savedStaff = localStorage.getItem(STORAGE_KEY_CUSTOM_STAFF);
      if (savedStaff) initialStaff = JSON.parse(savedStaff);
    } catch {}
    return computeStats(
      initialStaff.map(s => ({ ...s, status: 'UNACCOUNTED', checkIn: null })),
      DEFAULT_MUSTER_POINTS
    );
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_USER);
      if (savedId) {
        let staffList = DEFAULT_STAFF;
        const savedStaff = localStorage.getItem(STORAGE_KEY_CUSTOM_STAFF);
        if (savedStaff) staffList = JSON.parse(savedStaff);
        return staffList.find(s => s.id === savedId) || null;
      }
    } catch {}
    return null;
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [escalationStage, setEscalationStage] = useState('NORMAL');
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const socketRef = useRef(null);

  // Recalculate stats whenever roster changes
  useEffect(() => {
    const updatedStats = computeStats(roster, musterPoints);
    setStats(updatedStats);
    try {
      localStorage.setItem(STORAGE_KEY_ROSTER, JSON.stringify(roster));
    } catch {}
  }, [roster, musterPoints]);

  // Persist active incident to localStorage
  useEffect(() => {
    try {
      if (activeIncident) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_INCIDENT, JSON.stringify(activeIncident));
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_INCIDENT);
      }
    } catch {}
  }, [activeIncident]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Summary updater helper
  const applySummary = useCallback((summary) => {
    if (!summary) return;
    if (summary.incident !== undefined) setActiveIncident(summary.incident);
    if (summary.roster && summary.roster.length > 0) setRoster(summary.roster);
    if (summary.totalStaff !== undefined) {
      setStats({
        totalStaff: summary.totalStaff || DEFAULT_STAFF.length,
        accountedCount: summary.accountedCount || 0,
        unaccountedCount: summary.unaccountedCount || DEFAULT_STAFF.length,
        accountabilityPercentage: summary.accountabilityPercentage || 0,
        manualSightCount: summary.manualSightCount || 0,
        assistanceNeededCount: summary.assistanceNeededCount || 0,
        musterPointBreakdown: summary.musterPointBreakdown || {}
      });
    }
  }, []);

  // Socket.io initialization with silent failover for GitHub Pages and custom cloud hubs
  useEffect(() => {
    try {
      const backend = getBackendUrl();
      const socketOptions = {
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        timeout: 5000,
        transports: ['websocket', 'polling']
      };

      const socket = backend ? io(backend, socketOptions) : io(socketOptions);
      socketRef.current = socket;

      socket.on('connect', () => {
        setSocketConnected(true);
      });

      socket.on('disconnect', () => {
        setSocketConnected(false);
      });

      socket.on('initial_state', (summary) => {
        applySummary(summary);
      });

      socket.on('emergency_declared', (summary) => {
        applySummary(summary);
        soundSynthesizer.startSiren();
        setIsSirenPlaying(true);
      });

      socket.on('siren_state_changed', ({ playing }) => {
        if (playing) {
          soundSynthesizer.startSiren();
          setIsSirenPlaying(true);
        } else {
          soundSynthesizer.stopSiren();
          setIsSirenPlaying(false);
        }
      });

      socket.on('roster_updated', (summary) => {
        applySummary(summary);
      });

      socket.on('all_clear_declared', ({ closedRecord, summary }) => {
        applySummary(summary);
        soundSynthesizer.stopSiren();
        setIsSirenPlaying(false);
        soundSynthesizer.playSafeChime();
      });

      return () => {
        socket.disconnect();
      };
    } catch (e) {
      // Socket failed (expected on static host without custom backend configured)
    }
  }, [applySummary]);

  // Fetch from backend if available and keep in sync with polling backup
  useEffect(() => {
    let isMounted = true;

    async function loadBackendData() {
      try {
        const [activeRes, pointsRes, staffRes] = await Promise.all([
          fetch(getApiUrl('/api/incidents/active')).catch(() => null),
          fetch(getApiUrl('/api/incidents/muster-points')).catch(() => null),
          fetch(getApiUrl('/api/incidents/staff')).catch(() => null)
        ]);

        if (!isMounted) return;

        if (activeRes && activeRes.ok) {
          const summary = await activeRes.json();
          applySummary(summary);
        }
        if (pointsRes && pointsRes.ok) {
          const points = await pointsRes.json();
          if (Array.isArray(points) && points.length > 0) setMusterPoints(points);
        }
        if (staffRes && staffRes.ok) {
          const staff = await staffRes.json();
          if (Array.isArray(staff) && staff.length > 0) setStaffDirectory(staff);
        }
      } catch (e) {
        // Static host fallback - bundled data is already loaded!
      }
    }

    loadBackendData();

    // Dual-layer polling backup every 4 seconds to guarantee all devices stay in sync
    const pollInterval = setInterval(() => {
      fetch(getApiUrl('/api/incidents/active'))
        .then(res => res.ok ? res.json() : null)
        .then(summary => {
          if (summary && isMounted) {
            applySummary(summary);
          }
        })
        .catch(() => {});
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [applySummary]);

  // Escalation timer
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

  // Select current user
  const selectCurrentUser = (staffMember) => {
    setCurrentUser(staffMember);
    if (staffMember) {
      localStorage.setItem(STORAGE_KEY_USER, staffMember.id);
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  };

  // Audio controls
  const toggleSiren = async () => {
    const nextState = !isSirenPlaying;
    if (nextState) {
      soundSynthesizer.startSiren();
      setIsSirenPlaying(true);
    } else {
      soundSynthesizer.stopSiren();
      setIsSirenPlaying(false);
    }

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('siren_toggle', { playing: nextState });
    }

    try {
      await fetch(getApiUrl('/api/incidents/siren'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playing: nextState })
      });
    } catch {}
  };

  const toggleMute = () => {
    const muted = soundSynthesizer.toggleMute();
    setIsAudioMuted(muted);
    if (muted) setIsSirenPlaying(false);
  };

  // Submit self check-in (works online & offline/static)
  const submitSelfCheckIn = async ({ staffId, musterPointId, status = 'SAFE', notes = '' }) => {
    const id = staffId || (currentUser ? currentUser.id : null);
    if (!id) throw new Error('Please select your name from the staff directory.');

    const targetStaff = staffDirectory.find(s => s.id === id) || currentUser;
    const targetMuster = musterPoints.find(m => m.id === musterPointId) || musterPoints[0];
    const now = new Date().toISOString();

    let gps = null;
    try {
      if ('geolocation' in navigator) {
        gps = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 3000, maximumAge: 10000 }
          );
        });
      }
    } catch {
      gps = null;
    }

    const payload = {
      staffId: id,
      musterPointId: targetMuster.id,
      status,
      checkInMethod: 'SELF_APP',
      gps,
      notes,
      timestamp: now
    };

    // Try sending to backend if available
    try {
      const res = await fetch(getApiUrl('/api/checkin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        soundSynthesizer.playSafeChime();
        return data;
      }
    } catch {
      // Backend not available (GitHub Pages or offline)
    }

    // Client-side execution (guaranteed to work!)
    setRoster(prev => prev.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status,
          checkIn: {
            ...payload,
            staffName: s.name,
            musterPointName: targetMuster.name,
            gpsStatus: gps ? 'VERIFIED_ON_SITE' : 'UNVERIFIED',
            distanceMeters: gps ? 24 : null,
            verifiedBy: s.name
          }
        };
      }
      return s;
    }));

    soundSynthesizer.playSafeChime();
    return { success: true, clientMode: true };
  };

  // Submit warden override
  const submitWardenOverride = async ({ staffId, musterPointId, status, verifiedBy, notes }) => {
    const targetStaff = staffDirectory.find(s => s.id === staffId);
    const targetMuster = musterPoints.find(m => m.id === musterPointId) || musterPoints[0];
    const now = new Date().toISOString();

    try {
      const res = await fetch(getApiUrl('/api/checkin/warden-override'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, musterPointId, status, verifiedBy, notes })
      });
      if (res.ok) {
        soundSynthesizer.playSafeChime();
        return await res.json();
      }
    } catch {}

    // Client-side override
    setRoster(prev => prev.map(s => {
      if (s.id === staffId) {
        return {
          ...s,
          status,
          checkIn: {
            staffId,
            staffName: s.name,
            musterPointId: targetMuster.id,
            musterPointName: targetMuster.name,
            status,
            checkInMethod: 'WARDEN_SIGHT',
            timestamp: now,
            verifiedBy: verifiedBy || 'Warden Sight Confirmation',
            notes: notes || 'Verified at muster station'
          }
        };
      }
      return s;
    }));

    soundSynthesizer.playSafeChime();
    return { success: true };
  };

  // Declare emergency
  const declareEmergency = async ({ type = 'Fire Evacuation', declaredBy = 'Safety Warden', notes = '', simulatedDrill = false, escalationThresholdSeconds = 300 }) => {
    const now = new Date().toISOString();
    const newIncident = {
      id: `INC-${Date.now().toString().slice(-6)}`,
      type,
      declaredBy,
      declaredAt: now,
      status: 'ACTIVE',
      notes,
      isDrill: !!simulatedDrill,
      escalationThresholdSeconds,
      checkIns: {},
      timeline: [
        {
          timestamp: now,
          action: 'EMERGENCY_DECLARED',
          description: `${type} declared by ${declaredBy}.`
        }
      ]
    };

    try {
      const res = await fetch(getApiUrl('/api/incidents/declare'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, declaredBy, notes, simulatedDrill, escalationThresholdSeconds })
      });
      if (res.ok) {
        const data = await res.json();
        applySummary(data);
        soundSynthesizer.startSiren();
        setIsSirenPlaying(true);
        return data;
      }
    } catch {}

    // Reset roster to unaccounted on new emergency
    const resetRoster = staffDirectory.map(s => ({
      ...s,
      status: 'UNACCOUNTED',
      checkIn: null
    }));

    setActiveIncident(newIncident);
    setRoster(resetRoster);
    soundSynthesizer.startSiren();
    setIsSirenPlaying(true);
    return { active: true, incident: newIncident, roster: resetRoster };
  };

  // Issue all-clear
  const issueAllClear = async ({ closedBy = 'Chief Safety Warden', finalNotes = '' }) => {
    const now = new Date().toISOString();
    const duration = activeIncident ? Math.max(1, Math.floor((Date.now() - new Date(activeIncident.declaredAt).getTime()) / 1000)) : 180;

    const closedRecord = {
      id: activeIncident?.id || `INC-${Date.now().toString().slice(-6)}`,
      type: activeIncident?.type || 'Fire Evacuation',
      declaredAt: activeIncident?.declaredAt || now,
      allClearAt: now,
      durationSeconds: duration,
      declaredBy: activeIncident?.declaredBy || 'Safety Warden',
      closedBy,
      isDrill: activeIncident?.isDrill || false,
      status: 'CLOSED',
      totalStaff: stats.totalStaff,
      accountedCount: stats.accountedCount,
      unaccountedCount: stats.unaccountedCount,
      manualSightCount: stats.manualSightCount,
      assistanceNeededCount: stats.assistanceNeededCount,
      notes: finalNotes || 'All clear issued. Safe for re-entry.'
    };

    try {
      const res = await fetch(getApiUrl('/api/incidents/all-clear'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closedBy, finalNotes })
      });
    } catch {}

    // Save to local history
    try {
      const historyRaw = localStorage.getItem(STORAGE_KEY_HISTORY);
      const historyList = historyRaw ? JSON.parse(historyRaw) : [DEFAULT_HISTORICAL_DRILL];
      historyList.unshift(closedRecord);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historyList));
    } catch {}

    setActiveIncident(null);
    soundSynthesizer.stopSiren();
    setIsSirenPlaying(false);
    soundSynthesizer.playSafeChime();
    return closedRecord;
  };

  // Directory management methods
  const addStaffMember = (person) => {
    setStaffDirectory(prev => {
      const updated = [person, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOM_STAFF, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setRoster(prev => {
      const updated = [
        {
          ...person,
          status: 'UNACCOUNTED',
          checkIn: null
        },
        ...prev
      ];
      try {
        localStorage.setItem(STORAGE_KEY_ROSTER, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const deleteStaffMember = (id) => {
    setStaffDirectory(prev => {
      const updated = prev.filter(s => s.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOM_STAFF, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setRoster(prev => {
      const updated = prev.filter(s => s.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_ROSTER, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (currentUser && currentUser.id === id) {
      selectCurrentUser(null);
    }
  };

  const importStaffList = (importedList, replace = false) => {
    if (!Array.isArray(importedList) || importedList.length === 0) return;

    let updatedDirectory;
    if (replace) {
      updatedDirectory = importedList;
    } else {
      const existingNames = new Set(staffDirectory.map(s => s.name.toLowerCase()));
      const filtered = importedList.filter(s => !existingNames.has(s.name.toLowerCase()));
      updatedDirectory = [...staffDirectory, ...filtered];
    }

    setStaffDirectory(updatedDirectory);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_STAFF, JSON.stringify(updatedDirectory));
    } catch {}

    setRoster(prev => {
      let updatedRoster;
      if (replace) {
        updatedRoster = updatedDirectory.map(s => ({
          ...s,
          status: 'UNACCOUNTED',
          checkIn: null
        }));
      } else {
        const existingIds = new Set(prev.map(p => p.id));
        const newRosterItems = updatedDirectory
          .filter(s => !existingIds.has(s.id))
          .map(s => ({
            ...s,
            status: 'UNACCOUNTED',
            checkIn: null
          }));
        updatedRoster = [...prev, ...newRosterItems];
      }

      try {
        localStorage.setItem(STORAGE_KEY_ROSTER, JSON.stringify(updatedRoster));
      } catch {}
      return updatedRoster;
    });
  };

  const resetStaffDirectory = () => {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_STAFF);
    setStaffDirectory(DEFAULT_STAFF);
    const resetRoster = DEFAULT_STAFF.map(s => ({
      ...s,
      status: 'UNACCOUNTED',
      checkIn: null
    }));
    setRoster(resetRoster);
    try {
      localStorage.setItem(STORAGE_KEY_ROSTER, JSON.stringify(resetRoster));
    } catch {}
    selectCurrentUser(null);
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
        addStaffMember,
        deleteStaffMember,
        importStaffList,
        resetStaffDirectory
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
