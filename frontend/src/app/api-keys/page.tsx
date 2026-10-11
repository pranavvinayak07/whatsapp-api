'use client';

import React, { useEffect, useState } from 'react';
import { KeyRound, Plus, Copy, CheckCircle2, ShieldCheck, Code2, Webhook } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';

export default function ApiKeysPage() {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [keys, setKeys] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const data = await apiRequest<any[]>('/api/api-keys');
      setKeys(data);
    } catch (err: any) { setFeedback(err.message); }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await apiRequest<any>('/api/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: keyName }),
      });
      setGeneratedKey(res.apiKey);
      setShowModal(false);
      setKeyName('');
      fetchKeys();
    } catch (err: any) {
      setFeedback(err.message);
    } finally { setBusy(false); }
  };

  const changeKey = async (id: string, replace: boolean) => {
    if (!confirm(replace ? 'Replace this secret? The old secret will stop working immediately.' : 'Delete this key? Integrations using it will stop working.')) return;
    setBusy(true);
    try {
      const result = await apiRequest<{ apiKey?: string }>(`/api/api-keys/${id}${replace ? '/rotate' : ''}`, { method: replace ? 'POST' : 'DELETE' });
      setGeneratedKey(result.apiKey || null);
      setFeedback(replace ? 'Secret replaced. Copy the new value below.' : 'Key deleted.');
      await fetchKeys();
    } catch (err: any) { setFeedback(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">API Integration & Scoped Keys</h1>
          <p className="text-xs text-slate-500 mt-1">
            Secure REST API access credentials for connecting the Vivegaa School ERP backend.
          </p>
        </div>

        <button
          onClick={() => {
            setFeedback('');
            setShowModal(true);
            setGeneratedKey(null);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Generate API Key
        </button>
      </div>

      <p className="text-sm text-slate-600">Secrets are shown once at creation. If you lost a secret, use Replace secret and update your integration.</p>
      {feedback && <p role="status" className="p-3 bg-slate-100 rounded-xl">{feedback}</p>}
      {/* Generated Key Alert */}
      {generatedKey && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            New Scoped API Key Generated
          </div>
          <p className="text-xs text-emerald-700">
            Please copy this key now. For security purposes, it will never be displayed in plaintext again.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              readOnly
              aria-label="New API key secret"
              value={generatedKey}
              className="flex-1 p-2.5 font-mono text-xs rounded-xl border border-emerald-300 bg-white text-slate-900 font-bold"
            />
            <button
              onClick={async () => { try { await navigator.clipboard.writeText(generatedKey); setFeedback('Copied.'); } catch { setFeedback('Copy unavailable. Select and copy the secret manually.'); } }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="p-4">Key Identifier</th>
              <th className="p-4">Prefix</th>
              <th className="p-4">Scopes</th>
              <th className="p-4">Last Used</th>
              <th className="p-4">Created Date</th><th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No API keys registered.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{k.name}</td>
                  <td className="p-4 font-mono text-slate-600">{k.keyPrefix}...</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {k.scopes?.join(', ')}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">{k.lastUsedAt ? formatDateTime(k.lastUsedAt) : 'Never'}</td>
                  <td className="p-4 text-slate-500">{formatDateTime(k.createdAt)}</td>
                  <td className="p-4 space-y-2">
                    <button disabled={busy || k.isRevoked} onClick={() => changeKey(k.id, true)} className="block text-emerald-700 disabled:opacity-50">Replace secret</button>
                    <button disabled={busy} onClick={() => changeKey(k.id, false)} className="block text-rose-700 disabled:opacity-50">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Code Snippet Example */}
      <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
          <Code2 className="w-4 h-4" />
          cURL Example: Transmitting Absent Alert from Vivegaa ERP
        </div>
        <pre className="text-[11px] font-mono overflow-x-auto text-slate-300 p-4 bg-slate-950/60 rounded-xl leading-relaxed">
{`curl -X POST https://whatsapp.vivegaaerp.in/api/v1/automation/events \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: vw_live_xxxxxxxxxxxxxxxxxxxxxxxx" \\
  -d '{
    "triggerType": "ATTENDANCE_ABSENT",
    "studentId": "VIV-2026-084",
    "variables": {
      "student_name": "Arjun Kumar",
      "class": "8",
      "section": "A",
      "date": "11-Oct-2026"
    }
  }'`}
        </pre>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div role="dialog" aria-modal="true" aria-label="Generate API key" className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-lg">
            <h3 className="text-base font-bold text-slate-900 mb-4">Generate Scoped API Key</h3>
            {feedback && <p role="alert" className="text-sm text-rose-700 mb-3">{feedback}</p>}
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Key Name / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ERP Attendance Service Key"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Create Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
