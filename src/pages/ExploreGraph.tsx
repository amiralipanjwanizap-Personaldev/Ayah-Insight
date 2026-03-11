import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface ExploreGraphProps {
  onBack?: () => void;
  theme?: string | null;
  onOpenVerse?: (surah: number, verse: number) => void;
}

export default function ExploreGraph({ onBack, theme, onOpenVerse }: ExploreGraphProps) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. Read theme from the URL
  const selectedTheme = theme;

  useEffect(() => {
    // 2. Fetch graph data from /api/graph-data
    const fetchGraphData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/graph-data');
        if (!response.ok) {
          throw new Error('Failed to fetch graph data');
        }
        const data = await response.json();
        setGraphData(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const relatedVerses = graphData.links
    .filter((link: any) => link.source === selectedTheme)
    .map((link: any) => link.target);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 4. Page layout: Top section */}
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors mb-4"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
          Explore Quran Connections
        </h1>
        {selectedTheme && (
          <p className="text-stone-500 dark:text-zinc-400 mt-2">
            Highlighting theme: <span className="font-semibold text-emerald-600 dark:text-emerald-500">{selectedTheme}</span>
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-red-500">
          {error}
        </div>
      ) : (
        <div className="grid gap-4 mt-8">
          {relatedVerses.map((verseId: string) => {
            const [surah, verse] = verseId.split(":");

            return (
              <div
                key={verseId}
                className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-stone-200 dark:border-zinc-800 flex justify-between items-center"
              >
                <div>
                  <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">
                    Surah {surah} : Verse {verse}
                  </h3>
                  <p className="text-sm text-stone-500 dark:text-zinc-400">
                    Tap to open verse reader
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (onOpenVerse) onOpenVerse(Number(surah), Number(verse));
                    const event = new CustomEvent("openVerse", {
                      detail: { surah: Number(surah), verse: Number(verse) }
                    });
                    window.dispatchEvent(event);
                  }}
                  className="text-emerald-600 font-medium hover:underline"
                >
                  Open
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
