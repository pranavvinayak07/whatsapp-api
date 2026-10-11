'use client';

import React, { useEffect, useState } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';

export default function ScheduledQueuePage() {
  const [data, setData] = useState<any>({ stats: {}, jobs: [] });
  const [loading, setLoading] = useState(false);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<any>('/api/queue');
      setData(res);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTogglePause = async () => {
    try {
      await apiRequest('/api/queue/toggle-pause', { method: 'POST' });
      fetchQueue();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await apiRequest(`/api/queue/${id}/retry`, { method: 'POST' });
      fetchQueue();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const stats = data.stats || {};
  const isPaused = stats.isPaused;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Durable PostgreSQL Message Queue</h1>
          <p className="text-xs text-slate-500 mt-1">
            ACID-compliant queue engine with rate throttling, exponential backoff, and idempotency protection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchQueue}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleTogglePause}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
              isPaused
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Processing' : 'Pause Dispatching'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Pending</span>
          <p className="text-2xl font-black text-amber-600 mt-2">{stats.pending ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Processing</span>
          <p className="text-2xl font-black text-blue-600 mt-2">{stats.processing ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Successfully Sent</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{stats.sent ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Failed (Dead Letter)</span>
          <p className="text-2xl font-black text-rose-600 mt-2">{stats.failed ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Engine Status</span>
          <p className={`text-sm font-bold mt-3 ${isPaused ? 'text-amber-600' : 'text-emerald-600'}`}>
            {isPaused ? 'PAUSED' : 'ACTIVE DISPATCH'}
          </p>
        </div>
      </div>

      {/* Queue Jobs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-4">Recipient</th>
                <th className="p-4">Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Retries</th>
                <th className="p-4">Next Run / Scheduled</th>
                <th className="p-4">Last Error</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {(data.jobs || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No queued jobs at this time.
                  </td>
                </tr>
              ) : (
                data.jobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900">{job.recipientPhone}</td>
                    <td className="p-4 text-slate-600">{job.messageType}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          job.status === 'SENT'
                            ? 'bg-emerald-50 text-emerald-700'
                            : job.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700'
                            : job.status === 'PROCESSING'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-mono">{job.priority}</td>
                    <td className="p-4 text-slate-600 font-mono">{job.retryCount}/{job.maxRetries}</td>
                    <td className="p-4 text-slate-500">{formatDateTime(job.nextRunAt)}</td>
                    <td className="p-4 text-rose-600 max-w-xs truncate">{job.lastError || '-'}</td>
                    <td className="p-4 text-right">
                      {job.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(job.id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ml-auto"
                        >
                          <RotateCw className="w-3 h-3" />
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
