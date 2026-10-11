'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Send,
  User,
  Paperclip,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Headphones,
  Tag,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  const fetchConversations = async () => {
    try {
      const data = await apiRequest<any[]>('/api/inbox/conversations');
      setConversations(data);
      if (data.length > 0 && !activeConv) {
        setActiveConv(data[0]);
      }
    } catch {}
  };

  const fetchMessages = async (convId: string) => {
    try {
      const msgs = await apiRequest<any[]>(`/api/inbox/conversations/${convId}/messages`);
      setMessages(msgs);
    } catch {}
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
    }
  }, [activeConv]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConv) return;

    setSending(true);
    try {
      await apiRequest(`/api/inbox/conversations/${activeConv.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ text: replyText }),
      });
      setReplyText('');
      fetchMessages(activeConv.id);
      fetchConversations();
    } catch (err: any) {
      alert(`Failed to send reply: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const filtered = conversations.filter((c) => {
    const name = c.contact?.fullName || c.remoteJid;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-120px)] bg-white rounded-3xl border border-slate-200 shadow-xs flex overflow-hidden">
      {/* LEFT: Conversation List */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No conversations found.
            </div>
          ) : (
            filtered.map((conv) => {
              const isSelected = activeConv?.id === conv.id;
              const contactName = conv.contact?.fullName || conv.remoteJid.split('@')[0];
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className={`w-full text-left p-4 transition-colors flex items-start gap-3 ${
                    isSelected ? 'bg-white border-l-4 border-emerald-600 shadow-xs' : 'hover:bg-slate-100/60'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {contactName.substring(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{contactName}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatDateTime(conv.lastMessageAt).split(',')[1] || ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {conv.lastMessageSnippet || 'No messages yet'}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="inline-block mt-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CENTER: Message Thread */}
      <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
        {activeConv ? (
          <>
            {/* Thread Header */}
            <div className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  {(activeConv.contact?.fullName || activeConv.remoteJid).substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    {activeConv.contact?.fullName || activeConv.remoteJid.split('@')[0]}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {activeConv.contact?.phoneNumber || activeConv.remoteJid}
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Chat
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m) => {
                const isOutbound = m.direction === 'OUTBOUND';
                return (
                  <div
                    key={m.id}
                    className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md rounded-2xl p-3.5 shadow-2xs text-xs font-medium leading-relaxed ${
                        isOutbound
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                      }`}
                    >
                      {/* Media Attachments */}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="mb-2 space-y-1">
                          {m.attachments.map((att: any) => (
                            <div
                              key={att.id}
                              className={`p-2 rounded-xl text-[11px] flex items-center gap-2 ${
                                isOutbound ? 'bg-emerald-700/60 text-white' : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              <FileText className="w-4 h-4" />
                              <span className="truncate">{att.fileName}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="whitespace-pre-wrap">{m.textContent}</p>

                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                          isOutbound ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        <span>{formatDateTime(m.createdAt).split(',')[1]}</span>
                        {isOutbound && (
                          <span>
                            {m.status === 'READ' ? (
                              <CheckCheck className="w-3 h-3 text-cyan-200" />
                            ) : m.status === 'DELIVERED' ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : m.status === 'SENT' ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Composer Bar */}
            <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
              <input
                type="text"
                placeholder="Type a WhatsApp reply to parent..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 transition"
              />
              <button
                type="submit"
                disabled={sending || !replyText.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
              >
                <span>{sending ? 'Sending...' : 'Send'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            Select a conversation to view chat history.
          </div>
        )}
      </div>

      {/* RIGHT: Contact Information */}
      {activeConv && (
        <div className="w-72 border-l border-slate-200 p-6 bg-white overflow-y-auto space-y-6 hidden lg:block">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-400 mb-3">
              Contact Profile
            </h4>
            <div className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center font-bold text-sm">
                {(activeConv.contact?.fullName || activeConv.remoteJid).substring(0, 2).toUpperCase()}
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-2">
                {activeConv.contact?.fullName || 'Unregistered Contact'}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {activeConv.contact?.e164Phone || activeConv.remoteJid.split('@')[0]}
              </p>
            </div>
          </div>

          {activeConv.contact?.studentId && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Student Reference
              </h4>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 space-y-1">
                <p className="text-xs font-bold text-purple-900">
                  Admission ID: {activeConv.contact.studentId}
                </p>
                <p className="text-[11px] text-purple-700">
                  Class {activeConv.contact.gradeClass || '-'}{' '}
                  {activeConv.contact.section || ''}
                </p>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Consent Status
            </h4>
            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {activeConv.contact?.consentStatus || 'OPTED_IN'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
