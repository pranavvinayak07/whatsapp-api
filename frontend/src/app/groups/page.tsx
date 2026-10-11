'use client';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api-client';

type Group = { id: string; name: string; members: number; canSend: boolean };
export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selected = groups.find(group => group.id === selectedId);
  async function loadGroups() {
    setLoading(true); setError('');
    try { setGroups(await apiRequest<Group[]>('/api/groups')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load groups.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadGroups(); }, []);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || sending || !text.trim()) return;
    const name = selected.name;
    setSending(true); setError(''); setNotice('');
    try {
      const result = await apiRequest<{ warning?: string }>(`/api/groups/${encodeURIComponent(selected.id)}/messages`, {
        method: 'POST', body: JSON.stringify({ text }),
      });
      setNotice(result.warning || `Message sent to ${name}.`); setText('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to send.'); }
    finally { setSending(false); }
  }
  return <div className="max-w-5xl mx-auto space-y-6">
    <div className="bg-white border rounded-2xl p-6 flex justify-between gap-4">
      <div><h1 className="text-xl font-bold">WhatsApp Groups</h1><p className="text-sm text-slate-500 mt-2">Post a message inside a group that your connected WhatsApp account belongs to.</p></div>
      <button disabled={loading || sending} onClick={loadGroups} className="text-emerald-700 disabled:opacity-50">Refresh groups</button>
    </div>
    {error && <p role="alert" className="bg-rose-50 text-rose-800 p-4 rounded-xl">{error}</p>}
    {notice && <p role="status" className="bg-emerald-50 text-emerald-800 p-4 rounded-xl">{notice}</p>}
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-3">
        {loading ? <p role="status">Loading groups…</p> : groups.length === 0 && !error ? <p>No groups found. Join a group with the connected phone, then refresh.</p> : null}
        {groups.map(group => <button key={group.id} disabled={sending} aria-pressed={selectedId === group.id} onClick={() => { setSelectedId(group.id); setNotice(''); }} className={`block w-full text-left border rounded-xl p-4 ${selectedId === group.id ? 'bg-emerald-50 border-emerald-500' : 'bg-white'}`}>
          <span className="block font-semibold">{group.name}</span><span className="text-xs text-slate-500">{group.members} members{!group.canSend ? ' · Only group admins can post' : ''}</span>
        </button>)}
      </div>
      <form onSubmit={send} className="bg-white rounded-2xl border p-6 space-y-4">
        <h2 className="font-semibold">{selected ? `Message ${selected.name}` : 'Select a group'}</h2>
        <label htmlFor="group-message" className="block text-sm">Group message</label>
        <textarea id="group-message" required maxLength={10000} rows={7} disabled={!selected?.canSend || sending} value={text} onChange={event => setText(event.target.value)} className="w-full border rounded-xl p-3 disabled:bg-slate-50" />
        <p className="text-xs text-slate-500">This posts one message in the selected group.</p>
        <button disabled={!selected?.canSend || !text.trim() || sending || loading} className="w-full rounded-xl bg-emerald-600 text-white p-3 disabled:opacity-50">{sending ? 'Sending…' : 'Send to group'}</button>
      </form>
    </div>
  </div>;
}
