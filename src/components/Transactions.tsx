import { useState, useEffect } from 'react';
import { Receipt, ReceiptSettings } from '../types';
import { 
  Search, 
  Printer, 
  Eye, 
  Loader2, 
  Calendar,
  ChevronRight,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReceiptPreview from './ReceiptPreview';
import { formatCurrency } from '../utils/format';

export default function Transactions() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [settings, setSettings] = useState<ReceiptSettings | null>(null);

  useEffect(() => {
    fetchData();
    fetch('/api/receipt-settings').then(res => res.json()).then(setSettings);
  }, []);

  const fetchData = async () => {
    try {
      const receiptsRes = await fetch('/api/receipts/list');
      if (receiptsRes.ok) {
        const data = await receiptsRes.json();
        setReceipts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewReceipt = async (id: string) => {
    const res = await fetch(`/api/receipts/${id}`);
    const data = await res.json();
    setSelectedReceipt(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-gray-500">View and reprint past receipts</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by receipt ID or order #..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-black outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Receipt ID</th>
                <th className="px-6 py-4 font-semibold">Order #</th>
                <th className="px-6 py-4 font-semibold text-right">Total (IQD)</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.isArray(receipts) && receipts.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">#{r.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 font-bold">Order #{r.order_id}</td>
                  <td className="px-6 py-4 text-right font-bold">{formatCurrency(r.total)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => viewReceipt(r.id)}
                        className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-black transition-colors shadow-sm"
                      >
                        <Eye size={16} />
                      </button>
                      <button className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-black transition-colors shadow-sm">
                        <Printer size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedReceipt && settings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReceipt(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-w-4xl w-full flex"
            >
              <div className="flex-1 bg-gray-100 p-8 overflow-y-auto flex items-center justify-center">
                <ReceiptPreview receipt={selectedReceipt} settings={settings} />
              </div>
              <div className="w-80 p-8 flex flex-col">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold">Receipt Details</h2>
                  <button onClick={() => setSelectedReceipt(null)} className="text-gray-400 hover:text-black">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <button className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all font-bold">
                    <Printer size={20} />
                    Reprint Receipt
                  </button>
                  <button className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all font-bold">
                    <Eye size={20} />
                    Merchant Copy
                  </button>
                  <button className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all font-bold">
                    <Calendar size={20} />
                    Kitchen Copy
                  </button>
                </div>

                <div className="mt-auto pt-6 border-t border-gray-100">
                  <p className="text-xs text-gray-400">Transaction ID</p>
                  <p className="text-xs font-mono break-all">{selectedReceipt.id}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
