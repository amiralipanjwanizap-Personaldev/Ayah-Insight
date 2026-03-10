import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-stone-50/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-stone-200/60 dark:border-zinc-800/60 px-6 py-4">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-2 bg-emerald-700 dark:bg-emerald-600 rounded-lg text-white shadow-sm">
            <BookOpen size={20} />
          </div>
          <h1 className="text-xl font-serif font-bold tracking-tight text-stone-800 dark:text-stone-100">Ayah Insight</h1>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-stone-600 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-500">Home</Link>
          <Link to="/search" className="text-sm font-medium text-stone-600 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-500">Search by Meaning</Link>
          <Link to="/verse-graph" className="text-sm font-medium text-stone-600 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-500">Explore Connections</Link>
        </div>
      </div>
    </nav>
  );
}
