import React, { useState, useEffect } from 'react';
import { Category } from '../types';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Loader2,
  Tag,
  X,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = currentCategory.id ? `/api/categories/${currentCategory.id}` : '/api/categories';
      const method = currentCategory.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: currentCategory.name }),
      });

      if (response.ok) {
        await fetchCategories();
        setIsEditing(false);
        setCurrentCategory({});
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to save category'}`);
      }
    } catch (err) {
      console.error('Failed to save category', err);
      alert('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure? This will affect products in this category.')) return;
    
    try {
      const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchCategories();
      }
    } catch (err) {
      console.error('Failed to delete category', err);
    }
  };

  const filteredCategories = Array.isArray(categories) ? categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-gray-500">Manage your product categories</p>
        </div>
        <button 
          onClick={() => {
            setCurrentCategory({});
            setIsEditing(true);
          }}
          className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-900 transition-all shadow-lg"
        >
          <Plus size={20} />
          Add Category
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Category Name</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCategories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                        <Tag size={20} />
                      </div>
                      <span className="font-bold text-gray-900">{category.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => {
                          setCurrentCategory(category);
                          setIsEditing(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-black hover:text-white rounded-lg text-gray-600 transition-all text-sm font-bold border border-gray-100 shadow-sm"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(category.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-500 hover:text-white rounded-lg text-red-600 transition-all text-sm font-bold border border-red-100 shadow-sm"
                      >
                        <Trash2 size={14} />
                        Delete
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
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold">
                    {currentCategory.id ? 'Edit Category' : 'Add Category'}
                  </h2>
                  <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-black">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Category Name</label>
                    <input
                      type="text"
                      required
                      value={currentCategory.name || ''}
                      onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
                      placeholder="e.g. Beverages"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 px-6 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-black text-white px-6 py-4 rounded-xl font-bold hover:bg-gray-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 className="animate-spin" size={20} /> : (
                        <>
                          <Check size={20} />
                          {currentCategory.id ? 'Update' : 'Save'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
