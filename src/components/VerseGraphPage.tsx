import React, { useState } from 'react';
import VerseGraph from './VerseGraph';

export default function VerseGraphPage() {
  const [verse, setVerse] = useState('2:183');

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-8">Verse Connections</h1>
      
      <div className="mb-8">
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Enter Verse (e.g., 2:183)</label>
        <input
          type="text"
          value={verse}
          onChange={(e) => setVerse(e.target.value)}
          className="w-full p-4 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 outline-none"
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-stone-200 dark:border-zinc-800">
        <VerseGraph verse={verse} />
      </div>
    </div>
  );
}
