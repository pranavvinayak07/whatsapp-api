'use client';

import React, { useState } from 'react';
import {
  Send,
  FileText,
  Image as ImageIcon,
  Video,
  Mic,
  MapPin,
  User,
  MousePointerClick,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';

export default function ComposePage() {
  const [activeTab, setActiveTab] = useState<string>('TEXT');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [fileName, setFileName] = useState('');
  const [latitude, setLatitude] = useState('11.0168');
  const [longitude, setLongitude] = useState('76.9558');
  const [locName, setLocName] = useState('Vivegaa School CBSE');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [buttonTitle, setButtonTitle] = useState('Fee Payment Notice');
  const [buttonBody, setButtonBody] = useState('Dear Parent, your fee payment of Rs. 5000 is pending.');
  const [button1, setButton1] = useState('View Fee Details');
  const [button2, setButton2] = useState('Contact Office');

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      let endpoint = '/api/v1/messages/text';
      let payload: any = { recipient };

      switch (activeTab) {
        case 'TEXT':
          endpoint = '/api/v1/messages/text';
          payload.message = message;
          break;
        case 'IMAGE':
          endpoint = '/api/v1/messages/image';
          payload.mediaUrl = mediaUrl;
          payload.caption = caption;
          break;
        case 'DOCUMENT':
          endpoint = '/api/v1/messages/document';
          payload.mediaUrl = mediaUrl;
          payload.fileName = fileName || 'document.pdf';
          payload.caption = caption;
          break;
        case 'VIDEO':
          endpoint = '/api/v1/messages/video';
          payload.mediaUrl = mediaUrl;
          payload.caption = caption;
          break;
        case 'AUDIO':
          endpoint = '/api/v1/messages/audio';
          payload.mediaUrl = mediaUrl;
          break;
        case 'LOCATION':
          endpoint = '/api/v1/messages/location';
          payload.latitude = parseFloat(latitude);
          payload.longitude = parseFloat(longitude);
          payload.name = locName;
          break;
        case 'CONTACT':
          endpoint = '/api/v1/messages/contact';
          payload.fullName = contactName;
          payload.phoneNumber = contactPhone;
          break;
        case 'INTERACTIVE':
          endpoint = '/api/v1/messages/interactive';
          payload.title = buttonTitle;
          payload.body = buttonBody;
          payload.buttons = [
            { id: 'btn_1', label: button1 },
            { id: 'btn_2', label: button2 },
          ];
          break;
      }

      const res = await apiRequest<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setStatusMsg({ type: 'success', text: `Message dispatched successfully! (Status: ${res.status || 'SENT'})` });
      if (activeTab === 'TEXT') setMessage('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Transmission failed.' });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'TEXT', label: 'Text Message', icon: Send },
    { id: 'IMAGE', label: 'Image with Caption', icon: ImageIcon },
    { id: 'DOCUMENT', label: 'Document / PDF', icon: FileText },
    { id: 'VIDEO', label: 'Video', icon: Video },
    { id: 'AUDIO', label: 'Voice / Audio', icon: Mic },
    { id: 'LOCATION', label: 'Location Pin', icon: MapPin },
    { id: 'CONTACT', label: 'Contact Card', icon: User },
    { id: 'INTERACTIVE', label: 'Interactive Buttons', icon: MousePointerClick },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Compose WhatsApp Message</h1>
        <p className="text-xs text-slate-500 mt-1">
          Transmit individual notices, media files, circulars and interactive menus directly to parents or staff.
        </p>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-2 mt-6 border-b border-slate-100 pb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {statusMsg && (
          <div
            className={`mt-4 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSend} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Recipient Phone Number (E.164 or 10-digit Indian)
            </label>
            <input
              type="text"
              required
              placeholder="+91 98765 43210 or 9876543210"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {activeTab === 'TEXT' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">Message Body</label>
                <span className="text-[10px] text-slate-400">{message.length} characters</span>
              </div>
              <textarea
                rows={5}
                required
                placeholder="Type your WhatsApp notification here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {['IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO'].includes(activeTab) && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Public Media URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/file.pdf"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {activeTab === 'DOCUMENT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Attachment File Name</label>
                  <input
                    type="text"
                    placeholder="Fee_Receipt_Oct2026.pdf"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {['IMAGE', 'DOCUMENT', 'VIDEO'].includes(activeTab) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Optional Caption</label>
                  <input
                    type="text"
                    placeholder="School circular regarding tomorrow's timings"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'LOCATION' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Latitude</label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Longitude</label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>
            </div>
          )}

          {activeTab === 'INTERACTIVE' && (
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={buttonTitle}
                  onChange={(e) => setButtonTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Body Text</label>
                <textarea
                  rows={3}
                  value={buttonBody}
                  onChange={(e) => setButtonBody(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Button 1 Label</label>
                  <input
                    type="text"
                    value={button1}
                    onChange={(e) => setButton1(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Button 2 Label</label>
                  <input
                    type="text"
                    value={button2}
                    onChange={(e) => setButton2(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Fallback: On clients not supporting native buttons, this is automatically sent as a numbered reply menu.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Transmitting via Baileys...' : 'Send WhatsApp Message'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
