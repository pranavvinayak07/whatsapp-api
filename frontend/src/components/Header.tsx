'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Wifi, WifiOff, LogOut, ShieldCheck } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<string>('CHECKING');
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    if (pathname === '/login') return;
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const data = await apiRequest<{ status: string; phoneNumber: string | null }>('/api/connection/summary', { cache: 'no-store' });
        if (active) { setStatus(data.status); setPhone(data.phoneNumber); }
      } catch {
        if (active) { setStatus('STATUS UNAVAILABLE'); setPhone(null); }
      } finally { pending = false; }
    };
    void refresh();
    const timer = setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    window.location.href = '/login?logout=true';
  };

  if (pathname === '/login') return null;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-base font-bold text-slate-800 tracking-tight">
          Vivegaa School CBSE WhatsApp Gateway
        </h2>
        <span className="hidden md:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          Independent Node Service
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* WhatsApp Connection Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            status === 'CONNECTED'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : status === 'QR_REQUIRED' || status === 'RECONNECTING'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {status === 'CONNECTED' ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" />
          )}
          <span>{status}</span>
          {phone && <span className="font-mono text-[11px] opacity-80">({phone})</span>}
        </div>

        {/* User Pill & Logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">Admin User</p>
              <p className="text-[10px] text-slate-400 font-medium">SUPER_ADMIN</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
