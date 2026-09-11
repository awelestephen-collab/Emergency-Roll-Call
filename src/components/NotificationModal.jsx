import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  CheckCircle,
  X,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { pushManager } from '../services/pushManager';
import { getApiUrl } from '../config/api';
import { useIncident } from '../context/IncidentContext';

export function NotificationModal({ isOpen, onClose }) {
  const { currentUser } = useIncident();
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState('');
  const [subscriberCount, setSubscriberCount] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setPermission(pushManager.getPermissionStatus());

    async function checkStatus() {
      const sub = await pushManager.isSubscribed();
      setIsSubscribed(sub);

      try {
        const res = await fetch(getApiUrl('/api/push/stats'));
        if (res.ok) {
          const data = await res.json();
          setSubscriberCount(data.totalSubscribers);
        }
      } catch (e) {}
    }
    checkStatus();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    setIsLoading(true);
    setTestStatus('');
    try {
      await pushManager.subscribe({
        staffId: currentUser?.id,
        staffName: currentUser?.name
      });
      setPermission('granted');
      setIsSubscribed(true);
      setTestStatus('✅ Push notifications successfully linked to this phone!');

      // Update count
      const res = await fetch(getApiUrl('/api/push/stats'));
      if (res.ok) {
        const data = await res.json();
        setSubscriberCount(data.totalSubscribers);
      }
    } catch (err) {
      setTestStatus(`⚠️ ${err.message || 'Failed to enable notifications'}`);
      setPermission(pushManager.getPermissionStatus());
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      await pushManager.unsubscribe();
      setIsSubscribed(false);
      setTestStatus('Notifications disabled for this device.');
    } catch (err) {
      setTestStatus('⚠️ Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTest = async () => {
    setIsLoading(true);
    setTestStatus('⏳ Sending test alert in 3 seconds... LOCK YOUR PHONE NOW to test!');
    setTimeout(async () => {
      try {
        await pushManager.sendTestAlert();
        setTestStatus('⚡ Test alert sent! Check your phone lock screen.');
      } catch (e) {
        setTestStatus('⚠️ Error sending test: ' + e.message);
      } finally {
        setIsLoading(false);
      }
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-red-600/20 border border-red-500/40 rounded-xl text-red-400">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Emergency Lock-Screen Alerts</h3>
            <p className="text-xs text-slate-400">
              Web Push protocol for locked or closed mobile devices
            </p>
          </div>
        </div>

        {/* Current Device Status */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 mb-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Notification Permission:</span>
            <span
              className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                permission === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : permission === 'denied'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              {permission}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Device Push Subscription:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full ${
                isSubscribed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {isSubscribed ? 'Active & Linked' : 'Not Linked'}
            </span>
          </div>

          {subscriberCount !== null && (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
              <span className="text-slate-400 font-medium">Total Registered Staff Phones:</span>
              <span className="text-white font-bold">{subscriberCount} device(s)</span>
            </div>
          )}
        </div>

        {/* Status messages */}
        {testStatus && (
          <div className="mb-4 p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-amber-200">
            {testStatus}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          {!isSubscribed ? (
            <button
              onClick={handleSubscribe}
              disabled={isLoading || permission === 'denied'}
              className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                permission === 'denied'
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-red-600 hover:bg-red-500 text-white active:scale-98 shadow-red-900/30'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              <span>Enable Lock-Screen Alerts on This Phone</span>
            </button>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleSendTest}
                disabled={isLoading}
                className="py-3 px-4 rounded-xl bg-amber-600/30 hover:bg-amber-600/40 border border-amber-500/50 text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BellRing className="w-4 h-4 text-amber-400" />
                )}
                <span>Test Alert (Lock Phone)</span>
              </button>

              <button
                onClick={handleUnsubscribe}
                disabled={isLoading}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <BellOff className="w-4 h-4 text-slate-400" />
                <span>Disable on This Phone</span>
              </button>
            </div>
          )}
        </div>

        {/* OS Specific Instructions */}
        <div className="border-t border-slate-800 pt-4 text-xs text-slate-400 space-y-2">
          <div className="font-bold text-slate-300 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-red-400" />
            <span>How it works:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              When a Warden declares a drill, Google FCM / Apple APNs delivers a high-priority push to your phone.
            </li>
            <li>
              Your phone will vibrate and show a persistent emergency banner even if your screen is dark or the app is closed.
            </li>
            <li>
              Tapping the notification opens the Muster Roll-Call screen instantly.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
