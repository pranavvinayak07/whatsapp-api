'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, CheckCheck, Eye, AlertTriangle, Send } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState('7D');

  useEffect(() => {
    apiRequest('/api/analytics').then(setData).catch(() => {});
  }, []);

  const total = data?.totalMessages || 0;
  const delivered = data?.deliveredCount || 0;
  const read = data?.readCount || 0;
  const failed = data?.failedCount || 0;

  const deliveryRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : '100';
  const readRate = delivered > 0 ? ((read / delivered) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Delivery Performance & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Auditable transmission statistics based on actual network receipts and delivery acks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['Today', '7D', '30D', 'All'].map((t) => (
            <button
              key={t}
              onClick={() => setTimeRange(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                timeRange === t
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Ratios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Overall Delivery Rate</span>
            <CheckCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-3">{deliveryRate}%</p>
          <p className="text-[11px] text-slate-400 mt-1">Confirmed received on parents&apos; devices</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Read / Open Rate</span>
            <Eye className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-3">{readRate}%</p>
          <p className="text-[11px] text-slate-400 mt-1">Blue checkmark verified by recipient</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Failure Rate</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-3">
            {total > 0 ? ((failed / total) * 100).toFixed(1) : '0'}%
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Unregistered numbers or network drop</p>
        </div>
      </div>

      {/* Visual Funnel Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
        <h3 className="text-sm font-bold text-slate-900">Message Lifecycle Funnel</h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-700">1. Total Messages Dispatched</span>
              <span className="text-slate-900 font-mono">{total}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-700">2. Confirmed Delivered</span>
              <span className="text-slate-900 font-mono">{delivered}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(100, (delivered / (total || 1)) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-700">3. Verified Read</span>
              <span className="text-slate-900 font-mono">{read}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full"
                style={{ width: `${Math.min(100, (read / (total || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 italic">
          Note: If a recipient has WhatsApp Read Receipts disabled in privacy settings, delivery status is displayed as DELIVERED without fabricating read confirmation.
        </p>
      </div>
    </div>
  );
}
