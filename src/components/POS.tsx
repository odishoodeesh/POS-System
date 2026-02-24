import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Category, CartItem, User, Receipt, ReceiptSettings } from '../types';
import { useScanner } from '../hooks/useScanner';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  CheckCircle2,
  X,
  Loader2,
  ShoppingBag,
  Scan,
  Printer,
  Mail,
  MessageSquare,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReceiptPreview from './ReceiptPreview';
import { formatCurrency } from '../utils/format';

interface POSProps {
  user: User;
}

export default function POS({ user }: POSProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderComplete, setOrderComplete] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings | null>(null);
  const [autoResetTimer, setAutoResetTimer] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
    fetch('/api/receipt-settings').then(res => res.json()).then(setReceiptSettings);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (orderComplete && autoResetTimer !== null && autoResetTimer > 0) {
      interval = setInterval(() => {
        setAutoResetTimer(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (orderComplete && autoResetTimer === 0) {
      resetPOS();
    }
    return () => clearInterval(interval);
  }, [orderComplete, autoResetTimer]);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  useScanner((code) => {
    const product = products.find(p => p.sku === code);
    if (product) {
      addToCart(product);
      setLastScanned(product.name);
      setTimeout(() => setLastScanned(null), 2000);
    }
  });

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories')
      ]);
      
      if (prodRes.ok) {
        const prods = await prodRes.json();
        setProducts(Array.isArray(prods) ? prods : []);
      }
      
      if (catRes.ok) {
        const cats = await catRes.json();
        setCategories(Array.isArray(cats) ? cats : []);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter(p => {
      const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const finalTotal = cartTotal;

  const handleCheckout = useCallback(async (method?: 'cash' | 'card') => {
    const finalMethod = method || paymentMethod;
    if (!finalMethod) return;
    setLoading(true);
    setIsCheckingOut(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total: finalTotal,
          tax: 0,
          discount: 0,
          payment_method: finalMethod,
          items: cart,
          user_id: user.id
        }),
      });

      if (response.ok) {
        const { id } = await response.json();
        const receiptRes = await fetch(`/api/receipts/${id}`);
        const receiptData = await receiptRes.json();
        
        setCurrentReceipt(receiptData);
        setOrderComplete(true);
        setAutoResetTimer(10); // 10 seconds auto-reset
        setCart([]);
        fetchData(); // Refresh stock
      }
    } catch (err) {
      console.error('Checkout failed', err);
    } finally {
      setLoading(false);
    }
  }, [paymentMethod, finalTotal, cart, user.id, fetchData]);

  const resetPOS = useCallback(() => {
    setOrderComplete(false);
    setIsCheckingOut(false);
    setPaymentMethod(null);
    setCurrentReceipt(null);
    setAutoResetTimer(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // Don't trigger if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }

        if (orderComplete) {
          resetPOS();
        } else if (cart.length > 0 && !loading && !isCheckingOut) {
          handleCheckout('cash');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orderComplete, cart.length, loading, isCheckingOut, handleCheckout, resetPOS]);

  if (loading && products.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
      {/* Last Scanned Toast */}
      <AnimatePresence>
        {lastScanned && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <Scan size={20} className="text-green-400" />
            <span className="font-bold">Scanned: {lastScanned}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Section */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 shadow-sm focus:ring-2 focus:ring-black outline-none transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-6 py-4 rounded-2xl font-medium whitespace-nowrap transition-all ${
                selectedCategory === null ? 'bg-black text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-6 py-4 rounded-2xl font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id ? 'bg-black text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
          {filteredProducts.map(product => (
            <motion.button
              key={product.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => addToCart(product)}
              disabled={product.stock <= 0}
              className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left flex flex-col group relative overflow-hidden disabled:opacity-50"
            >
              <div className="aspect-square rounded-2xl bg-gray-50 mb-3 flex items-center justify-center text-gray-300 overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag size={32} />
                )}
              </div>
              <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
              <p className="text-sm text-gray-400 mb-2">{product.category_name}</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-lg font-bold">{formatCurrency(product.price)}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${product.stock < 10 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                  {product.stock} in stock
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-96 bg-white rounded-3xl border border-gray-200 shadow-xl flex flex-col overflow-hidden">
        <div className="p-6 border-bottom border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold">Current Order</h2>
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-bold">
            {cart.reduce((a, b) => a + b.quantity, 0)} items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <ShoppingBag size={48} strokeWidth={1} />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-4 group">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold truncate">{item.name}</h4>
                  <p className="text-sm text-gray-400">{formatCurrency(item.price)} each</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-gray-50 rounded-xl p-1">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-1 hover:bg-white rounded-lg transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-1 hover:bg-white rounded-lg transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3">
          <div className="flex justify-between text-2xl font-bold pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>{formatCurrency(finalTotal)}</span>
          </div>
          <button
            disabled={cart.length === 0 || loading}
            onClick={() => handleCheckout('cash')}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold mt-4 hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : `Charge ${formatCurrency(finalTotal)}`}
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckingOut && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setIsCheckingOut(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative bg-white w-full ${orderComplete ? 'max-w-4xl' : 'max-w-md'} rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-500`}
            >
              {orderComplete ? (
                <div className="flex flex-col md:flex-row h-[80vh] md:h-auto">
                  {/* Receipt Preview Side */}
                  <div className="flex-1 bg-gray-100 p-8 overflow-y-auto flex items-center justify-center">
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="shadow-2xl"
                    >
                      {currentReceipt && receiptSettings && (
                        <ReceiptPreview receipt={currentReceipt} settings={receiptSettings} />
                      )}
                    </motion.div>
                  </div>

                  {/* Actions Side */}
                  <div className="w-full md:w-96 p-8 flex flex-col">
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-100">
                        <CheckCircle2 size={32} />
                      </div>
                      <h2 className="text-2xl font-bold">Payment Successful</h2>
                      <p className="text-gray-500">How would you like your receipt?</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-8">
                      <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all gap-2 group">
                        <Printer size={24} className="text-gray-400 group-hover:text-black" />
                        <span className="text-xs font-bold">Print</span>
                      </button>
                      <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all gap-2 group">
                        <Mail size={24} className="text-gray-400 group-hover:text-black" />
                        <span className="text-xs font-bold">Email</span>
                      </button>
                      <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all gap-2 group">
                        <MessageSquare size={24} className="text-gray-400 group-hover:text-black" />
                        <span className="text-xs font-bold">SMS</span>
                      </button>
                      <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all gap-2 group">
                        <Download size={24} className="text-gray-400 group-hover:text-black" />
                        <span className="text-xs font-bold">PDF</span>
                      </button>
                    </div>

                    <div className="mt-auto space-y-3">
                      <button
                        onClick={resetPOS}
                        className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-900 transition-all shadow-lg"
                      >
                        New Sale {autoResetTimer !== null && `(${autoResetTimer}s)`}
                      </button>
                      <p className="text-center text-xs text-gray-400">
                        Order #{currentReceipt?.order_id} • {currentReceipt?.payment_method.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : loading ? (
                <div className="p-24 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-black" size={48} />
                  <p className="font-bold text-gray-500 uppercase tracking-widest">Processing Cash Payment...</p>
                </div>
              ) : (
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold">Select Payment</h2>
                    <button onClick={() => setIsCheckingOut(false)} className="text-gray-400 hover:text-black">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex flex-col items-center justify-center p-8 rounded-3xl border-2 transition-all gap-4 ${
                        paymentMethod === 'cash' ? 'border-black bg-black text-white' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <Banknote size={40} />
                      <span className="font-bold">Cash</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`flex flex-col items-center justify-center p-8 rounded-3xl border-2 transition-all gap-4 ${
                        paymentMethod === 'card' ? 'border-black bg-black text-white' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <CreditCard size={40} />
                      <span className="font-bold">Card</span>
                    </button>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-3xl mb-8 space-y-2">
                    <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span>{formatCurrency(finalTotal)}</span>
                    </div>
                  </div>

                  <button
                    disabled={!paymentMethod || loading}
                    onClick={() => handleCheckout()}
                    className="w-full bg-black text-white py-5 rounded-2xl font-bold text-lg hover:bg-gray-900 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="animate-spin" size={24} /> : `Complete Payment`}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
