'use client';

import React, { useState } from 'react';
import { Settings, Shield, Sliders, Save, Database, HardDrive } from 'lucide-react';

export default function SettingsPage() {
  const [defaultCountryCode, setDefaultCountryCode] = useState('91');
  const [maxPerMinute, setMaxPerMinute] = useState('20');
  const [requireConsent, setRequireConsent] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Configuration & Policies</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure transmission throttles, international phone formatting, and consent rules.
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          System settings updated successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            Rate Limiting & Safety Parameters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Phone Country Code
              </label>
              <input
                type="text"
                value={defaultCountryCode}
                onChange={(e) => setDefaultCountryCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">Default 91 for India</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Messages Per Minute Throttling
              </label>
              <input
                type="number"
                value={maxPerMinute}
                onChange={(e) => setMaxPerMinute(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Throttles bulk queue dispatch to prevent WhatsApp anti-spam bans
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireConsent}
                onChange={(e) => setRequireConsent(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900">Enforce Strict Recipient Consent</span>
                <p className="text-[11px] text-slate-500">
                  Blocks automatic school alerts if a contact has explicit OPTED_OUT status
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
