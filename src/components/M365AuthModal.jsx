import React, { useState } from 'react';
import { m365Auth } from '../services/m365Auth';
import { DEFAULT_STAFF } from '../data/initialData';
import {
  ShieldCheck,
  ShieldAlert,
  LogOut,
  UserCheck,
  Lock,
  Mail,
  Building,
  Key,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

export function M365AuthModal({ isOpen, onClose }) {
  const [currentUser, setCurrentUser] = useState(m365Auth.getUser());
  const [activeTab, setActiveTab] = useState('quick_picker'); // 'quick_picker', 'email', 'settings'
  const [emailInput, setEmailInput] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState(currentUser?.id || 'EMP-003');
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // Filter wardens vs general staff
  const wardens = DEFAULT_STAFF.filter((s) => s.isWarden);
  const generalStaff = DEFAULT_STAFF.filter((s) => !s.isWarden).slice(0, 10);

  const handleLogin = (staffId) => {
    try {
      setError(null);
      const user = m365Auth.loginWithMicrosoft({ simulatedStaffId: staffId });
      setCurrentUser(user);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEmailLogin = (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    try {
      setError(null);
      const user = m365Auth.loginWithMicrosoft({ email: emailInput });
      setCurrentUser(user);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    m365Auth.logout();
    setCurrentUser(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              {/* Microsoft 4-square icon */}
              <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                <div className="bg-[#F25022] rounded-xs" />
                <div className="bg-[#7FBA00] rounded-xs" />
                <div className="bg-[#00A4EF] rounded-xs" />
                <div className="bg-[#FFB900] rounded-xs" />
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Microsoft 365 Authentication</span>
              </h2>
              <p className="text-xs text-slate-400">
                Verified work account for safety role authorization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Status Banner */}
        <div className="p-4 sm:p-5 bg-slate-950/30 border-b border-slate-800/80">
          {currentUser ? (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold ${
                  currentUser.isWarden ? 'bg-red-600' : 'bg-blue-600'
                }`}>
                  {currentUser.isWarden ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <UserCheck className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">
                      {currentUser.name}
                    </span>
                    {currentUser.isWarden ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 text-[10px] font-black uppercase tracking-wider">
                        Safety Warden
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-[10px] font-medium">
                        Staff
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {currentUser.email} • {currentUser.department}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center gap-1.5 transition-colors flex-shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold">Not Authenticated:</span> Anyone can view or check in, but you must sign in as a <strong>Designated Safety Warden</strong> to trigger or cancel evacuations.
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Select Microsoft 365 Work Account</span>
            <span className="text-[11px] text-emerald-400 font-bold">M365 Directory Synced</span>
          </div>

          {/* Designated Wardens Section */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-red-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Designated Safety Wardens (Authorized to Trigger Alarms)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {wardens.map((w) => {
                const isSelected = currentUser?.id === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => handleLogin(w.id)}
                    className={`p-3 rounded-2xl text-left border transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-red-950/60 border-red-500 text-white shadow-lg'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5">
                        <span>{w.name}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {w.role} ({w.department})
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 text-[9px] font-bold uppercase flex-shrink-0">
                      Warden
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Standard Staff Section */}
          <div className="space-y-2 pt-2">
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Building className="w-3.5 h-3.5" />
              <span>Standard Staff Members (Check-In Only, Cannot Trigger)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {generalStaff.map((s) => {
                const isSelected = currentUser?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleLogin(s.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 text-white shadow-lg'
                        : 'bg-slate-800/20 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate flex items-center gap-1">
                        <span>{s.name}</span>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {s.role}
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px]">
                      Staff
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Or Sign in by Work Email */}
          <form onSubmit={handleEmailLogin} className="pt-3 border-t border-slate-800 space-y-2">
            <label className="text-[11px] font-bold text-slate-400 block">
              Or Sign In with Corporate M365 Email:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="e.g. morolake.odusi@falcon-emergency.app"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
            </div>
          </form>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-200 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Powered by Microsoft Identity Platform & Entra ID
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
