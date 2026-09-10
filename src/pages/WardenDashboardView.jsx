import React, { useState, useMemo } from 'react';
import { useIncident } from '../context/IncidentContext';
import { downloadClientPdf, downloadClientExcel } from '../utils/clientReports';
import { StaffManagerModal } from '../components/StaffManagerModal';
import {
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Users,
  Search,
  Filter,
  Eye,
  Phone,
  FileDown,
  FileSpreadsheet,
  Volume2,
  VolumeX,
  PlusCircle,
  Flag,
  MapPin,
  Flame,
  AlertTriangle,
  Building,
  Check,
  X
} from 'lucide-react';

export function WardenDashboardView() {
  const {
    activeIncident,
    roster,
    musterPoints,
    stats,
    elapsedSeconds,
    escalationStage,
    isSirenPlaying,
    toggleSiren,
    submitWardenOverride,
    declareEmergency,
    issueAllClear,
    currentUser
  } = useIncident();

  const [activeMusterTab, setActiveMusterTab] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'UNACCOUNTED', 'SAFE', 'NEEDS_ASSISTANCE'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [showAllClearModal, setShowAllClearModal] = useState(false);
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);

  // Form states for declare
  const [declareType, setDeclareType] = useState('Fire Evacuation');
  const [declaredBy, setDeclaredBy] = useState(
    currentUser ? `${currentUser.name} (${currentUser.role || 'Safety Warden'})` : 'Sarah Jenkins (Chief Safety Warden)'
  );
  const [declareNotes, setDeclareNotes] = useState('');
  const [isDrill, setIsDrill] = useState(false);

  // Form state for all clear
  const [closedBy, setClosedBy] = useState(
    currentUser ? `${currentUser.name} (${currentUser.role || 'Safety Warden'})` : 'Sarah Jenkins (Chief Safety Warden)'
  );
  const [finalNotes, setFinalNotes] = useState('');

  // Format timer MM:SS
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter roster
  const filteredRoster = useMemo(() => {
    return roster.filter((person) => {
      // Muster point tab filter
      if (activeMusterTab !== 'ALL') {
        const pMuster = person.checkIn?.musterPointId;
        if (pMuster !== activeMusterTab) return false;
      }

      // Status filter
      if (statusFilter === 'UNACCOUNTED' && person.status !== 'UNACCOUNTED') return false;
      if (statusFilter === 'SAFE' && person.status !== 'SAFE' && person.status !== 'MANUAL_SIGHT_CONFIRMED') return false;
      if (statusFilter === 'NEEDS_ASSISTANCE' && person.status !== 'NEEDS_ASSISTANCE') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = person.name.toLowerCase().includes(query);
        const matchDept = person.department.toLowerCase().includes(query);
        const matchOffice = person.officeLocation.toLowerCase().includes(query);
        return matchName || matchDept || matchOffice;
      }

      return true;
    });
  }, [roster, activeMusterTab, statusFilter, searchQuery]);

  // Unaccounted list for first responders
  const unaccountedStaff = useMemo(() => {
    return roster.filter(p => p.status === 'UNACCOUNTED' || p.status === 'NEEDS_ASSISTANCE');
  }, [roster]);

  const handleWardenSightConfirm = async (staffId, personName) => {
    try {
      await submitWardenOverride({
        staffId,
        musterPointId: activeMusterTab === 'ALL' ? musterPoints[0]?.id : activeMusterTab,
        status: 'MANUAL_SIGHT_CONFIRMED',
        verifiedBy: 'Warden Sight Confirmation',
        notes: `Confirmed physically present at muster station by on-duty warden.`
      });
    } catch (err) {
      alert('Error confirming sight: ' + err.message);
    }
  };

  const handleFlagDistress = async (staffId) => {
    const notes = prompt('Enter notes/last seen location for emergency services:');
    if (notes === null) return;
    try {
      await submitWardenOverride({
        staffId,
        musterPointId: activeMusterTab === 'ALL' ? musterPoints[0]?.id : activeMusterTab,
        status: 'NEEDS_ASSISTANCE',
        verifiedBy: 'Warden Emergency Flag',
        notes: notes || 'Flagged by warden as potentially trapped or injured.'
      });
    } catch (err) {
      alert('Error flagging distress: ' + err.message);
    }
  };

  const handleDeclareSubmit = async (e) => {
    e.preventDefault();
    try {
      await declareEmergency({
        type: declareType,
        declaredBy,
        notes: declareNotes,
        simulatedDrill: isDrill,
        escalationThresholdSeconds: 300
      });
      setShowDeclareModal(false);
    } catch (err) {
      alert('Error declaring emergency: ' + err.message);
    }
  };

  const handleAllClearSubmit = async (e) => {
    e.preventDefault();
    try {
      await issueAllClear({
        closedBy,
        finalNotes
      });
      setShowAllClearModal(false);
    } catch (err) {
      alert('Error ending emergency: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
      {/* TOP COMMAND HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-red-600 rounded-xl text-white shadow">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                Incident Command Center
                {activeIncident && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-black uppercase tracking-wider animate-pulse">
                    Live Incident
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Real-time organizational muster management, rapid roll-call triage, and first responder escalation.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowStaffModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors shadow"
            title="Add, import, or manage organization staff members"
          >
            <Users className="w-4 h-4 text-red-400" />
            <span>Manage Staff</span>
          </button>

          {activeIncident ? (
            <>
              <button
                onClick={toggleSiren}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow ${
                  isSirenPlaying
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 animate-bounce'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {isSirenPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{isSirenPlaying ? 'Silence Siren' : 'Trigger Alarm Siren'}</span>
              </button>

              <button
                onClick={() => setShowManifestModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 flex items-center gap-1.5 transition-colors shadow"
              >
                <AlertOctagon className="w-4 h-4 text-red-400" />
                <span>First Responders Handover ({unaccountedStaff.length})</span>
              </button>

              <button
                onClick={() => setShowAllClearModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-lg"
              >
                <Check className="w-4 h-4" />
                <span>All-Clear / End Evacuation</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowDeclareModal(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-black bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 transition-colors shadow-xl glow-red"
            >
              <Flame className="w-5 h-5" />
              <span>Declare Emergency Evacuation</span>
            </button>
          )}

          {/* Quick PDF / Excel Downloads */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-700">
            <button
              onClick={() => {
                const targetIncident = activeIncident || {
                  id: 'INC-2026-0814-DRILL',
                  type: 'Evacuation Roll Call',
                  declaredAt: new Date().toISOString(),
                  allClearAt: new Date().toISOString(),
                  durationSeconds: elapsedSeconds || 320,
                  declaredBy: 'Safety Warden',
                  status: activeIncident ? 'ACTIVE' : 'CLOSED',
                  isDrill: false
                };
                downloadClientPdf(targetIncident, roster);
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium flex items-center gap-1 transition-colors"
              title="Download Compliance PDF Report"
            >
              <FileDown className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={() => {
                const targetIncident = activeIncident || {
                  id: 'INC-2026-0814-DRILL',
                  type: 'Evacuation Roll Call',
                  declaredAt: new Date().toISOString(),
                  allClearAt: new Date().toISOString(),
                  durationSeconds: elapsedSeconds || 320,
                  declaredBy: 'Safety Warden',
                  status: activeIncident ? 'ACTIVE' : 'CLOSED'
                };
                downloadClientExcel(targetIncident, roster);
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium flex items-center gap-1 transition-colors"
              title="Download Excel Log"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS & ESCALATION TIMER */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Evacuation Timer */}
        <div className={`p-4 rounded-2xl border transition-all ${
          escalationStage === 'CRITICAL'
            ? 'bg-red-950/80 border-red-500 animate-pulse-fast text-red-200'
            : escalationStage === 'WARNING'
            ? 'bg-amber-950/70 border-amber-500 text-amber-200'
            : 'bg-slate-900/80 border-slate-800 text-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider opacity-80">
            <span>Evacuation Clock</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black font-mono">
            {formatTimer(elapsedSeconds)}
          </div>
          <div className="text-[11px] mt-1 font-medium">
            {escalationStage === 'CRITICAL'
              ? '🚨 >5m: Escalated to Police/Fire'
              : escalationStage === 'WARNING'
              ? '⚠️ >3m: Initiate Sight Sweeps'
              : 'Target: < 3m Complete'}
          </div>
        </div>

        {/* Card 2: Accountability Rate */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Accountability Rate</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white">
            {stats.accountabilityPercentage}%
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">
            {stats.accountedCount} of {stats.totalStaff} staff accounted
          </div>
        </div>

        {/* Card 3: Safe / Present */}
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <span>Accounted Safe</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white">
            {stats.accountedCount}
          </div>
          <div className="text-[11px] text-emerald-300 mt-1">
            {stats.manualSightCount} confirmed by sight
          </div>
        </div>

        {/* Card 4: Unaccounted (Red) */}
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-red-400">
            <span>Unaccounted For</span>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white">
            {stats.unaccountedCount}
          </div>
          <div className="text-[11px] text-red-300 mt-1">
            Immediate search target
          </div>
        </div>

        {/* Card 5: Needs Assistance */}
        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-amber-400">
            <span>Distress / Injured</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white">
            {stats.assistanceNeededCount}
          </div>
          <div className="text-[11px] text-amber-300 mt-1">
            Requires immediate rescue
          </div>
        </div>
      </div>

      {/* CRITICAL ESCALATION BANNER */}
      {escalationStage === 'CRITICAL' && activeIncident && (
        <div className="bg-red-600 text-white rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-flash-red">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-8 h-8 flex-shrink-0 animate-bounce" />
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-red-100">
                CRITICAL SAFETY ESCALATION TRIGGERED (5+ MINUTES ELAPSED)
              </div>
              <div className="text-base sm:text-lg font-black">
                {stats.unaccountedCount} Person(s) Still Unaccounted For — Dispatch Handover to First Responders
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowManifestModal(true)}
            className="px-4 py-2 bg-white text-red-700 hover:bg-red-50 text-xs font-black rounded-xl shadow-lg uppercase tracking-wider transition-colors whitespace-nowrap"
          >
            Open Dispatch Handover List
          </button>
        </div>
      )}

      {/* MUSTER POINTS TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveMusterTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeMusterTab === 'ALL'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          All Muster Points ({roster.length})
        </button>

        {musterPoints.map((mp) => {
          const count = stats.musterPointBreakdown[mp.id] || 0;
          return (
            <button
              key={mp.id}
              onClick={() => setActiveMusterTab(mp.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeMusterTab === mp.id
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{mp.name}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-200">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              statusFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Status ({roster.length})
          </button>
          <button
            onClick={() => setStatusFilter('UNACCOUNTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
              statusFilter === 'UNACCOUNTED' ? 'bg-red-600 text-white' : 'text-red-400 hover:text-red-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Unaccounted ({stats.unaccountedCount})
          </button>
          <button
            onClick={() => setStatusFilter('SAFE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
              statusFilter === 'SAFE' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Safe ({stats.accountedCount})
          </button>
          {stats.assistanceNeededCount > 0 && (
            <button
              onClick={() => setStatusFilter('NEEDS_ASSISTANCE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                statusFilter === 'NEEDS_ASSISTANCE' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              Distress ({stats.assistanceNeededCount})
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, floor, or dept..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* ROSTER CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredRoster.map((person) => {
          const isSafe = person.status === 'SAFE';
          const isManualSight = person.status === 'MANUAL_SIGHT_CONFIRMED';
          const isDistress = person.status === 'NEEDS_ASSISTANCE';
          const isUnaccounted = person.status === 'UNACCOUNTED';

          return (
            <div
              key={person.id}
              className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
                isDistress
                  ? 'bg-red-950/80 border-red-500 shadow-lg animate-pulse-fast'
                  : isUnaccounted
                  ? 'bg-slate-900/90 border-red-900/50 hover:border-red-600 shadow'
                  : isManualSight
                  ? 'bg-amber-950/30 border-amber-500/50 shadow'
                  : 'bg-slate-900/60 border-emerald-500/40 shadow'
              }`}
            >
              {/* Status Header Badge */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {person.name}
                    {person.isWarden && (
                      <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[9px] font-black uppercase">
                        Warden
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {person.department} • <span className="text-slate-300 font-medium">{person.officeLocation}</span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {isSafe && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <CheckCircle2 className="w-3 h-3" /> SAFE
                    </span>
                  )}
                  {isManualSight && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Eye className="w-3 h-3" /> SIGHT CONFIRMED
                    </span>
                  )}
                  {isDistress && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-600 text-white animate-bounce">
                      <AlertTriangle className="w-3 h-3" /> DISTRESS / HELP
                    </span>
                  )}
                  {isUnaccounted && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/40">
                      <AlertOctagon className="w-3 h-3" /> UNACCOUNTED
                    </span>
                  )}
                </div>
              </div>

              {/* Check-In Details if present */}
              {person.checkIn && (
                <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] space-y-1 text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Muster Station:</span>
                    <span className="font-semibold text-emerald-300">{person.checkIn.musterPointName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Time:</span>
                    <span>{new Date(person.checkIn.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {person.checkIn.notes && (
                    <div className="bg-red-950/60 p-2 rounded border border-red-700/60 text-red-200 mt-1">
                      <span className="font-bold">Note: </span>{person.checkIn.notes}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons for Warden */}
              <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <a
                  href={`tel:${person.phone}`}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Call Phone</span>
                </a>

                {isUnaccounted && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleWardenSightConfirm(person.id, person.name)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow"
                      title="Mark physically confirmed safe by sight"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Confirm Sight</span>
                    </button>
                    <button
                      onClick={() => handleFlagDistress(person.id)}
                      className="p-1.5 bg-red-900/60 hover:bg-red-800 text-red-300 rounded-lg text-xs transition-colors"
                      title="Flag as distressed / trapped"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: DECLARE EMERGENCY */}
      {showDeclareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-600 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-500 font-bold text-lg">
                <Flame className="w-6 h-6" />
                <span>Declare Emergency Evacuation</span>
              </div>
              <button
                onClick={() => setShowDeclareModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeclareSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Incident Type / Nature of Threat
                </label>
                <select
                  value={declareType}
                  onChange={(e) => setDeclareType(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-red-500"
                >
                  <option value="Fire Evacuation">Fire Evacuation</option>
                  <option value="Active Security Threat / Lockdown">Active Security Threat / Lockdown</option>
                  <option value="Hazardous Gas / Chemical Leak">Hazardous Gas / Chemical Leak</option>
                  <option value="Severe Structural / Earthquake Emergency">Severe Structural / Earthquake Emergency</option>
                  <option value="Scheduled Evacuation Drill">Scheduled Evacuation Drill (Practice)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Incident Commander / Initiating Warden
                </label>
                <input
                  type="text"
                  value={declaredBy}
                  onChange={(e) => setDeclaredBy(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Initial Notes / Hazard Location
                </label>
                <textarea
                  value={declareNotes}
                  onChange={(e) => setDeclareNotes(e.target.value)}
                  placeholder="e.g. Alarm sounding in 3rd floor server room. Smoke reported in Stairwell A."
                  rows={2}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="drillCheck"
                  checked={isDrill}
                  onChange={(e) => setIsDrill(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="drillCheck" className="text-xs text-slate-300">
                  Mark this session as a <strong>Drill / Simulation</strong> (will record in audit history as drill)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeclareModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-black rounded-xl shadow-lg glow-red"
                >
                  Confirm & Broadcast Alarm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ISSUE ALL-CLEAR */}
      {showAllClearModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-600 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                <CheckCircle2 className="w-6 h-6" />
                <span>Issue All-Clear & Close Incident</span>
              </div>
              <button
                onClick={() => setShowAllClearModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-300">
              <div><strong>Accounted:</strong> {stats.accountedCount} / {stats.totalStaff} ({stats.accountabilityPercentage}%)</div>
              <div><strong>Unaccounted:</strong> {stats.unaccountedCount} personnel</div>
              <div><strong>Evacuation Duration:</strong> {formatTimer(elapsedSeconds)}</div>
            </div>

            <form onSubmit={handleAllClearSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Sign-off Officer Name
                </label>
                <input
                  type="text"
                  value={closedBy}
                  onChange={(e) => setClosedBy(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Final Safety Debrief & All-Clear Notes
                </label>
                <textarea
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  placeholder="e.g. Fire department confirmed false alarm. Building safe for re-entry."
                  rows={2}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAllClearModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black rounded-xl shadow-lg"
                >
                  Confirm All-Clear & Generate Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FIRST RESPONDERS DISPATCH HANDOVER MANIFEST */}
      {showManifestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-600 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-500 font-black text-lg">
                <AlertOctagon className="w-6 h-6" />
                <span>FIRST RESPONDER HANDOVER MANIFEST</span>
              </div>
              <button
                onClick={() => setShowManifestModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Provide this official list directly to the Incident Commander, Fire Captain, or Police Unit on-scene. It identifies all personnel not yet checked in safe, including their primary work locations and direct contact numbers.
            </p>

            <div className="bg-red-950/40 border border-red-600/60 rounded-xl p-3 text-xs text-red-200">
              <strong>Emergency Status:</strong> {unaccountedStaff.length} person(s) unaccounted for out of {roster.length} total staff.
            </div>

            <div className="divide-y divide-slate-800 space-y-2">
              {unaccountedStaff.length === 0 ? (
                <div className="text-center py-6 text-emerald-400 font-bold">
                  All 100% of staff are accounted for! No missing persons.
                </div>
              ) : (
                unaccountedStaff.map((person, idx) => (
                  <div key={person.id} className="pt-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-2">
                        <span>{idx + 1}. {person.name}</span>
                        {person.status === 'NEEDS_ASSISTANCE' && (
                          <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase">
                            Distress Signal
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {person.department} • <span className="text-amber-300 font-semibold">{person.officeLocation}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <a
                        href={`tel:${person.phone}`}
                        className="text-xs font-mono font-bold text-red-400 hover:underline"
                      >
                        {person.phone}
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <span className="text-xs text-slate-500">
                Generated at {new Date().toLocaleTimeString()}
              </span>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
              >
                Print / Export Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Manager Modal */}
      <StaffManagerModal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
      />
    </div>
  );
}
