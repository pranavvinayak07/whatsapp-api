'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  QrCode,
  Inbox,
  Send,
  Users,
  Users2,
  FileText,
  MousePointerClick,
  Megaphone,
  Clock,
  Sparkles,
  FolderOpen,
  History,
  KeyRound,
  BarChart3,
  UserCog,
  Settings,
  ScrollText,
  MessageSquare,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'WhatsApp Connections', href: '/connections', icon: QrCode },
  { name: 'API Reference & Keys', href: '/api-keys', icon: KeyRound },
  { name: 'Compose Message', href: '/compose', icon: Send },
  { name: 'Message History', href: '/history', icon: History },
  { name: 'Live Inbox', href: '/inbox', icon: Inbox },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Groups', href: '/groups', icon: Users2 },
  { name: 'Message Templates', href: '/templates', icon: FileText },
  { name: 'Interactive Messages', href: '/interactive', icon: MousePointerClick },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'User Management', href: '/users', icon: UserCog },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'System Logs', href: '/logs', icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();

  // Hide sidebar on login page
  if (pathname === '/login') return null;

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col flex-shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white shadow-sm">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-sm tracking-tight leading-tight">Vivegaa WhatsApp</h1>
          <p className="text-[11px] text-slate-400 font-medium">CBSE Operations Hub</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-100/60 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-medium">Core Version</span>
          <span className="text-slate-700 font-bold">1.0 Production</span>
        </div>
        <div className="flex items-center justify-between text-[11px] mt-1">
          <span className="text-slate-500 font-medium">Provider</span>
          <span className="text-emerald-700 font-semibold">Baileys Self-Hosted</span>
        </div>
      </div>
    </aside>
  );
}
