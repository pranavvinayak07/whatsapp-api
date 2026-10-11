'use client';

import React, { useState } from 'react';
import { MousePointerClick, Send, CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';

export default function InteractivePage() {
  const [recipient, setRecipient] = useState('');
  const [title, setTitle] = useState('Vivegaa School - Annual Sports Day Registration');
  const [body, setBody] = useState('Dear Parent, kindly confirm whether your child Rahul (Class VII-A) will participate in the 100m sprint and Relay races.');
  const [footer, setFooter] = useState('Physical Education Department');
  const [btn1, setBtn1] = useState('Confirm Participation');
  const [btn2, setBtn2] = useState('Decline');
  const [btn3, setBtn3] = useState('Request Exemption');
  const [status, setStatus] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/v1/messages/interactive', {
        method: 'POST',
        body: JSON.stringify({
          recipient,
          title,
          body,
          footer,
          buttons: [
            { id: '1', label: btn1 },
            { id: '2', label: btn2 },
            { id: '3', label: btn3 },
          ],
        }),
      });
      setStatus('Interactive message dispatched successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Interactive WhatsApp Messages</h1>
        <p className="text-xs text-slate-500 mt-1">
          Compose multi-button polls and action triggers with automated numbered-reply fallbacks.
        </p>

        <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Baileys Multi-Device Notice:</strong> Native interactive buttons may be restricted or unsupported by official WhatsApp clients on non-business numbers. The system automatically transmits a numbered fallback menu (e.g. &ldquo;Reply 1 for Confirm, 2 for Decline&rdquo;), which reliably triggers automated reply handlers across all phones.
          </p>
        </div>

        {status && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
            {status}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Phone</label>
              <input
                type="text"
                required
                placeholder="+91 98765 43210"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Header Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Body Text</label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Action Choices</label>
              <input
                type="text"
                value={btn1}
                onChange={(e) => setBtn1(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                value={btn2}
                onChange={(e) => setBtn2(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                value={btn3}
                onChange={(e) => setBtn3(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Dispatch Interactive Notice
            </button>
          </form>

          {/* Right: Live Preview */}
          <div className="bg-slate-100/70 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Recipient WhatsApp Preview
              </h3>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs leading-relaxed">
                <p className="font-bold text-slate-900">*{title}*</p>
                <p className="text-slate-700 whitespace-pre-wrap">{body}</p>

                <div className="pt-2 border-t border-slate-100 text-slate-600 space-y-1 font-mono text-[11px]">
                  <p className="text-[10px] text-slate-400 font-sans">Reply with the number of your choice:</p>
                  <p><strong>1</strong> - {btn1}</p>
                  <p><strong>2</strong> - {btn2}</p>
                  <p><strong>3</strong> - {btn3}</p>
                </div>

                <p className="text-[10px] text-slate-400 italic pt-1">{footer}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center mt-4">
              Parents can reply with either 1, 2, or 3 from any WhatsApp client without compatibility errors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
