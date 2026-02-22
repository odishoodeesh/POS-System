import { useState, useEffect } from 'react';
import { User } from './types';
import Login from './components/Login';
import Layout from './components/Layout';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'pos' | 'inventory' | 'dashboard' | 'transactions'>('pos');

  useEffect(() => {
    const savedUser = localStorage.getItem('pos_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('pos_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pos_user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout user={user} currentView={view} setView={setView} onLogout={handleLogout}>
      {view === 'pos' && <POS user={user} />}
      {view === 'inventory' && <Inventory />}
      {view === 'dashboard' && <Dashboard />}
      {view === 'transactions' && <Transactions />}
    </Layout>
  );
}
