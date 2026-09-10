import React, { useState, useEffect } from 'react';
import { useIncident } from '../context/IncidentContext';
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  User,
  ShieldAlert,
  WifiOff,
  Clock,
  Send,
  HelpCircle,
  PhoneCall,
  Search,
  Flame,
  UserPlus
} from 'lucide-react';
import { StaffManagerModal } from '../components/StaffManagerModal';

export function StaffCheckInView() {
  const {
    activeIncident,
    musterPoints,
    staffDirectory,
    currentUser,
    selectCurrentUser,
    isOnline,
    offlineQueue,
    submitSelfCheckIn,
    declareEmergency,
    roster
  } = useIncident();

  const [selectedMusterId, setSelectedMusterId] = useState(musterPoints[0]?.id || 'MUSTER-A');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [helpNotes, setHelpNotes] = useState('');
  const [showHelpInput, setShowHelpInput] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // Sync selected muster point when musterPoints list arrives
  useEffect(() => {
    if (musterPoints.length > 0 && !selectedMusterId) {
      setSelectedMusterId(musterPoints[0].id);
    }
  }, [musterPoints, selectedMusterId]);

  // Find check-in status of current selected user if any
  const currentCheckIn = currentUser
    ? roster.find(r => r.id === currentUser.id)?.checkIn
    : null;

  const isCheckedIn = !!currentCheckIn;

  // Filtered staff list for instant selection
  const filteredStaff = staffDirectory.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.officeLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCheckIn = async (status = 'SAFE') => {
    if (!currentUser) {
      setFeedback({ type: 'error', text: 'Please tap and select your name from the staff directory list below first.' });
      return;
    }

    // Check if an emergency or drill is active
    if (!activeIncident) {
      if (currentUser.isWarden) {
        await declareEmergency({
          type: 'Practice Evacuation Drill',
          declaredBy: `${currentUser.name} (Safety Warden)`,
          simulatedDrill: true
        });
      } else {
        setFeedback({
          type: 'warning',
          text: 'Normal Standby: No evacuation incident or practice drill is currently active. Only designated Safety Wardens can start a drill.'
        });
        return;
      }
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await submitSelfCheckIn({
        staffId: currentUser.id,
        musterPointId: selectedMusterId || musterPoints[0]?.id || 'MUSTER-A',
        status,
        notes: status === 'NEEDS_ASSISTANCE' ? helpNotes : ''
      });

      if (res.offline) {
        setFeedback({
          type: 'warning',
          text: 'Offline mode: Check-in saved locally! Will automatically synchronize to safety wardens once cell signal returns.'
        });
      } else {
        setFeedback({
          type: 'success',
          text: status === 'SAFE' ? 'Checked in safe! Warden notified.' : 'Assistance alert transmitted to Emergency Response Team.'
        });
      }
      setShowHelpInput(false);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-5">
      {/* Offline Alert Bar */}
      {!isOnline && (
        <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-3 flex items-center gap-3 text-amber-200">
          <WifiOff className="w-5 h-5 flex-shrink-0 animate-pulse text-amber-400" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold">Offline Resilience Active:</span> No cellular or Wi-Fi signal. You can still tap to check in; records will auto-sync once connectivity returns. ({offlineQueue.length} queued)
          </div>
        </div>
      )}

      {/* EMERGENCY ACTIVE HERO BANNER */}
      {activeIncident ? (
        <div className="rounded-2xl p-5 border-2 border-red-600 bg-red-950/70 shadow-2xl relative overflow-hidden animate-pulse-fast">
          <div className="absolute top-0 right-0 left-0 h-2 emergency-stripes" />
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-600 rounded-xl text-white shadow-lg flex-shrink-0 animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-600/40 text-red-200 text-xs font-black tracking-wider uppercase">
                Active Evacuation In Progress
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeIncident.type}
              </h1>
              <p className="text-xs sm:text-sm text-red-200">
                Evacuate immediately via designated emergency exits. Proceed directly to your assigned muster point and check in below.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-red-800/60 flex flex-wrap items-center justify-between text-xs text-red-300 gap-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Declared: {new Date(activeIncident.declaredAt).toLocaleTimeString()}</span>
            </div>
            <div className="font-semibold">
              Commander: {activeIncident.declaredBy}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-4 border border-slate-800 bg-slate-900/60 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Normal Standby Status</h2>
              <p className="text-xs text-slate-400">
                {!currentUser
                  ? "System ready on standby. Select your name below to link this device."
                  : currentUser.isWarden
                  ? "System ready. As a designated Safety Warden, you can start an evacuation practice drill below."
                  : "System ready on standby. You will be alerted immediately when an evacuation or drill is declared."}
              </p>
            </div>
          </div>
          {currentUser?.isWarden && (
            <button
              type="button"
              onClick={() => declareEmergency({
                type: 'Practice Evacuation Drill',
                declaredBy: `${currentUser.name} (Safety Warden)`,
                simulatedDrill: true
              })}
              className="px-3.5 py-2 bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/50 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 shadow"
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span>Start Practice Drill</span>
            </button>
          )}
        </div>
      )}

      {/* IDENTIFICATION CARD (ZERO LOGIN REQUIRED) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <User className="w-4 h-4 text-red-500" />
            <span>Staff Member Identification</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsStaffModalOpen(true)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 shadow-sm"
              title="Add or import organization staff into the directory"
            >
              <UserPlus className="w-3.5 h-3.5 text-red-400" />
              <span>Add / Import Staff</span>
            </button>
            {currentUser && (
              <button
                type="button"
                onClick={() => selectCurrentUser(null)}
                className="text-xs text-slate-400 hover:text-red-400 underline transition-colors"
              >
                Change
              </button>
            )}
          </div>
        </div>

        {currentUser ? (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                {currentUser.name}
                {currentUser.isWarden && (
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                    Warden
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">
                {currentUser.department} • {currentUser.officeLocation}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                {currentUser.phone}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 inline-block">
                Linked on this device
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type your name or department..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/40">
              {filteredStaff.length === 0 ? (
                <div className="text-xs text-slate-400 p-4 text-center space-y-2 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                  <p>No staff found matching "{searchQuery}"</p>
                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white text-xs font-semibold rounded-lg border border-red-500/30 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Add to Staff Directory</span>
                  </button>
                </div>
              ) : (
                filteredStaff.map((staff) => (
                  <button
                    key={staff.id}
                    onClick={() => {
                      selectCurrentUser(staff);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-800/80 rounded-xl transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-200 group-hover:text-white">
                        {staff.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {staff.department} • {staff.officeLocation}
                      </div>
                    </div>
                    <span className="text-xs text-red-400 font-medium group-hover:underline">
                      Select
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* MUSTER POINT SELECTOR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <MapPin className="w-4 h-4 text-red-500" />
          <span>Current Muster Assembly Point</span>
        </div>

        <select
          value={selectedMusterId}
          onChange={(e) => setSelectedMusterId(e.target.value)}
          className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-red-500 transition-colors"
        >
          {musterPoints.map((mp) => (
            <option key={mp.id} value={mp.id}>
              {mp.name}
            </option>
          ))}
        </select>

        {/* Muster Point Notes */}
        {selectedMusterId && (
          <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="font-semibold text-slate-300">Assembly Info: </span>
            {musterPoints.find(m => m.id === selectedMusterId)?.description}
          </div>
        )}
      </div>

      {/* FEEDBACK MESSAGES */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-sm font-medium border flex items-center gap-2.5 ${
            feedback.type === 'error'
              ? 'bg-red-500/20 border-red-500/50 text-red-200'
              : feedback.type === 'warning'
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
              : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* LARGE ONE-TAP CHECK-IN BUTTON */}
      <div className="space-y-3 pt-2">
        {isCheckedIn ? (
          <div className="bg-emerald-950/50 border-2 border-emerald-500 rounded-2xl p-6 text-center space-y-3 shadow-xl">
            <div className="inline-flex p-3 bg-emerald-500 text-white rounded-full shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">
                {currentCheckIn.status === 'NEEDS_ASSISTANCE' ? 'ASSISTANCE ALERT ACTIVE' : 'YOU ARE CHECKED IN SAFE'}
              </h3>
              <p className="text-xs text-emerald-300">
                Verified at: {currentCheckIn.musterPointName} ({new Date(currentCheckIn.timestamp).toLocaleTimeString()})
              </p>
              {currentCheckIn.gpsStatus && (
                <div className="text-[11px] text-emerald-400/80 font-mono">
                  Location status: {currentCheckIn.gpsStatus} {currentCheckIn.distanceMeters !== null && `(${currentCheckIn.distanceMeters}m)`}
                </div>
              )}
            </div>

            <button
              onClick={() => handleCheckIn('SAFE')}
              disabled={submitting}
              className="mt-2 text-xs text-slate-300 hover:text-white bg-emerald-900/60 hover:bg-emerald-800/80 px-4 py-2 rounded-xl transition-colors"
            >
              Re-confirm Check-In
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleCheckIn('SAFE')}
            disabled={submitting}
            className={`w-full py-6 px-6 rounded-2xl text-xl sm:text-2xl font-black text-white shadow-2xl transition-all transform active:scale-95 flex flex-col items-center justify-center gap-1.5 ${
              activeIncident
                ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 glow-green'
                : currentUser?.isWarden
                ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 glow-green'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className={`w-8 h-8 ${activeIncident || currentUser?.isWarden ? 'text-white' : 'text-emerald-500'}`} />
              <span>I AM SAFE / PRESENT</span>
            </div>
            <span className="text-xs font-normal text-slate-300 opacity-90 tracking-normal">
              {activeIncident
                ? '1-Tap Instant Roll Call Confirmation'
                : currentUser?.isWarden
                ? 'Warden: Tap to start drill & confirm presence'
                : 'Standby Mode — active during evacuations & drills'}
            </span>
          </button>
        )}

        {/* SECONDARY EMERGENCY: "I NEED ASSISTANCE / INJURED / TRAPPED" */}
        {activeIncident && (
          <div className="pt-2">
            {!showHelpInput ? (
              <button
                onClick={() => setShowHelpInput(true)}
                className="w-full py-3.5 px-4 bg-red-950/60 hover:bg-red-900/80 border border-red-700/60 rounded-xl text-red-300 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                <span>I Need Assistance / Injured / Trapped Inside</span>
              </button>
            ) : (
              <div className="bg-red-950/80 border border-red-600 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Specify Your Urgent Status & Location</span>
                </div>
                <textarea
                  value={helpNotes}
                  onChange={(e) => setHelpNotes(e.target.value)}
                  placeholder="e.g. Trapped in stairwell B, 3rd floor, smoke dense, injured ankle..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-950 border border-red-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCheckIn('NEEDS_ASSISTANCE')}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-colors shadow-lg"
                  >
                    Send Urgent Distress Alert
                  </button>
                  <button
                    onClick={() => setShowHelpInput(false)}
                    className="px-3 py-2.5 bg-slate-800 text-slate-300 text-sm rounded-xl hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* EMERGENCY CONTACT CARDS */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-400">
        <div className="font-semibold text-slate-300 flex items-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5 text-red-400" />
          <span>Emergency First Responders & Hotlines:</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-slate-300">
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-500">Emergency Services</div>
            <div className="font-bold text-red-400">911 / 999 / 112</div>
          </div>
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-500">Internal Security Desk</div>
            <div className="font-bold text-slate-200">Ext. 5555 / Gate 1</div>
          </div>
        </div>
      </div>

      {/* Staff Manager Modal */}
      <StaffManagerModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
      />
    </div>
  );
}
