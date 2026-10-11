'use client';

import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  Plus,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Code2,
  Send,
  Image as ImageIcon,
  FileText,
  Video,
  Mic,
  MapPin,
  User,
  MousePointerClick,
  Layers,
  Check,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';

export default function ApiKeysPage() {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [keys, setKeys] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('TEXT');
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchKeys = async () => {
    try {
      const data = await apiRequest<any[]>('/api/api-keys');
      setKeys(data);
    } catch (err: any) {
      setFeedback(err.message);
    }
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
    } finally {
      setBusy(false);
    }
  };

  const changeKey = async (id: string, replace: boolean) => {
    if (
      !confirm(
        replace
          ? 'Replace this secret? The old secret will stop working immediately.'
          : 'Delete this key? Integrations using it will stop working.'
      )
    )
      return;
    setBusy(true);
    try {
      const result = await apiRequest<{ apiKey?: string }>(
        `/api/api-keys/${id}${replace ? '/rotate' : ''}`,
        { method: replace ? 'POST' : 'DELETE' }
      );
      setGeneratedKey(result.apiKey || null);
      setFeedback(
        replace
          ? 'Secret replaced. Copy the new value below.'
          : 'Key deleted.'
      );
      await fetchKeys();
    } catch (err: any) {
      setFeedback(err.message);
    } finally {
      setBusy(false);
    }
  };

  const activeKeySample = generatedKey || (keys[0]?.keyPrefix ? `${keys[0].keyPrefix}••••••••••••••••••••••••` : 'vw_live_xxxxxxxxxxxxxxxxxxxxxxxx');

  const API_DOCS: Record<
    string,
    {
      title: string;
      endpoint: string;
      method: string;
      desc: string;
      icon: any;
      payload: any;
    }
  > = {
    TEXT: {
      title: 'Text Message',
      endpoint: '/api/v1/send/text',
      method: 'POST',
      desc: 'Send individual plain or formatted WhatsApp text message (supports emoji, bold, italics, links).',
      icon: Send,
      payload: {
        recipient: '919842423333',
        message: 'Dear Parent, School will remain closed on Friday for Sports Day preparations.',
      },
    },
    IMAGE: {
      title: 'Image with Caption',
      endpoint: '/api/v1/send/image',
      method: 'POST',
      desc: 'Send high-resolution photo or poster with an optional descriptive caption.',
      icon: ImageIcon,
      payload: {
        recipient: '919842423333',
        mediaUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200',
        caption: 'Annual Sports Meet 2026 Poster - Vivegaa Senior Secondary School',
      },
    },
    DOCUMENT: {
      title: 'Document / PDF',
      endpoint: '/api/v1/send/document',
      method: 'POST',
      desc: 'Transmit official school PDF circulars, hall tickets, fee receipts, or report cards.',
      icon: FileText,
      payload: {
        recipient: '919842423333',
        mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileName: 'Vivegaa_Academic_Circular_2026.pdf',
        caption: 'Please find attached the official circular regarding Term 2 examinations.',
      },
    },
    VIDEO: {
      title: 'Video',
      endpoint: '/api/v1/send/video',
      method: 'POST',
      desc: 'Deliver MP4 video clips of school celebrations, instructional videos, or notices.',
      icon: Video,
      payload: {
        recipient: '919842423333',
        mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        caption: 'Vivegaa School Science Exhibition Highlights 2026',
      },
    },
    AUDIO: {
      title: 'Voice / Audio',
      endpoint: '/api/v1/send/audio',
      method: 'POST',
      desc: 'Send official audio announcements or PTT voice notes directly to parents.',
      icon: Mic,
      payload: {
        recipient: '919842423333',
        mediaUrl: 'https://actions.google.com/sounds/v1/emergency/emergency_siren_short.ogg',
        isVoiceNote: true,
      },
    },
    LOCATION: {
      title: 'Location Pin',
      endpoint: '/api/v1/send/location',
      method: 'POST',
      desc: 'Share campus GPS coordinates, bus pickup points, or event venues directly on WhatsApp map.',
      icon: MapPin,
      payload: {
        recipient: '919842423333',
        latitude: 11.0168,
        longitude: 76.9558,
        name: 'Vivegaa Senior Secondary School',
        address: 'Dharapuram Road, Tirupur, Tamil Nadu 641608',
      },
    },
    CONTACT: {
      title: 'Contact Card',
      endpoint: '/api/v1/send/contact',
      method: 'POST',
      desc: 'Send a clickable vCard contact for school administration, transport helpline, or class teachers.',
      icon: User,
      payload: {
        recipient: '919842423333',
        fullName: 'Vivegaa School Administration',
        phoneNumber: '+919842423333',
        organization: 'Vivegaa Senior Secondary School (CBSE)',
      },
    },
    INTERACTIVE: {
      title: 'Interactive Buttons',
      endpoint: '/api/v1/send/interactive',
      method: 'POST',
      desc: 'Send actionable message with button choices (e.g., Gate Pass Approval, Parent Consent, Event RSVP).',
      icon: MousePointerClick,
      payload: {
        recipient: '919842423333',
        title: 'Student Gate Pass Verification',
        body: 'Arjun Kumar (Class 8-A) is requesting exit for Medical Checkup. Please confirm your authorization.',
        footer: 'Vivegaa Campus Security System',
        buttons: [
          { id: '1', label: 'Authorize Exit' },
          { id: '2', label: 'Decline Request' },
        ],
      },
    },
    UNIFIED: {
      title: 'Unified /send Route',
      endpoint: '/api/v1/send',
      method: 'POST',
      desc: 'Single unified endpoint supporting any message type (TEXT, IMAGE, DOCUMENT, VIDEO, AUDIO, LOCATION, CONTACT, INTERACTIVE).',
      icon: Layers,
      payload: {
        recipient: '919842423333',
        type: 'TEXT',
        message: 'Notification sent via unified endpoint.',
      },
    },
  };

  const currentDoc = API_DOCS[selectedEndpoint] || API_DOCS.TEXT;

  const curlSnippet = `curl -X POST https://whatsapp.vivegaaerp.in${currentDoc.endpoint} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${activeKeySample}" \\
  -d '${JSON.stringify(currentDoc.payload, null, 2)}'`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(curlSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            REST API Integration & Sending Endpoints
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Direct, reliable programmatic endpoints for Text, Media, Documents, Voice Notes, Locations, Contacts & Interactive Messages.
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

      {feedback && (
        <p role="status" className="p-3 bg-slate-100 rounded-xl text-xs text-slate-700">
          {feedback}
        </p>
      )}

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
              onClick={() => {
                navigator.clipboard.writeText(generatedKey);
                alert('API Key copied to clipboard!');
              }}
              className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Active API Keys Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Registered API Credentials</h2>
          <span className="text-[11px] text-slate-500 font-mono">Header: X-API-Key</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="p-4">Key Name</th>
              <th className="p-4">Prefix</th>
              <th className="p-4">Permissions</th>
              <th className="p-4">Last Activity</th>
              <th className="p-4">Created Date</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No API keys registered yet. Click &quot;Generate API Key&quot; above to create one.
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
                  <td className="p-4 text-slate-500">
                    {k.lastUsedAt ? formatDateTime(k.lastUsedAt) : 'Never'}
                  </td>
                  <td className="p-4 text-slate-500">{formatDateTime(k.createdAt)}</td>
                  <td className="p-4 space-x-3">
                    <button
                      disabled={busy || k.isRevoked}
                      onClick={() => changeKey(k.id, true)}
                      className="text-emerald-700 font-semibold hover:underline disabled:opacity-50"
                    >
                      Rotate
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => changeKey(k.id, false)}
                      className="text-rose-700 font-semibold hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── INTERACTIVE API ENDPOINT REFERENCE & cURL CODE GENERATOR ─── */}
      <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Programmatic API Sending Functions</h2>
              <p className="text-xs text-slate-400">
                Select a message type below to inspect parameters and copy live production cURL commands.
              </p>
            </div>
          </div>

          <button
            onClick={copyToClipboard}
            className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCode ? 'Copied cURL!' : 'Copy cURL Command'}</span>
          </button>
        </div>

        {/* Function Selector Tabs */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(API_DOCS).map(([key, doc]) => {
            const Icon = doc.icon;
            const isSelected = selectedEndpoint === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedEndpoint(key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{doc.title}</span>
              </button>
            );
          })}
        </div>

        {/* Endpoint Details Card */}
        <div className="bg-slate-950/80 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {currentDoc.method}
            </span>
            <span className="font-mono text-xs text-slate-200 font-bold">
              https://whatsapp.vivegaaerp.in{currentDoc.endpoint}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {currentDoc.desc}
          </p>
        </div>

        {/* Code Snippet Box */}
        <div className="relative">
          <pre className="text-xs font-mono overflow-x-auto text-emerald-300 p-5 bg-slate-950 rounded-2xl border border-slate-800/80 leading-relaxed">
            {curlSnippet}
          </pre>
        </div>
      </div>

      {/* Modal: Generate API Key */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Generate API key"
            className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-base font-bold text-slate-900 mb-1">Generate Scoped API Key</h3>
            <p className="text-xs text-slate-500 mb-4">
              Create an authentication secret for server-to-server WhatsApp transmissions.
            </p>
            {feedback && <p role="alert" className="text-xs text-rose-700 mb-3">{feedback}</p>}
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Name / Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ERP WhatsApp Sender Service"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
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
