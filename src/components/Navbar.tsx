import { BookOpen, Moon, Sun } from 'lucide-react';

interface NavbarProps {
  setView: (view: 'home' | 'surahs' | 'verses' | 'reader' | 'favorites' | 'search' | 'verse-graph') => void;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
}

export default function Navbar({ setView, darkMode, setDarkMode }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-stone-50/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-stone-200/60 dark:border-zinc-800/60 px-6 py-4">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <button onClick={() => setView('home')} className="flex items-center gap-3 group">
          <div className="p-2 bg-emerald-700 dark:bg-emerald-600 rounded-lg text-white shadow-sm">
            <BookOpen size={20} />
          </div>
          <h1 className="text-xl font-serif font-bold tracking-tight text-stone-800 dark:text-stone-100">Ayah Insight</h1>
        </button>
        <div className="flex items-center gap-6">
          <button onClick={() => setView('home')} className="text-sm font-medium text-stone-600 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-500">Home</button>
          <button onClick={() => setView('surahs')} className="text-sm font-medium text-stone-600 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-500">Read Quran</button>
          <button onClick={() => setView('search')} className="text-sm font-medium text-stone-600 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-500">Search by Meaning</button>
          <button onClick={() => setView('verse-graph')} className="text-sm font-medium text-stone-600 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-500">Explore Connections</button>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors text-stone-500 dark:text-zinc-400"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
