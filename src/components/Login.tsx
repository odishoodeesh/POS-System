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
    
    // Listen for OAuth success from popup
    const handleMessage = (event: MessageEvent) => {
      // Validate origin if possible, but '*' is often used in these sandboxes
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        console.log("OAuth success received:", event.data.user);
        onLogin(event.data.user);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
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

      console.log(`Response status: ${response.status}`);
      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        console.log(`${isSignUp ? 'Signup' : 'Login'} response:`, data);

        if (response.ok) {
          if (data.confirmationRequired) {
            setError(data.message);
            setIsSignUp(false);
          } else {
            onLogin(data);
          }
        } else {
          setError(data.error || (isSignUp ? 'Signup failed' : 'Invalid username or password'));
        }
      } else {
        const text = await response.text();
        console.error("Non-JSON response received:", text.substring(0, 200));
        setError(`Server error (${response.status}). The server might be starting up or misconfigured.`);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError('Connection error. Please check your internet or if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/google/url');
      if (!res.ok) throw new Error('Failed to get Google Auth URL');
      const { url } = await res.json();
      
      // Open popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        url,
        'google_login',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!popup) {
        setError('Popup blocked. Please allow popups for this site.');
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Failed to start Google login');
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

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border border-gray-200 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
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
