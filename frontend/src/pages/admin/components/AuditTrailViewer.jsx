import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import { 
  ShieldCheck, Search, Filter, RefreshCw, Clock, 
  Terminal, User, Activity, Globe, Eye, X, CheckCircle, Copy
} from 'lucide-react';

const AuditTrailViewer = ({ setMessage }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit/');
      setLogs(res.data);
    } catch (err) {
      if (setMessage) {
        setMessage({
          type: 'error',
          text: err.response?.data?.detail || 'Failed to fetch audit trails'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (entityFilter !== 'ALL' && log.entity_type !== entityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchAction = log.action?.toLowerCase().includes(q);
        const matchActor = log.actor_name?.toLowerCase().includes(q);
        const matchEntity = log.entity_type?.toLowerCase().includes(q);
        const matchDetails = JSON.stringify(log.details || {}).toLowerCase().includes(q);
        if (!matchAction && !matchActor && !matchEntity && !matchDetails) return false;
      }
      return true;
    });
  }, [logs, entityFilter, search]);

  const getActionBadge = (action) => {
    if (action.includes('DEACTIVATED') || action.includes('DELETED')) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          {action}
        </span>
      );
    }
    if (action.includes('ACTIVATED') || action.includes('CREATED')) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {action}
        </span>
      );
    }
    if (action.includes('REASSIGNED') || action.includes('UPDATED')) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
        {action}
      </span>
    );
  };

  const handleCopyDetails = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Security Guarantee and Refresh */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">System Audit & Compliance Log</h3>
            <p className="text-xs text-slate-400">
              Immutable activity trail with automatic password & token sanitization
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by action, actor, details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Entity Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400">
            <Filter className="w-3 h-3" />
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none text-xs"
            >
              <option value="ALL">All Entities</option>
              <option value="USER">User Accounts</option>
              <option value="STUDENT">Students</option>
              <option value="TEACHER">Faculty</option>
              <option value="HOD">HODs</option>
              <option value="ASSIGNMENT">Assignments</option>
              <option value="DEPARTMENT">Departments</option>
              <option value="SECTION">Sections</option>
              <option value="SUBJECT">Subjects</option>
            </select>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Action Event</th>
                <th className="px-5 py-3.5">Entity</th>
                <th className="px-5 py-3.5">Details Summary</th>
                <th className="px-5 py-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      Loading audit logs...
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    No audit records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const detailsJson = typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '');
                  const detailsPreview = detailsJson.length > 50 ? detailsJson.slice(0, 50) + '...' : detailsJson;

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {log.actor_name || 'System / Batch'}
                        </div>
                        {log.ip_address && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                            <Globe className="w-3 h-3" />
                            {log.ip_address}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-300">
                          {log.entity_type}
                        </span>
                        {log.entity_id && (
                          <div className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]" title={log.entity_id}>
                            #{log.entity_id.slice(0, 8)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="text-xs font-mono text-slate-400 truncate bg-slate-950/40 px-2 py-1 rounded border border-slate-800/40">
                          {detailsPreview || 'No parameters'}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-white">Audit Event Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Action Event:</span>
                <span className="font-mono text-slate-200 font-medium">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Timestamp:</span>
                <span className="font-mono text-slate-200">{new Date(selectedLog.timestamp).toISOString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Actor:</span>
                <span className="text-slate-200 font-medium">{selectedLog.actor_name}</span>
                <span className="text-slate-500 font-mono text-[11px] block">{selectedLog.actor_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">IP Address:</span>
                <span className="font-mono text-slate-200">{selectedLog.ip_address || 'Internal (127.0.0.1)'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Entity Type:</span>
                <span className="text-slate-200 font-medium">{selectedLog.entity_type}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Entity ID:</span>
                <span className="font-mono text-slate-200 text-[11px]">{selectedLog.entity_id || 'N/A'}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400">Sanitized Event Metadata (JSON)</label>
                <button
                  type="button"
                  onClick={() => handleCopyDetails(JSON.stringify(selectedLog.details, null, 2))}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 transition-colors"
                >
                  {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy JSON'}
                </button>
              </div>
              <pre className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs font-mono text-indigo-200 max-h-60 overflow-y-auto whitespace-pre-wrap">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrailViewer;
