import { useState } from 'react';
import { User } from './types';
import Layout from './components/Layout';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Categories from './components/Categories';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';

const DEFAULT_USER: User = {
  id: 1,
  username: 'admin',
  role: 'owner',
  pin: '1234'
};

export default function App() {
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [view, setView] = useState<'pos' | 'inventory' | 'categories' | 'dashboard' | 'transactions'>('pos');

  return (
    <Layout user={user} currentView={view} setView={setView}>
      {view === 'pos' && <POS user={user} />}
      {view === 'inventory' && <Inventory />}
      {view === 'categories' && <Categories />}
      {view === 'dashboard' && <Dashboard />}
      {view === 'transactions' && <Transactions />}
    </Layout>
  );
}
