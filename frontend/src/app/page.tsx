'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  CheckCheck,
  Eye,
  AlertTriangle,
  QrCode,
  Users,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/analytics');
      setAnalytics(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const stats = [
    {
      title: 'Total Outbound',
      value: analytics?.totalMessages ?? 0,
      icon: Send,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Delivered',
      value: analytics?.deliveredCount ?? 0,
      icon: CheckCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Read / Seen',
      value: analytics?.readCount ?? 0,
      icon: Eye,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      title: 'Failed',
      value: analytics?.failedCount ?? 0,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      title: 'Active Chats',
      value: analytics?.activeConversations ?? 0,
      icon: MessageSquare,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Queue Pending',
      value: analytics?.queueStats?.pending ?? 0,
      icon: Layers,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            WhatsApp Operations Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-device messaging and automated school workflows for Vivegaa CBSE.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/compose"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Send className="w-3.5 h-3.5" />
            Compose Message
          </Link>
          <Link
            href="/connections"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <QrCode className="w-3.5 h-3.5" />
            Connection QR
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 tracking-tight">
                  {s.title}
                </span>
                <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black text-slate-900">
                  {loading ? '-' : s.value.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/inbox"
          className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-xs transition"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
          </div>
          <h3 className="mt-4 text-sm font-bold text-slate-900">3-Column Live Inbox</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Directly communicate with parents, answer queries, view photos, voice notes and PDF attachments.
          </p>
        </Link>

        <Link
          href="/automation"
          className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-xs transition"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Layers className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition" />
          </div>
          <h3 className="mt-4 text-sm font-bold text-slate-900">School ERP Automation</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Event triggers for student absence, bus delays, homework assignments, and overdue fee reminders.
          </p>
        </Link>

        <Link
          href="/contacts"
          className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-xs transition"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
          </div>
          <h3 className="mt-4 text-sm font-bold text-slate-900">Parent Directory & Consent</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Manage student phone records, import parent contacts from CSV, and honor opt-in/opt-out preferences.
          </p>
        </Link>
      </div>
    </div>
  );
}
