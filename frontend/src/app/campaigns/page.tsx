'use client';

import React, { useState } from 'react';
import { Megaphone, Plus, Users, Send, CheckCircle2, Calendar } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';

export default function CampaignsPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetGrade, setTargetGrade] = useState('ALL');
  const [message, setMessage] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/v1/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          targetFilter: { grade: targetGrade },
        }),
      });
      setStatusMsg('Campaign announcement created successfully!');
      setTitle('');
      setDescription('');
      setMessage('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Campaigns & Announcements</h1>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch announcements to specific classes, sections, or school-wide parent groups.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          {statusMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-emerald-600" />
          Create New School Announcement
        </h2>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Parent-Teacher Meeting Q2"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
              <select
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              >
                <option value="ALL">All Enrolled Classes (Whole School)</option>
                <option value="PRIMARY">Primary Classes (I - V)</option>
                <option value="MIDDLE">Middle School (VI - VIII)</option>
                <option value="SECONDARY">Secondary (IX - X)</option>
                <option value="SR_SECONDARY">Senior Secondary (XI - XII)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Internal Description / Memo</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="PTM scheduled for Oct 24th from 9 AM to 1 PM"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Broadcast WhatsApp Message</label>
            <textarea
              rows={5}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Dear Parent, you are cordially invited to attend the PTM..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              Schedule & Queue Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
