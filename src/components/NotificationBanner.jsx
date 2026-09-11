import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, CheckCircle, ShieldAlert, Sparkles, Loader2, X } from 'lucide-react';
import { pushManager } from '../services/pushManager';
import { useIncident } from '../context/IncidentContext';

export function NotificationBanner() {
  const { currentUser } = useIncident();
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (!pushManager.isPushSupported()) {
      setIsSupported(false);
      return;
    }

    setPermission(pushManager.getPermissionStatus());

    async function checkSubscription() {
      const subscribed = await pushManager.isSubscribed();
      setIsSubscribed(subscribed);
    }
    checkSubscription();
  }, []);

  const handleEnableAlerts = async () => {
    setIsLoading(true);
    setTestStatus('');
    try {
      await pushManager.subscribe({
        staffId: currentUser?.id,
        staffName: currentUser?.name
      });
      setPermission('granted');
      setIsSubscribed(true);
      setTestStatus('✅ Alerts enabled! Tap "Test Phone Alert" below to test.');
    } catch (err) {
      console.error('[NotificationBanner] Subscription failed:', err);
      setPermission(pushManager.getPermissionStatus());
      setTestStatus(`⚠️ ${err.message || 'Could not enable notifications.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAlert = async () => {
    setIsLoading(true);
    setTestStatus('⏳ Sending alert... Lock your phone screen NOW to test!');
    try {
      // Delay 3 seconds before firing test to allow user to lock phone screen
      setTimeout(async () => {
        try {
          await pushManager.sendTestAlert();
          setTestStatus('⚡ Test alert sent! Check your lock screen.');
        } catch (e) {
          setTestStatus('⚠️ Error sending test alert: ' + e.message);
        } finally {
          setIsLoading(false);
        }
      }, 3000);
    } catch (err) {
      setTestStatus('⚠️ Error: ' + err.message);
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  // If already subscribed and dismissed, keep screen clean
  if (isSubscribed && isDismissed) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-2">
      {/* CASE 1: Permission not granted yet */}
      {permission !== 'granted' && !isDismissed && (
        <div className="relative overflow-hidden bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/70 border-2 border-red-500/60 rounded-2xl p-4 shadow-xl text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-red-600/30 border border-red-500 text-red-300 animate-pulse">
                <BellRing className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm sm:text-base text-white tracking-tight">
                    Enable Lock-Screen Drill Alerts
                  </span>
                  <span className="text-[10px] uppercase font-extrabold bg-red-600 text-white px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Allows your phone to ring and vibrate during evacuation drills even when the screen is locked or the app is closed.
                </p>
                {permission === 'denied' && (
                  <p className="text-xs text-amber-300 font-semibold mt-1">
                    ⚠️ Notifications are currently blocked in your browser. Tap the tune/padlock icon in your address bar above to allow notifications.
                  </p>
                )}
                {testStatus && (
                  <p className="text-xs text-amber-200 mt-1 font-medium">{testStatus}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleEnableAlerts}
                disabled={isLoading || permission === 'denied'}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
                  permission === 'denied'
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-red-600 hover:bg-red-500 active:scale-95 text-white shadow-red-900/40 cursor-pointer'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enabling...</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    <span>Enable Lock-Screen Alerts</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsDismissed(true)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASE 2: Permission granted & subscribed */}
      {permission === 'granted' && isSubscribed && !isDismissed && (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping-slow"></div>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 font-semibold">
              Lock-Screen Alerts Active: This phone will buzz and ring on emergency drills even if locked.
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {testStatus ? (
              <span className="text-[11px] text-amber-300 font-medium">{testStatus}</span>
            ) : null}

            <button
              onClick={handleTestAlert}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
              title="Dispatches a test notification in 3 seconds. Lock your phone to test lock-screen wakeup."
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <BellRing className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Test Phone (Lock & Wait 3s)</span>
            </button>

            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
              title="Hide banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
