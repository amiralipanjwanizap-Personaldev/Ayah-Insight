import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, Sparkles, ArrowLeft, RefreshCw, ChevronDown } from 'lucide-react';

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
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());

  const toggleTheme = (themeId: string) => {
    const next = new Set(expandedThemes);
    if (next.has(themeId)) {
      next.delete(themeId);
    } else {
      next.add(themeId);
    }
    setExpandedThemes(next);
  };

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
              Quranic Themes
            </h2>
          </div>
          <p className="text-stone-500 dark:text-zinc-400 mt-2">
            AI-generated core concepts based on verse insights.
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
        <div className="grid grid-cols-1 gap-6">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-stone-200/60 dark:border-zinc-800 transition-colors flex flex-col"
            >
              <button
                onClick={() => toggleTheme(theme.id)}
                className="flex justify-between items-center w-full text-left"
              >
                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-500 transition-colors">
                  {theme.name}
                </h3>
                <ChevronDown className={`transition-transform text-stone-500 ${expandedThemes.has(theme.id) ? 'rotate-180' : ''}`} />
              </button>
              
              {expandedThemes.has(theme.id) && (
                <div className="mt-4 pt-4 border-t border-stone-100 dark:border-zinc-800">
                  <p className="text-stone-600 dark:text-zinc-400 leading-relaxed mb-4">
                    {theme.description}
                  </p>
                  <button
                    onClick={() => onExplore && onExplore(theme.name)}
                    className="text-emerald-600 dark:text-emerald-500 font-medium hover:underline"
                  >
                    Explore Theme
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
