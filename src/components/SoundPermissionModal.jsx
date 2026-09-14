import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, ShieldAlert, CheckCircle, BellRing, Smartphone } from 'lucide-react';
import { soundSynthesizer } from './AudioAlarm';
import { pushManager } from '../services/pushManager';

export function SoundPermissionModal({ isOpen, onGrant, onDecline, activeIncident }) {
  const [permissionState, setPermissionState] = useState(soundSynthesizer.getSoundPermission());

  useEffect(() => {
    return soundSynthesizer.onPermissionChange((perm) => {
      setPermissionState(perm);
    });
  }, []);

  if (!isOpen) return null;

  const handleAllowSound = async () => {
    soundSynthesizer.grantSoundPermission();
    soundSynthesizer.unlockAudio();
    soundSynthesizer.triggerVibration(); // Instant vibration confirmation

    // Request OS push notification permission so alerts ring when Chrome is closed
    if (pushManager.isPushSupported()) {
      try {
        await pushManager.subscribe();
      } catch (err) {
        console.warn('[Push] Background push subscribe warning:', err);
      }
    }

    if (activeIncident && activeIncident.status === 'ACTIVE') {
      soundSynthesizer.startSiren();
    } else {
      soundSynthesizer.playTestSound();
    }
    if (onGrant) onGrant();
  };

  const handleMuteSound = () => {
    soundSynthesizer.declineSoundPermission();
    if (onDecline) onDecline();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-red-500/70 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-100 overflow-hidden space-y-5">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse" />

        {/* Icon & Title */}
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-red-600/20 border border-red-500/50 rounded-2xl text-red-400 flex-shrink-0 animate-pulse">
            <Volume2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-red-600 text-white">
                Life Safety Alerts
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white mt-1">
              Enable Alarm, Vibration & Alerts?
            </h3>
          </div>
        </div>

        {/* Informational Body */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {activeIncident ? (
            <span className="text-amber-300 font-bold block mb-1">
              🚨 AN ACTIVE EVACUATION IS CURRENTLY IN PROGRESS.
            </span>
          ) : null}
          In compliance with workplace safety procedures, this application requests your permission to sound evacuation sirens, vibrate this device, and deliver immediate lock-screen notifications even when Chrome is closed.
        </p>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Sounds evacuation siren & vibrates phone continuously on trigger</span>
          </div>
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <BellRing className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Delivers immediate lock-screen alerts even when Chrome is closed or minimized</span>
          </div>
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <Smartphone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Checking in "SAFE" immediately ends the alarm on your device</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleAllowSound}
            className="flex-1 py-3.5 px-4 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-red-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>Allow Siren & Alerts</span>
          </button>

          <button
            type="button"
            onClick={handleMuteSound}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white font-bold text-xs sm:text-sm rounded-2xl border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <VolumeX className="w-4 h-4" />
            <span>Mute / Silent</span>
          </button>
        </div>
      </div>
    </div>
  );
}
