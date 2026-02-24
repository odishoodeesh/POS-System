import React, { useState, useEffect } from 'react';
import { ReceiptSettings } from '../types';
import { Save, Loader2, Image as ImageIcon, Type, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

export default function ReceiptSettingsPanel() {
  const [settings, setSettings] = useState<ReceiptSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/receipt-settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await fetch('/api/receipt-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Receipt Customization</h2>
          <p className="text-gray-500">Configure how your printed and digital receipts look</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-900 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Save Changes
        </button>
      </div>

      <form onSubmit={handleSave} className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ImageIcon size={20} className="text-gray-400" />
              Header Information
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={settings.business_name}
                  onChange={e => setSettings({ ...settings, business_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={settings.branch_name}
                  onChange={e => setSettings({ ...settings, branch_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={settings.address}
                  onChange={e => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all h-20"
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={e => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Type size={20} className="text-gray-400" />
              Footer & Policy
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Footer Message</label>
                <input
                  type="text"
                  value={settings.footer_message}
                  onChange={e => setSettings({ ...settings, footer_message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return Policy</label>
                <textarea
                  value={settings.return_policy}
                  onChange={e => setSettings({ ...settings, return_policy: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all h-20"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-lg font-bold">Display Options</h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                { key: 'show_cashier', label: 'Show Cashier Name' },
                { key: 'show_sku', label: 'Show Item SKU' },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSettings({ ...settings, [opt.key]: settings[opt.key as keyof ReceiptSettings] === 1 ? 0 : 1 })}
                  className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all"
                >
                  <span className="font-medium text-gray-700">{opt.label}</span>
                  {settings[opt.key as keyof ReceiptSettings] === 1 ? (
                    <Eye className="text-black" size={20} />
                  ) : (
                    <EyeOff className="text-gray-300" size={20} />
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold">Font Size</h3>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSettings({ ...settings, font_size: size })}
                  className={`flex-1 py-3 rounded-xl font-bold capitalize border-2 transition-all ${
                    settings.font_size === size ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-500 hover:border-gray-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </section>

          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
            <h4 className="text-sm font-bold text-gray-400 uppercase mb-4">Preview Hint</h4>
            <p className="text-sm text-gray-500 leading-relaxed">
              These settings will be applied to all thermal prints and digital receipts. 
              Changes are immutable for past transactions to maintain accounting integrity.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
