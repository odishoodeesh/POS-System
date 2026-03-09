import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Settings as SettingsIcon,
  BarChart3,
  Sparkles,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import ReceiptSettingsPanel from './ReceiptSettingsPanel';
import { formatCurrency } from '../utils/format';
import { getSalesInsights } from '../services/geminiService';

export default function Dashboard() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'settings'>('analytics');
  const [insights, setInsights] = useState<string[]>([]);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/reports/daily').then(res => res.json()),
      fetch('/api/reports/stats').then(res => res.json())
    ]).then(([daily, stats]) => {
      setReportData(daily.reverse());
      setStatsData(stats);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to fetch dashboard data", err);
      setLoading(false);
    });
  }, []);

  const stats = statsData ? [
    { label: 'Total Revenue', value: formatCurrency(statsData.totalRevenue), trend: statsData.revenueTrend, icon: DollarSign, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Orders', value: statsData.totalOrders.toString(), trend: statsData.ordersTrend, icon: ShoppingBag, color: 'bg-orange-50 text-orange-600' },
    { label: 'New Customers', value: statsData.newCustomers.toString(), trend: statsData.customersTrend, icon: Users, color: 'bg-green-50 text-green-600' },
    { label: 'Avg. Order Value', value: formatCurrency(statsData.avgOrderValue), trend: statsData.avgTrend, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
  ] : [];

  const handleGenerateInsights = async () => {
    if (!statsData || reportData.length === 0) return;
    setGeneratingInsights(true);
    try {
      const newInsights = await getSalesInsights(statsData, reportData);
      setInsights(newInsights);
    } catch (err) {
      console.error("Failed to generate insights", err);
    } finally {
      setGeneratingInsights(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-gray-500">Real-time performance overview</p>
        </div>
        <div className="bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === 'analytics' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'
            }`}
          >
            <BarChart3 size={18} />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === 'settings' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'
            }`}
          >
            <SettingsIcon size={18} />
            Receipt Settings
          </button>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon size={24} />
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-bold ${stat.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.trend}
                    {stat.trend.startsWith('+') ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
              </motion.div>
            ))}
          </div>

          {/* AI Insights Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Sparkles size={120} />
            </div>
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                      <Sparkles size={18} className="text-indigo-100" />
                    </div>
                    <span className="text-indigo-100 font-bold tracking-wider text-xs uppercase">AI Business Intelligence</span>
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Smart Sales Insights</h2>
                  <p className="text-indigo-100/80 max-w-xl">
                    Let Gemini analyze your sales patterns and provide actionable recommendations to grow your business.
                  </p>
                </div>
                
                <button
                  onClick={handleGenerateInsights}
                  disabled={generatingInsights}
                  className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-indigo-50 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {generatingInsights ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Analyzing Data...
                    </>
                  ) : (
                    <>
                      <Zap size={20} className="group-hover:fill-indigo-600 transition-all" />
                      Generate AI Insights
                    </>
                  )}
                </button>
              </div>

              <AnimatePresence>
                {insights.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-8 pt-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {insights.map((insight, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex gap-4 items-start"
                      >
                        <div className="bg-white/20 p-2 rounded-xl shrink-0">
                          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        </div>
                        <p className="text-sm font-medium leading-relaxed">{insight}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold">Revenue Overview</h3>
                <select className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-medium outline-none">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                </select>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#000000" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold">Orders Volume</h3>
                <button className="text-sm font-bold text-gray-400 hover:text-black transition-colors">View Report</button>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#F8F9FA' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Bar 
                      dataKey="orders" 
                      fill="#000000" 
                      radius={[6, 6, 0, 0]} 
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : (
        <ReceiptSettingsPanel />
      )}
    </div>
  );
}
