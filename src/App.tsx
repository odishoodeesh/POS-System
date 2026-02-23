import { useState, useEffect } from 'react';
import { User } from './types';
import Layout from './components/Layout';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Categories from './components/Categories';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Login from './components/Login';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'pos' | 'inventory' | 'categories' | 'dashboard' | 'transactions'>('pos');

  // Check for saved session
  useEffect(() => {
    const savedUser = localStorage.getItem('pos_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('pos_user');
      }
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
      {view === 'categories' && <Categories />}
      {view === 'dashboard' && <Dashboard />}
      {view === 'transactions' && <Transactions />}
    </Layout>
  );
}
