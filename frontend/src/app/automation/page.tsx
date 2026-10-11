'use client';

import React, { useState } from 'react';
import { Sparkles, ToggleLeft, ToggleRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

const INITIAL_RULES = [
  {
    id: '1',
    name: 'Automatic Absence WhatsApp Alert',
    trigger: 'ATTENDANCE_ABSENT',
    template: 'Student Absent Notification',
    enabled: true,
    description: 'Triggered when a student is marked absent in the Vivegaa ERP Daily Attendance module.',
  },
  {
    id: '2',
    name: 'Fee Payment Pending Reminder',
    trigger: 'FEE_REMINDER',
    template: 'Fee Payment Pending Reminder',
    enabled: true,
    description: 'Dispatched to parents 3 days before fee installment due date.',
  },
  {
    id: '3',
    name: 'School Bus Delay Notification',
    trigger: 'BUS_DELAY',
    template: 'School Bus Delay Alert',
    enabled: true,
    description: 'Triggered by transport in-charge when a bus route faces traffic or breakdown delays.',
  },
  {
    id: '4',
    name: 'Daily Homework Summary',
    trigger: 'HOMEWORK_NOTIFICATION',
    template: 'Homework Assignment',
    enabled: true,
    description: 'Sent to parents at 4:30 PM summarizing homework assigned by teachers.',
  },
];

export default function AutomationPage() {
  const [rules, setRules] = useState(INITIAL_RULES);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">School Event Automation Engine</h1>
          <p className="text-xs text-slate-500 mt-1">
            Event-driven rules linking Vivegaa ERP business events directly to WhatsApp notifications.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-100">
                  {rule.trigger}
                </span>
                <span className="text-xs font-bold text-slate-900">{rule.name}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{rule.description}</p>
              <p className="text-[11px] text-slate-400">
                Linked Template: <strong className="text-slate-700">{rule.template}</strong>
              </p>
            </div>

            <button
              onClick={() => toggleRule(rule.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                rule.enabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${rule.enabled ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{rule.enabled ? 'Rule Enabled' : 'Disabled'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
