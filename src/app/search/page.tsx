'use client';

import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-8">Search Quran by Meaning</h1>
      
      <form onSubmit={handleSearch} className="mb-12">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., patience, justice, charity"
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 outline-none"
          />
          <Search className="absolute left-4 top-4 text-stone-400" size={20} />
        </div>
        <button type="submit" className="mt-4 w-full bg-emerald-700 text-white py-3 rounded-xl font-medium hover:bg-emerald-800 transition-colors">
          Search
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((res: any, idx: number) => (
            <Link 
              key={idx} 
              href={`/read/${res.surah}/${res.ayah}`}
              className="block p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-zinc-800 hover:border-emerald-500 transition-colors"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Surah {res.surah}:{res.ayah}</h3>
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  {(res.similarity * 100).toFixed(1)}% match
                </span>
              </div>
              <p className="text-stone-600 dark:text-zinc-400 mt-2 line-clamp-2">{res.translation}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
