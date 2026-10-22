import React, { useState, useEffect } from 'react';
import { Terminal, RefreshCw, Filter, Search, ShieldCheck, Clock, User } from 'lucide-react';
import { adminAPI } from '../../api/admin.api';
import Loader from '../../components/common/Loader';
import { formatDate } from '../../utils/formatters';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (actionFilter !== 'all') params.action = actionFilter;
      const res = await adminAPI.getLogs(params);
      if (res?.logs) {
        setLogs(res.logs);
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
              Audit & Compliance
            </span>
            <span className="text-xs text-slate-500 font-medium">· Immutable Records</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            System Activity & Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mt-1">
            Complete audit trail recording professional approvals, account suspensions, reassigned jobs, dispute settlements, and configuration changes.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-4 flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <span className="text-xs font-bold text-slate-500 mr-1">Action:</span>
        {[
          { key: 'all', label: 'All Actions' },
          { key: 'VENDOR_APPROVAL_UPDATED', label: 'Pro Approvals' },
          { key: 'JOB_REASSIGNED', label: 'Job Reassignments' },
          { key: 'CUSTOMER_STATUS_UPDATED', label: 'User Suspensions' },
          { key: 'DISPUTE_RESOLVED', label: 'Disputes' },
          { key: 'REPORT_RESOLVED', label: 'Report Moderation' },
          { key: 'PLATFORM_SETTINGS_UPDATED', label: 'Settings' }
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setActionFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              actionFilter === f.key
                ? 'bg-purple-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Logs Viewer */}
      {loading ? (
        <div className="py-20">
          <Loader text="Loading audit log records..." />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center">
          <Terminal className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No logs found</h3>
          <p className="text-xs text-slate-500 mt-1">Audit events will appear as actions occur</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-4 font-mono text-xs overflow-x-auto space-y-2">
          {logs.map((log) => {
            const userName = log.user?.name || log.user?.email || 'System';
            const userRole = log.user?.adminRole || log.user?.role || log.role;
            return (
              <div
                key={log._id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition hover:bg-slate-100/70"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </span>

                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                    {log.action}
                  </span>

                  <span className="text-slate-900 font-bold">
                    {userName} <span className="text-[10px] text-purple-700">({userRole})</span>
                  </span>

                  <span className="text-slate-600">
                    Target: <span className="font-semibold text-slate-800">{log.targetType}</span>
                    {log.targetId && <span className="text-slate-400 ml-1">#{log.targetId.slice(-6)}</span>}
                  </span>

                  {log.details && (
                    <span className="text-slate-500 font-sans text-xs">
                      {log.details.reason ? `Reason: "${log.details.reason}"` : JSON.stringify(log.details)}
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 shrink-0">
                  IP: {log.ipAddress || '127.0.0.1'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
