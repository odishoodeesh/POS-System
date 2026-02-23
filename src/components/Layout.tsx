import { ReactNode } from 'react';
import { User } from '../types';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Tag,
  Users, 
  Settings, 
  LogOut,
  ChevronRight,
  History
} from 'lucide-react';
import { motion } from 'motion/react';

interface LayoutProps {
  children: ReactNode;
  user: User;
  currentView: 'pos' | 'inventory' | 'categories' | 'dashboard' | 'transactions';
  setView: (view: 'pos' | 'inventory' | 'categories' | 'dashboard' | 'transactions') => void;
}

export default function Layout({ children, user, currentView, setView }: LayoutProps) {
  const menuItems = [
    { id: 'pos', label: 'Terminal', icon: ShoppingBag },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'transactions', label: 'Transactions', icon: History },
    { id: 'dashboard', label: 'Analytics', icon: LayoutDashboard },
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-white border-r border-gray-200 flex flex-col transition-all duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white flex-shrink-0 shadow-lg">
            <ShoppingBag size={20} />
          </div>
          <span className="font-bold text-xl hidden lg:block tracking-tight">CloudPOS</span>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                currentView === item.id 
                  ? 'bg-black text-white shadow-md' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-black'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium hidden lg:block">{item.label}</span>
              {currentView === item.id && (
                <motion.div 
                  layoutId="active-pill"
                  className="ml-auto hidden lg:block"
                >
                  <ChevronRight size={16} />
                </motion.div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 hidden lg:flex">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.username}</p>
              <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
