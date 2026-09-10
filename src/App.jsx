import React, { useState } from 'react';
import { IncidentProvider, useIncident } from './context/IncidentContext';
import { StaffCheckInView } from './pages/StaffCheckInView';
import { WardenDashboardView } from './pages/WardenDashboardView';
import { IncidentHistoryView } from './pages/IncidentHistoryView';
import { M365IntegrationView } from './pages/M365IntegrationView';
import { InstallModal } from './components/InstallModal';
import {
  ShieldAlert,
  Users,
  LayoutDashboard,
  History,
  Layers,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Flame,
  Smartphone
} from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState('checkin'); // 'checkin', 'warden', 'history', 'm365'
  const [showInstallModal, setShowInstallModal] = useState(false);

  const {
    activeIncident,
    isOnline,
    socketConnected,
    isAudioMuted,
    toggleMute
  } = useIncident();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* GLOBAL HIGH-CONTRAST TOP BAR */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Brand Logo & Emergency Pulse */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl text-white shadow-lg transition-all ${
              activeIncident ? 'bg-red-600 animate-pulse glow-red' : 'bg-slate-800'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base tracking-tight text-white">
                  MUSTER CALL
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Life Safety
                </span>
              </div>
              <div className="text-[11px] text-slate-400 hidden sm:block">
                Emergency Evacuation & Accountability System
              </div>
            </div>
          </div>

          {/* Right Status Indicators & Sound Control */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Active Status Pill */}
            {activeIncident ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/30 border border-red-500 text-red-300 text-xs font-black uppercase tracking-wider animate-pulse">
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span>EVACUATION ACTIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping-slow"></span>
                <span>Standby Ready</span>
              </div>
            )}

            {/* Audio Siren / Mute Toggle */}
            <button
              onClick={toggleMute}
              className={`p-2 rounded-xl border transition-colors ${
                isAudioMuted
                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  : 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
              }`}
              title={isAudioMuted ? 'Unmute safety sirens & chimes' : 'Mute sound'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Connectivity Badge */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium border ${
                isOnline && socketConnected
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              }`}
              title={isOnline ? 'Real-time WebSocket Sync Connected' : 'Offline Mode (Local Queueing Active)'}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden md:inline">Sync Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* Install on Phone Button */}
            <button
              onClick={() => setShowInstallModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold transition-colors shadow-sm"
              title="Install this app on your iPhone or Android home screen"
            >
              <Smartphone className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          </div>
        </div>

        {/* PRIMARY NAVIGATION TABS */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'checkin'
                ? 'border-red-500 text-white bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-red-400" />
            <span>Staff Check-In</span>
          </button>

          <button
            onClick={() => setActiveTab('warden')}
            className={`py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'warden'
                ? 'border-red-500 text-white bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-red-400" />
            <span>Warden Command</span>
            {activeIncident && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'history'
                ? 'border-red-500 text-white bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4 text-slate-400" />
            <span>Safety Audit Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('m365')}
            className={`py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'm365'
                ? 'border-blue-500 text-white bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span>SharePoint & Power Apps</span>
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT CONTENT */}
      <main className="flex-1 py-4">
        {activeTab === 'checkin' && <StaffCheckInView />}
        {activeTab === 'warden' && <WardenDashboardView />}
        {activeTab === 'history' && <IncidentHistoryView />}
        {activeTab === 'm365' && <M365IntegrationView />}
      </main>

      {/* COMPLIANCE FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Enterprise Emergency Evacuation & Roll Call System • Safety Compliance Edition</span>
          <span>Zero-Friction Fast Mobile Access • SharePoint / M365 Interoperable</span>
        </div>
      </footer>

      {/* INSTALL ON PHONE MODAL */}
      <InstallModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </div>
  );
}

export default function App() {
  return (
    <IncidentProvider>
      <AppContent />
    </IncidentProvider>
  );
}
