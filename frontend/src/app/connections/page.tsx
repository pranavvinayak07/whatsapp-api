'use client';

import React, { useEffect, useState } from 'react';
import {
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  Power,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';

export default function ConnectionsPage() {
  const [status, setStatus] = useState<any>({
    status: 'DISCONNECTED',
    phoneNumber: null,
    qrCode: null,
    reconnectAttempts: 0,
  });
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await apiRequest('/api/connection/status');
      setStatus(data);
    } catch {}
  };

  useEffect(() => {
    fetchStatus();

    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events/sse');
      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'status') {
            setStatus((prev: any) => ({ ...prev, ...event.payload }));
          } else if (event.type === 'qr') {
            setStatus((prev: any) => ({ ...prev, qrCode: event.payload.qrCode, status: 'QR_REQUIRED' }));
          }
        } catch {}
      };
    } catch {}

    return () => {
      es?.close();
    };
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setActionMsg('Initiating WhatsApp connection...');
    try {
      await apiRequest('/api/connection/connect', { method: 'POST' });
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setActionMsg('Disconnecting WhatsApp session...');
    try {
      await apiRequest('/api/connection/disconnect', { method: 'POST' });
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out and clear WhatsApp pairing keys? You will need to re-scan the QR code.')) return;
    setLoading(true);
    setActionMsg('Logging out and wiping auth keys...');
    try {
      await apiRequest('/api/connection/logout', { method: 'POST' });
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isConnected = status.status === 'CONNECTED';
  const isQrRequired = status.status === 'QR_REQUIRED';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">WhatsApp Connection</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage multi-device Baileys WhatsApp Web credentials and pairing states.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStatus}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Power className="w-3.5 h-3.5" />
              {loading ? 'Connecting...' : 'Connect Line'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
            >
              <WifiOff className="w-3.5 h-3.5" />
              Disconnect
            </button>
          )}
          <button
            onClick={handleLogout}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout Device
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
          {actionMsg}
        </div>
      )}

      {/* Main Connection Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: QR or Active Device Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs flex flex-col items-center justify-center text-center">
          {isConnected ? (
            <div className="space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">WhatsApp Line Active</h2>
              <p className="text-xs text-slate-500">
                Connected and ready to transmit school notices, homework assignments and automated alerts.
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 inline-block font-mono text-sm font-bold text-slate-800">
                {status.phoneNumber || 'Phone Number Synced'}
              </div>
            </div>
          ) : isQrRequired && status.qrCode ? (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center justify-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-600" />
                Scan QR Code with WhatsApp
              </h2>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 inline-block shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={status.qrCode} alt="WhatsApp QR Code" className="w-64 h-64 mx-auto rounded-lg" />
              </div>
              <p className="text-[11px] text-slate-400">
                QR refreshes automatically. Scan within 30 seconds.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <WifiOff className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Connection Inactive</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click &quot;Connect Line&quot; above to initialize Baileys multi-device pairing and generate a QR code.
              </p>
            </div>
          )}
        </div>

        {/* Right: Setup Instructions & Diagnostics */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              How to Link School Device
            </h3>
            <ol className="space-y-3 text-xs text-slate-600 list-decimal list-inside font-medium leading-relaxed">
              <li>Open WhatsApp on the designated school mobile phone.</li>
              <li>Tap <strong>Settings</strong> (iOS) or <strong>Three Dots</strong> (Android).</li>
              <li>Select <strong>Linked Devices</strong>.</li>
              <li>Tap <strong>Link a Device</strong> and point your camera at the QR code.</li>
              <li>Once paired, the status turns <strong>CONNECTED</strong> with session keys saved in Docker volume.</li>
            </ol>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Session Persistence & Security
            </h3>
            <div className="space-y-2 text-xs text-slate-500 leading-relaxed">
              <p>
                <strong>Volume Storage:</strong> Credentials persist at <code>/app/auth</code>. Server reboots or Coolify container restarts preserve the authenticated connection without requiring re-scan.
              </p>
              <p>
                <strong>Reconnection Guard:</strong> Uses bounded exponential backoff (max 5 tries) to prevent infinite loops if the phone is offline.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
