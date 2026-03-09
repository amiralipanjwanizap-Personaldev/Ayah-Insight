'use client';

import { useState } from 'react';
import VerseGraph from '../../components/VerseGraph';
import { Loader2 } from 'lucide-react';

export default function VerseGraphPage() {
  const [verseInput, setVerseInput] = useState('');
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleExplore = async () => {
    if (!verseInput) return;
    
    // Parse input like "2:183"
    const [surah, verse] = verseInput.split(':').map(Number);
    if (!surah || !verse) return;

    setLoading(true);
    try {
      // Fetch verse data from the existing API
      const response = await fetch('/api/verse-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surah,
          verse,
          text: "...", // This would ideally be fetched from Quran API
          translation: "...",
          global_verse_id: (surah - 1) * 286 + verse // Simplified mapping
        })
      });
      const data = await response.json();
      setGraphData(data);
    } catch (error) {
      console.error('Graph error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-8">Explore Verse Connections</h1>
      
      <div className="flex gap-4 mb-8">
        <input
          type="text"
          value={verseInput}
          onChange={(e) => setVerseInput(e.target.value)}
          placeholder="Enter verse (e.g., 2:183)"
          className="flex-grow px-6 py-4 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 outline-none"
        />
        <button 
          onClick={handleExplore}
          className="bg-emerald-700 text-white px-8 py-4 rounded-2xl font-medium hover:bg-emerald-800 transition-colors"
        >
          Explore Connections
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
        </div>
      ) : graphData && (
        <VerseGraph 
          initialVerse={{
            id: 1, // Need proper mapping
            surah: graphData.verse.surah,
            verse: graphData.verse.verse,
            text: graphData.verse.text
          }}
          relationships={graphData.relationships}
        />
      )}
    </div>
  );
}
