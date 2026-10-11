'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Plus, CheckCircle2, Copy, Sparkles, Tag } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [body, setBody] = useState('');

  const fetchTemplates = async () => {
    try {
      const data = await apiRequest<any[]>('/api/templates');
      setTemplates(data);
    } catch {}
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/templates', {
        method: 'POST',
        body: JSON.stringify({ name, code, category, body }),
      });
      setShowAdd(false);
      setName('');
      setCode('');
      setBody('');
      fetchTemplates();
    } catch (err: any) {
      alert(`Error creating template: ${err.message}`);
    }
  };

  const insertVariable = (varName: string) => {
    setBody((prev) => `${prev}{{${varName}}}`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Message Templates</h1>
          <p className="text-xs text-slate-500 mt-1">
            Standardized reusable templates for attendance, fee reminders, bus alerts, and circulars.
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {tpl.category}
                </span>
                <span className="font-mono text-[10px] text-slate-400 font-semibold">{tpl.code}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{tpl.name}</h3>
              <p className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                {tpl.body}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-slate-400 font-semibold mr-1">Variables:</span>
              {tpl.variables?.map((v: string) => (
                <span
                  key={v}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-100 font-semibold"
                >
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-lg w-full shadow-lg">
            <h3 className="text-base font-bold text-slate-900 mb-4">Create Reusable Template</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sports Day Circular"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unique Code</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                    placeholder="SPORTS_DAY_2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="GENERAL">GENERAL</option>
                    <option value="ATTENDANCE">ATTENDANCE</option>
                    <option value="FEES">FEES</option>
                    <option value="HOMEWORK">HOMEWORK</option>
                    <option value="EXAMINATIONS">EXAMINATIONS</option>
                    <option value="TRANSPORT">TRANSPORT</option>
                    <option value="ANNOUNCEMENTS">ANNOUNCEMENTS</option>
                    <option value="EMERGENCY">EMERGENCY</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">Template Text</label>
                  <span className="text-[10px] text-slate-400">Use double braces for dynamic fields</span>
                </div>
                <textarea
                  rows={6}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Dear {{parent_name}}, your ward {{student_name}}..."
                  className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200"
                />

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['student_name', 'parent_name', 'class', 'section', 'date', 'fee_amount', 'due_date'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="px-2 py-1 rounded-lg text-[10px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                    >
                      + {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
