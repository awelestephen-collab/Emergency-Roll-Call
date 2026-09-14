import React, { useEffect, useState } from 'react';
import { IncidentProvider, useIncident } from './context/IncidentContext';
import { StaffCheckInView } from './pages/StaffCheckInView';
import { WardenDashboardView } from './pages/WardenDashboardView';
import { IncidentHistoryView } from './pages/IncidentHistoryView';
import { InstallModal } from './components/InstallModal';
import { ServerConfigModal } from './components/ServerConfigModal';
import { NotificationBanner } from './components/NotificationBanner';
import { NotificationModal } from './components/NotificationModal';
import { SoundPermissionModal } from './components/SoundPermissionModal';
import { soundSynthesizer } from './components/AudioAlarm';
import {
  ShieldAlert,
  Users,
  LayoutDashboard,
  History,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Flame,
  Smartphone,
  Bell
} from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState('checkin'); // 'checkin', 'warden', 'history'
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('alert')) {
      setActiveTab('checkin');
    }
    if (params.get('autoAlarm') === '1') {
      soundSynthesizer.startSiren();
    }
  }, []);

  const [showSoundPermissionModal, setShowSoundPermissionModal] = useState(false);

  const {
    activeIncident,
    isOnline,
    socketConnected,
    isAudioMuted,
    isSirenPlaying,
    isAutoplayBlocked,
    soundPermission,
    grantSoundPermission,
    declineSoundPermission,
    resetSoundPermission,
    unlockAudio,
    toggleMute
  } = useIncident();

  // Always request permission if it's not enabled already (do not enable by default)
  useEffect(() => {
    if (soundPermission === 'prompt') {
      setShowSoundPermissionModal(true);
    }
  }, [soundPermission]);

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

            {/* Audio Siren / Sound Permission Toggle */}
            <button
              onClick={() => {
                if (soundPermission !== 'granted') {
                  setShowSoundPermissionModal(true);
                } else {
                  toggleMute();
                }
              }}
              className={`p-2 rounded-xl border transition-colors ${
                soundPermission !== 'granted'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 animate-pulse'
                  : isAudioMuted
                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  : 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
              }`}
              title={
                soundPermission !== 'granted'
                  ? 'Sound not enabled on this device • Tap to enable siren permissions'
                  : isAudioMuted
                  ? 'Sound muted • Tap to unmute siren'
                  : 'Sound enabled • Tap to mute siren'
              }
            >
              {soundPermission !== 'granted' ? (
                <VolumeX className="w-4 h-4 text-amber-400" />
              ) : isAudioMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Connectivity Badge */}
            <button
              onClick={() => setShowServerModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium border transition-colors cursor-pointer ${
                isOnline && socketConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : isOnline
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
              title={
                isOnline && socketConnected
                  ? 'Live Server Hub Connected • Real-time Sync Active (Click to view)'
                  : isOnline
                  ? 'Standalone Mode (No Cloud Hub Connected) • Click to connect server'
                  : 'Offline Mode • Local Queueing Active'
              }
            >
              {isOnline && socketConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Sync Live</span>
                </>
              ) : isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span className="hidden sm:inline">Standalone</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </button>

            {/* Lock-Screen Emergency Alerts Toggle / Config */}
            <button
              onClick={() => setShowNotificationModal(true)}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-red-400 hover:text-red-300 transition-colors"
              title="Lock-Screen Drill Notifications & Device Testing"
            >
              <Bell className="w-4 h-4" />
            </button>

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
        </div>
      </header>

      {/* SOUND PERMISSION PROMPT BANNER (ALWAYS PROMPT IF SOUND NOT ENABLED ON THIS DEVICE) */}
      {soundPermission !== 'granted' && (
        <div className="max-w-7xl mx-auto px-4 pt-2">
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-950/80 via-slate-900 to-red-950/70 border-2 border-amber-500/70 rounded-2xl p-4 shadow-xl text-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500 text-amber-300 animate-pulse flex-shrink-0">
                  <Volume2 className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm sm:text-base text-white tracking-tight">
                      Device Sound Permission Required
                    </span>
                    <span className="text-[10px] uppercase font-extrabold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                      Action Required
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Alarm siren is disabled by default on this device. Grant permission to allow safety sirens and audible roll-call alerts to ring out during drills and evacuations.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowSoundPermissionModal(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Allow Sound</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUTOPLAY UNLOCK BANNER FOR MOBILE BROWSERS & PWAs */}
      {activeIncident && soundPermission === 'granted' && isAutoplayBlocked && (
        <div
          onClick={unlockAudio}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') unlockAudio(); }}
          className="bg-red-600 hover:bg-red-500 cursor-pointer text-white px-4 py-3 text-center border-b-2 border-amber-300 shadow-2xl animate-pulse transition-all select-none"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
            <Volume2 className="w-6 h-6 animate-bounce text-amber-300 flex-shrink-0" />
            <div className="text-left sm:text-center">
              <span className="font-black text-sm sm:text-base tracking-wide uppercase block sm:inline mr-2">
                🚨 EVACUATION ALARM ACTIVE:
              </span>
              <span className="text-xs sm:text-sm font-semibold underline underline-offset-2">
                TAP ANYWHERE ON SCREEN TO SOUND SIREN ON THIS DEVICE
              </span>
            </div>
          </div>
        </div>
      )}

      {/* LOCK-SCREEN PUSH NOTIFICATION ALERT BANNER */}
      <NotificationBanner />

      {/* MAIN VIEWPORT CONTENT */}
      <main className="flex-1 py-4">
        {activeTab === 'checkin' && <StaffCheckInView />}
        {activeTab === 'warden' && <WardenDashboardView />}
        {activeTab === 'history' && <IncidentHistoryView />}
      </main>

      {/* COMPLIANCE FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Enterprise Emergency Evacuation & Roll Call System • Life Safety Edition</span>
          <span>Zero-Friction Fast Mobile Access • PWA Standalone Ready</span>
        </div>
      </footer>

      {/* INSTALL ON PHONE MODAL */}
      <InstallModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />

      {/* CLOUD SERVER SYNC MODAL */}
      <ServerConfigModal
        isOpen={showServerModal}
        onClose={() => setShowServerModal(false)}
        isConnected={socketConnected}
      />

      {/* EMERGENCY NOTIFICATION CONFIG & TEST MODAL */}
      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      {/* SOUND PERMISSION REQUEST MODAL (ALWAYS REQUEST IF NOT ENABLED ALREADY) */}
      <SoundPermissionModal
        isOpen={showSoundPermissionModal}
        onGrant={() => {
          grantSoundPermission();
          setShowSoundPermissionModal(false);
        }}
        onDecline={() => {
          declineSoundPermission();
          setShowSoundPermissionModal(false);
        }}
        activeIncident={activeIncident}
      />
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
