import React, { useState, useEffect } from 'react';
import {
  Server,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  X,
  Globe,
  Radio
} from 'lucide-react';
import { getBackendUrl, setBackendUrl } from '../config/api';

export function ServerConfigModal({ isOpen, onClose, isConnected }) {
  const [serverUrl, setInputServerUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setInputServerUrl(getBackendUrl());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const target = serverUrl.trim().replace(/\/+$/, '');
    const healthUrl = target ? `${target}/api/health` : '/api/health';

    try {
      const res = await fetch(healthUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          success: true,
          message: `Connected successfully! Server is active (Status: ${data.status || 'OK'}).`
        });
      } else {
        setTestResult({
          success: false,
          message: `Server responded with HTTP ${res.status}. Verify the address.`
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Could not connect. Verify the URL and ensure the server is running.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    setBackendUrl(serverUrl);
    window.location.reload();
  };

  const handleClear = () => {
    setBackendUrl('');
    setInputServerUrl('');
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-red-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Live Server Synchronization
              </h2>
              <p className="text-xs text-slate-400">
                Real-time connection across all staff smartphones
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

        {/* Current Live Connection Status */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
          isConnected
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
            : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
        }`}>
          {isConnected ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 text-xs">
            <div className="font-black uppercase tracking-wider">
              {isConnected ? 'LIVE SYNC ACTIVE' : 'STANDALONE DEVICE MODE'}
            </div>
            <p className="opacity-90 leading-relaxed">
              {isConnected
                ? 'Your device is connected to the live Emergency WebSocket Hub. Practice drills, alarms, and staff check-ins will synchronize across all smartphones in real time.'
                : 'Your app is currently running in local standalone mode. To synchronize drills and check-ins between the warden and staff phones, connect to a shared Cloud Hub (e.g. Render or custom server).'}
            </p>
          </div>
        </div>

        {/* Server URL Input */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Cloud Hub / Server Address
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => setInputServerUrl(e.target.value)}
                placeholder="https://emergency-roll-call.onrender.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
              <span>Test</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Enter your deployed server URL (e.g. Render, Railway, or local testing IP).
          </p>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            testResult.success
              ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
              : 'bg-red-950/60 border border-red-500/50 text-red-300'
          }`}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Deployment Helper Box */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
          <div className="font-bold text-white flex items-center justify-between">
            <span>24/7 Free Cloud Hub Deployment</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Free Tier</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Because GitHub Pages and Vercel only host static files, deploying the live Node.js server to <strong>Render.com</strong> enables instant WebSocket synchronization across all staff smartphones anywhere in the world:
          </p>
          <ol className="space-y-1.5 pl-4 list-decimal text-[11px] text-slate-300">
            <li>Sign in to <a href="https://render.com" target="_blank" rel="noreferrer" className="text-red-400 hover:underline inline-flex items-center gap-0.5">Render.com <ExternalLink className="w-3 h-3 inline" /></a>.</li>
            <li>Click <strong>New +</strong> &gt; <strong>Web Service</strong>.</li>
            <li>Select your repository: <strong className="text-white">Emergency-Roll-Call</strong>.</li>
            <li>Build Command: <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">npm install &amp;&amp; npm run build</code></li>
            <li>Start Command: <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">npm run server</code></li>
            <li>Copy your live Render URL and paste it in the box above!</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={handleClear}
            className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            Reset
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl transition-colors shadow-lg shadow-red-900/40"
            >
              Save &amp; Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
