import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Loader2, BookOpen, ChevronRight } from 'lucide-react';

interface MaarifaResult {
  surah?: number;
  verse?: number;
  source_title?: string;
  text_en: string;
  similarity?: number;
  similarity_score?: number;
}

interface MaarifaProps {
  onOpenVerse: (surah: number, verse: number) => void;
}

export default function Maarifa({ onOpenVerse }: MaarifaProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MaarifaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    
    try {
      const res = await fetch('/api/maarifa/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (!res.ok) throw new Error('Search failed');
      
      const data = await res.json();
      // Limit to 10 results
      setResults((data.results || []).slice(0, 10));
    } catch (error) {
      console.error(error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900 dark:text-stone-100">
          Maarifa Research
        </h2>
        <p className="text-lg text-stone-600 dark:text-zinc-400">
          Search across Tafsir and Hadith using semantic AI.
        </p>
      </div>

      <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-stone-400 dark:text-zinc-500" />
        </div>
        <input
          type="text"
          placeholder="Search Qur'an knowledge..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-32 py-4 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow text-lg"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 top-2 bottom-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
        </button>
      </form>

      <div className="space-y-6 mt-12">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div className="text-center py-12 text-stone-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200/60 dark:border-zinc-800">
            No results found. Try a different search term.
          </div>
        )}

        {!loading && results.map((result, idx) => {
          // Fallback if the API returns source_title instead of surah/verse directly
          const surah = result.surah || 1;
          const verse = result.verse || 1;
          const title = result.source_title ? result.source_title : `Surah: ${surah}:${verse}`;
          const similarity = result.similarity ?? result.similarity_score ?? 0;
          
          return (
            <div 
              key={idx}
              className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-stone-200/60 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-500 font-serif">
                  {title}
                </h3>
                {similarity > 0 && (
                  <span className="text-xs font-medium bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 px-3 py-1.5 rounded-full">
                    {Math.round(similarity * 100)}% Match
                  </span>
                )}
              </div>
              
              <p className="text-stone-700 dark:text-zinc-300 leading-relaxed mb-6 font-serif text-lg">
                {result.text_en.length > 300 
                  ? result.text_en.substring(0, 300) + '...' 
                  : result.text_en}
              </p>
              
              <div className="flex justify-end">
                <button
                  onClick={() => onOpenVerse(surah, verse)}
                  className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                >
                  <BookOpen size={16} /> Open Verse <ChevronRight size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
