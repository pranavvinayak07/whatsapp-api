'use client';

import React, { useState } from 'react';
import { Users2, Send, MessageSquare } from 'lucide-react';

const MOCK_GROUPS = [
  { id: '1', name: 'Vivegaa Staff Common Room', jid: '120363028371829@g.us', members: 42, type: 'Staff' },
  { id: '2', name: 'Class X-A Parent Advisory', jid: '120363028371999@g.us', members: 38, type: 'Parents' },
  { id: '3', name: 'School Transport & Bus Drivers', jid: '120363028371555@g.us', members: 16, type: 'Transport' },
];

export default function GroupsPage() {
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [text, setText] = useState('');
  const [sentMsg, setSentMsg] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selectedGroup) return;
    setSentMsg(true);
    setTimeout(() => {
      setSentMsg(false);
      setText('');
    }, 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">WhatsApp Groups Hub</h1>
          <p className="text-xs text-slate-500 mt-1">
            Broadcast messages and announcements to official school staff and class parent groups.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Groups List */}
        <div className="space-y-3">
          {MOCK_GROUPS.map((g) => {
            const isSelected = selectedGroup?.id === g.id;
            return (
              <div
                key={g.id}
                onClick={() => setSelectedGroup(g)}
                className={`p-5 rounded-2xl border cursor-pointer transition ${
                  isSelected
                    ? 'bg-emerald-50/60 border-emerald-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{g.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    {g.type}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span className="font-mono">{g.jid}</span>
                  <span>{g.members} participants</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Message Dispatcher */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Broadcast to {selectedGroup ? selectedGroup.name : 'Selected Group'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {selectedGroup
                ? `Will be transmitted to all ${selectedGroup.members} participants simultaneously.`
                : 'Please select a WhatsApp group from the left panel.'}
            </p>

            {sentMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold mb-4">
                Message successfully broadcast to group!
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-4">
              <textarea
                rows={6}
                disabled={!selectedGroup}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your official group notification here..."
                className="w-full p-4 rounded-xl border border-slate-200 text-xs disabled:bg-slate-50"
              />

              <button
                type="submit"
                disabled={!selectedGroup || !text.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Send Group Announcement</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
