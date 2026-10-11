'use client';

import React, { useEffect, useState } from 'react';
import { History, Search, Check, CheckCheck, Clock, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';

function formatPhone(jid?: string) {
  if (!jid) return '—';
  if (jid === 'self') return 'Connected WhatsApp';
  const clean = jid.split('@')[0].split(':')[0];
  return clean.startsWith('+') ? clean : `+${clean}`;
}

export default function MessageHistoryPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<any>('/api/v1/messages?limit=50');
      setMessages(res.messages || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filtered = messages.filter((m) => {
    if (statusFilter === 'ALL') return true;
    return m.status === statusFilter;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Message Transmission History</h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete audit trail of inbound messages and outbound API transmissions with verified phone numbers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'SENT', 'DELIVERED', 'READ', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Direction</th>
                <th className="p-4">Sender Phone</th>
                <th className="p-4">Recipient Phone</th>
                <th className="p-4">Type</th>
                <th className="p-4">Content Preview</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No message history records found.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 text-slate-500">{formatDateTime(m.createdAt)}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.direction === 'OUTBOUND'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        {m.direction}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-800">
                      {formatPhone(m.senderJid)}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-800">
                      {formatPhone(m.recipientJid)}
                    </td>
                    <td className="p-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-mono font-bold text-slate-700">
                        {m.messageType}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 max-w-xs truncate">{m.textContent || '[Attachment / Media]'}</td>
                    <td className="p-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'READ'
                            ? 'bg-cyan-50 text-cyan-700'
                            : m.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : m.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {m.status === 'READ' || m.status === 'DELIVERED' ? (
                          <CheckCheck className="w-3 h-3" />
                        ) : m.status === 'SENT' ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {m.status}
                      </span>
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
