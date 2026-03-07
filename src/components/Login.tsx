import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configStatus, setConfigStatus] = useState<{
    supabaseUrl: boolean;
    supabaseAnonKey: boolean;
    supabaseServiceKey: boolean;
  } | null>(null);

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = async () => {
    try {
      const res = await fetch('/api/debug/status');
      if (res.ok) {
        const data = await res.json();
        setConfigStatus(data);
      }
    } catch (err) {
      console.error('Failed to check config status', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
    const payload = { username, password };

    try {
      console.log(`Attempting ${isSignUp ? 'Signup' : 'Login'} to ${endpoint}...`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log(`${isSignUp ? 'Signup' : 'Login'} response:`, data);

      if (response.ok) {
        if (data.confirmationRequired) {
          setError(data.message); // Show confirmation message as a "success" notice
          setIsSignUp(false); // Switch back to login
        } else {
          onLogin(data);
        }
      } else {
        setError(data.error || (isSignUp ? 'Signup failed' : 'Invalid username or password'));
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black text-white mb-4 shadow-lg">
            <Lock size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">CloudPOS Pro</h1>
          <p className="text-gray-500 mt-2">
            {isSignUp ? 'Create your terminal account' : 'Sign in to your terminal'}
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                  placeholder="Admin@admin.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm font-medium text-center">{error}</p>
            )}

            {configStatus && (!configStatus.supabaseUrl || !configStatus.supabaseServiceKey) && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-amber-800 text-xs font-medium">
                  ⚠️ Configuration Warning:
                </p>
                <ul className="text-amber-700 text-[10px] mt-1 list-disc list-inside">
                  {!configStatus.supabaseUrl && <li>VITE_SUPABASE_URL is missing</li>}
                  {!configStatus.supabaseServiceKey && <li>SUPABASE_SERVICE_ROLE_KEY is missing</li>}
                </ul>
                <p className="text-amber-600 text-[9px] mt-2">
                  Please add these to your AI Studio environment variables.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-gray-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-8">
          &copy; 2024 CloudPOS Pro. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
