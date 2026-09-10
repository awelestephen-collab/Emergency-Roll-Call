import React, { useState, useEffect } from 'react';
import { useIncident } from '../context/IncidentContext';
import { downloadClientPdf, downloadClientExcel } from '../utils/clientReports';
import {
  History,
  FileDown,
  FileSpreadsheet,
  Clock,
  Users,
  CheckCircle2,
  Calendar,
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export function IncidentHistoryView() {
  const { staffDirectory, roster } = useIncident();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/incidents/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
        if (data.length > 0 && !selectedIncident) {
          setSelectedIncident(data[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-slate-800 rounded-xl text-slate-200">
            <History className="w-6 h-6 text-red-500" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Safety Compliance Audit Log
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Complete historical record of all organizational evacuations, fire drills, and safety exercises for regulatory compliance.
            </p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors"
        >
          Refresh Logs
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Loading safety compliance logs...
        </div>
      ) : history.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          No historical evacuation records found. Completed drills and incidents will appear here automatically.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: List of Incidents */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Recorded Evacuations & Drills ({history.length})
            </h2>

            <div className="space-y-2.5">
              {history.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const dateStr = new Date(inc.declaredAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                const rate = inc.totalStaff ? Math.round((inc.accountedCount / inc.totalStaff) * 100) : 100;

                return (
                  <button
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-red-500 shadow-lg ring-1 ring-red-500/50'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-mono font-bold text-red-400">
                          {inc.id}
                        </div>
                        <h3 className="text-sm font-bold text-white mt-0.5">
                          {inc.type}
                        </h3>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        inc.isDrill
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {inc.isDrill ? 'Drill' : 'Actual'}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-emerald-400">
                        <span>{rate}% Accounted</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Drill Audit View */}
          {selectedIncident && (
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
              {/* Header and Export Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-red-400">
                      {selectedIncident.id}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Status: {selectedIncident.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white mt-1">
                    {selectedIncident.type}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Conducted on {new Date(selectedIncident.declaredAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadClientPdf(selectedIncident, staffDirectory.length > 0 ? staffDirectory : roster)}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    onClick={() => downloadClientExcel(selectedIncident, staffDirectory.length > 0 ? staffDirectory : roster)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Download Excel</span>
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Duration</div>
                  <div className="text-lg font-black text-white mt-1">
                    {formatDuration(selectedIncident.durationSeconds)}
                  </div>
                </div>

                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Accountability</div>
                  <div className="text-lg font-black text-emerald-400 mt-1">
                    {selectedIncident.accountedCount} / {selectedIncident.totalStaff}
                  </div>
                </div>

                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Sight Verified</div>
                  <div className="text-lg font-black text-amber-400 mt-1">
                    {selectedIncident.manualSightCount || 0}
                  </div>
                </div>

                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Missing / Escalated</div>
                  <div className="text-lg font-black text-red-400 mt-1">
                    {selectedIncident.unaccountedCount || 0}
                  </div>
                </div>
              </div>

              {/* Sign-off and Notes */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
                <div><strong>Incident Commander:</strong> {selectedIncident.declaredBy}</div>
                <div><strong>All-Clear Given By:</strong> {selectedIncident.closedBy || 'N/A'}</div>
                <div><strong>Debrief Notes:</strong> {selectedIncident.notes || 'No specific notes recorded.'}</div>
              </div>

              {/* Muster Point Distribution */}
              {selectedIncident.musterPointBreakdown && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Muster Station Headcount Distribution
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {Object.entries(selectedIncident.musterPointBreakdown).map(([pointId, count]) => (
                      <div key={pointId} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">{pointId}</span>
                        <span className="font-bold text-white">{count} staff</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Timeline */}
              {selectedIncident.timeline && selectedIncident.timeline.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Incident Audit Timeline
                  </h3>
                  <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3 space-y-2 max-h-48 overflow-y-auto">
                    {selectedIncident.timeline.map((t, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-xs border-b border-slate-800/40 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-slate-500 font-mono flex-shrink-0">
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-200">{t.action}</div>
                          <div className="text-slate-400 text-[11px]">{t.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
