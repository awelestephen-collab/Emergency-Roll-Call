import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Share2,
  PlusSquare,
  MoreVertical,
  Download,
  X,
  CheckCircle2,
  Building,
  QrCode,
  Sparkles
} from 'lucide-react';

export function InstallModal({ isOpen, onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [activePlatform, setActivePlatform] = useState('ios'); // 'ios', 'android', 'it-mdm', 'qr'
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
    }

    // Capture Android beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setActivePlatform('android');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const currentUrl = window.location.origin + window.location.pathname;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600 rounded-xl text-white shadow">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Install on Staff Smartphones
              </h2>
              <p className="text-xs text-slate-400">
                Turn this into a full-screen home screen app in 10 seconds.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Native Android Instant Install Prompt */}
        {deferredPrompt && (
          <div className="bg-gradient-to-r from-red-600 to-amber-600 rounded-2xl p-4 text-white shadow-xl flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-90">Quick Install</div>
              <div className="text-sm font-black">Add Muster Call to Home Screen</div>
            </div>
            <button
              onClick={handleNativeInstall}
              className="px-4 py-2 bg-white text-slate-950 font-black text-xs rounded-xl shadow hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Install Now
            </button>
          </div>
        )}

        {/* Platform Selection Tabs */}
        <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActivePlatform('ios')}
            className={`py-2 px-2 rounded-xl transition-all text-center ${
              activePlatform === 'ios'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            iPhone (iOS)
          </button>
          <button
            onClick={() => setActivePlatform('android')}
            className={`py-2 px-2 rounded-xl transition-all text-center ${
              activePlatform === 'android'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Android
          </button>
          <button
            onClick={() => setActivePlatform('it-mdm')}
            className={`py-2 px-2 rounded-xl transition-all text-center ${
              activePlatform === 'it-mdm'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            IT / Intune
          </button>
          <button
            onClick={() => setActivePlatform('qr')}
            className={`py-2 px-2 rounded-xl transition-all text-center ${
              activePlatform === 'qr'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Muster QR
          </button>
        </div>

        {/* TAB 1: iPHONE (iOS Safari) */}
        {activePlatform === 'ios' && (
          <div className="space-y-4 text-xs text-slate-300">
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
              <span className="p-2 bg-slate-800 text-red-400 rounded-xl font-black text-sm">iOS</span>
              <div>
                <span className="font-bold text-white">Apple Safari Browser</span>
                <p className="text-[11px] text-slate-400">Works on all iPhones without needing the App Store or Apple ID password.</p>
              </div>
            </div>

            <ol className="space-y-3 pl-1">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600/30 text-red-300 font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <div>
                  <span className="font-bold text-white">Open in Safari:</span> Open the company evacuation link in Safari on your iPhone.
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600/30 text-red-300 font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <div>
                  <span className="font-bold text-white">Tap the Share icon:</span> Look at the bottom navigation bar of Safari and tap the <strong>Share</strong> button <Share2 className="w-3.5 h-3.5 inline text-blue-400" /> (the square with an arrow pointing up).
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600/30 text-red-300 font-bold flex items-center justify-center text-xs">
                  3
                </span>
                <div>
                  <span className="font-bold text-white">Tap "Add to Home Screen":</span> Scroll down in the share sheet and tap <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" /> <strong>"Add to Home Screen"</strong>, then tap <strong>Add</strong> in the top right.
                </div>
              </li>
            </ol>

            <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-xl text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>A red <strong>Muster Call</strong> app icon now appears on your home screen. It opens instantly full-screen like a native app and works offline!</span>
            </div>
          </div>
        )}

        {/* TAB 2: ANDROID (Chrome / Edge / Samsung Internet) */}
        {activePlatform === 'android' && (
          <div className="space-y-4 text-xs text-slate-300">
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
              <span className="p-2 bg-slate-800 text-emerald-400 rounded-xl font-black text-sm">Android</span>
              <div>
                <span className="font-bold text-white">Google Chrome or Samsung Internet</span>
                <p className="text-[11px] text-slate-400">Installs directly to your apps drawer and home screen.</p>
              </div>
            </div>

            <ol className="space-y-3 pl-1">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <div>
                  <span className="font-bold text-white">Open in Chrome:</span> Open this evacuation page in Chrome on Android.
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <div>
                  <span className="font-bold text-white">Tap More (3 dots):</span> Tap the <MoreVertical className="w-3.5 h-3.5 inline text-slate-300" /> three dots icon in the top right corner.
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center text-xs">
                  3
                </span>
                <div>
                  <span className="font-bold text-white">Tap "Install app" / "Add to Home screen":</span> Tap <Download className="w-3.5 h-3.5 inline text-emerald-400" /> <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
                </div>
              </li>
            </ol>

            <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-xl text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>The app will be installed with full offline caching and push notifications.</span>
            </div>
          </div>
        )}

        {/* TAB 3: IT ADMIN / MDM PUSH (MICROSOFT INTUNE / JAMF) */}
        {activePlatform === 'it-mdm' && (
          <div className="space-y-3 text-xs text-slate-300">
            <div className="bg-blue-950/40 border border-blue-500/40 p-3 rounded-2xl text-blue-200">
              <div className="font-bold flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-400" />
                <span>Zero Employee Effort: Corporate Auto-Push</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                If your company manages staff smartphones via <strong>Microsoft Intune</strong>, <strong>Jamf</strong>, or <strong>Workspace ONE</strong>, your IT department can silently install this app icon on all company devices in 5 minutes!
              </p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px] text-slate-300">
              <div className="font-bold text-white font-sans text-xs">In Microsoft Intune Endpoint Manager:</div>
              <div>1. Go to <strong>Apps</strong> &gt; <strong>All Apps</strong> &gt; <strong>Add</strong></div>
              <div>2. Select App type: <strong>Web Clip</strong> (iOS/iPadOS) or <strong>Web link</strong> (Android)</div>
              <div>3. App URL: <span className="text-blue-400">{currentUrl}</span></div>
              <div>4. Name: <span className="text-emerald-400">Emergency Muster Call</span></div>
              <div>5. Assignments: Assign to <strong>All Users</strong> or <strong>All Devices</strong></div>
            </div>

            <p className="text-[11px] text-slate-400">
              Within hours, the app icon automatically appears on every employee's home screen without asking them to click anything.
            </p>
          </div>
        )}

        {/* TAB 4: MUSTER POINT QR POSTER */}
        {activePlatform === 'qr' && (
          <div className="space-y-3 text-xs text-slate-300 text-center">
            <p className="text-slate-400">
              Print this QR code on waterproof boards at each designated muster point. Any employee who evacuates without having pre-installed the app can scan this with their phone camera to check in immediately:
            </p>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-xl mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}`}
                alt="Emergency Evacuation QR Code"
                className="w-44 h-44 mx-auto"
              />
              <div className="text-slate-950 font-black text-xs mt-2 tracking-wider uppercase">
                Scan to Check In Safe
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              Direct URL: <span className="text-red-400 font-mono font-bold">{currentUrl}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
