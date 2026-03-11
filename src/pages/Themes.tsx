import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, Sparkles, ArrowLeft, RefreshCw } from 'lucide-react';

interface Theme {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface ThemesProps {
  onBack: () => void;
  onExplore?: (theme: string) => void;
}

export default function Themes({ onBack, onExplore }: ThemesProps) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThemes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/themes');
      if (!response.ok) {
        throw new Error('Failed to fetch themes');
      }
      const data = await response.json();
      setThemes(data.themes || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching themes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateThemes = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-themes', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to generate themes');
      }
      // Refresh the list after generating
      await fetchThemes();
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating themes.');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  return (
    <motion.div
      key="themes"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 max-w-5xl mx-auto pb-20"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors mb-4"
          >
            <ArrowLeft size={16} /> Back to Home
          </button>
          <div className="flex items-center gap-3">
            <Sparkles size={32} className="text-emerald-600 dark:text-emerald-500" />
            <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
              Explore the Qur'an by Theme
            </h2>
          </div>
          <p className="text-stone-500 dark:text-zinc-400 mt-2">
            Discover verses connected through shared meaning.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl border border-red-200 dark:border-red-800/30">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
        </div>
      ) : themes.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-stone-200/60 dark:border-zinc-800">
          <Sparkles size={48} className="mx-auto text-stone-300 dark:text-zinc-700 mb-4" />
          <p className="text-stone-500 dark:text-zinc-400 text-lg mb-6">No themes generated yet.</p>
          <button
            onClick={generateThemes}
            className="text-emerald-600 dark:text-emerald-500 font-medium hover:underline"
          >
            Generate Themes Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onExplore && onExplore(theme.name)}
              className="cursor-pointer bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-stone-200/60 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 flex flex-col h-full group text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-500 transition-colors">
                  {theme.name}
                </h3>
                <span className="text-xs px-2 py-1 rounded-full bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400">
                  verses
                </span>
              </div>
              <div className="w-full h-px bg-stone-200 dark:bg-zinc-800 mb-3"></div>
              <p className="text-stone-600 dark:text-zinc-400 leading-relaxed flex-grow text-left">
                {theme.description}
              </p>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
