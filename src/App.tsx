import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, ChevronRight, Loader2, Sparkles, History, Lightbulb, BookOpen, ArrowLeft, Moon, Sun, ArrowRight, MapPin, Quote } from 'lucide-react';

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Verse {
  number: number;
  text: string;
  numberInSurah: number;
}

interface Explanation {
  historical_context: string;
  modern_reflection: string;
  illustrative_story: string;
}

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [translations, setTranslations] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Navigation State
  const [view, setView] = useState<'home' | 'surahs' | 'verses' | 'reader'>('home');
  const [activeVerseNum, setActiveVerseNum] = useState<number | null>(null);
  
  // Explanation State
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Fetch Surahs on load
  useEffect(() => {
    fetch('https://api.alquran.cloud/v1/surah')
      .then(res => res.json())
      .then(data => setSurahs(data.data));
  }, []);

  const selectSurah = async (surah: Surah) => {
    setSelectedSurah(surah);
    setView('verses');
    setLoading(true);
    try {
      const [arabicRes, englishRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${surah.number}`),
        fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/en.sahih`)
      ]);
      const arabicData = await arabicRes.json();
      const englishData = await englishRes.json();
      setVerses(arabicData.data.ayahs);
      setTranslations(englishData.data.ayahs);
    } catch (error) {
      console.error("Error fetching verses:", error);
    } finally {
      setLoading(false);
    }
  };

  const openVerseReader = async (verseNum: number) => {
    setActiveVerseNum(verseNum);
    setView('reader');
    setExplanation(null);
    
    generateExplanation(verseNum);
  };

  const generateExplanation = async (verseNum: number) => {
    if (!selectedSurah) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surah: selectedSurah.number,
          verse: verseNum,
          translation: translations[verseNum - 1]?.text || "",
          surah_name: selectedSurah.englishName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate insight');
      }

      const result = await response.json();
      setExplanation(result);
    } catch (error) {
      console.error("Error fetching explanation:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 text-stone-900 dark:text-stone-100 font-sans transition-colors duration-300 selection:bg-emerald-500/30">
      
      {/* Header */}
      <header className="sticky top-0 z-20 bg-stone-50/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-stone-200/60 dark:border-zinc-800/60 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('home')}>
          <div className="p-2 bg-emerald-700 dark:bg-emerald-600 rounded-lg text-white shadow-sm group-hover:shadow-md transition-all">
            <BookOpen size={20} />
          </div>
          <h1 className="text-xl font-serif font-bold tracking-tight text-stone-800 dark:text-stone-100">Ayah Insight</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {view !== 'home' && (
            <button 
              onClick={() => setView('surahs')}
              className="text-sm font-medium text-stone-500 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-500 transition-colors hidden sm:block"
            >
              Browse Surahs
            </button>
          )}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors text-stone-500 dark:text-zinc-400"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 min-h-[80vh]">
        <AnimatePresence mode="wait">
          
          {/* PAGE 1: HOME SCREEN */}
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-20 py-12"
            >
              {/* Hero Section */}
              <section className="text-center space-y-8 max-w-3xl mx-auto px-4">
                <h2 className="text-5xl sm:text-6xl md:text-7xl font-serif font-bold text-stone-900 dark:text-stone-50 tracking-tight">
                  Understand Every <span className="text-emerald-700 dark:text-emerald-500 italic">Ayah</span>
                </h2>
                <p className="text-lg sm:text-xl text-stone-600 dark:text-zinc-400 leading-relaxed">
                  Explore the Qur’an through translation, historical context, and thoughtful reflections that connect timeless verses with everyday life.
                </p>
                <button 
                  onClick={() => setView('surahs')}
                  className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-8 py-4 rounded-full font-medium transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  Begin Reading <ArrowRight size={18} />
                </button>
              </section>

              {/* Verse of the Day */}
              <section className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 sm:p-12 shadow-sm border border-stone-200/60 dark:border-zinc-800 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600/20 dark:bg-emerald-500/20"></div>
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-500 mb-8">
                    <Quote size={20} />
                    <span className="text-sm font-bold uppercase tracking-widest">Verse of the Day</span>
                  </div>
                  <p className="font-arabic text-4xl sm:text-5xl leading-[2.5] text-right text-stone-900 dark:text-stone-50 mb-8" dir="rtl">
                    فَإِنَّ مَعَ الْعُسْرِ يُسْرًا
                  </p>
                  <p className="font-serif text-xl sm:text-2xl text-stone-800 dark:text-zinc-300 italic mb-4">
                    "For indeed, with hardship [will be] ease."
                  </p>
                  <p className="text-sm font-medium text-stone-500 dark:text-zinc-500 uppercase tracking-widest">
                    Surah Ash-Sharh (94:5)
                  </p>
                </div>
              </section>

              {/* Core Pillars */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="space-y-4 text-center md:text-left">
                  <div className="w-12 h-12 mx-auto md:mx-0 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 rounded-2xl flex items-center justify-center mb-6">
                    <History size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">Historical Context</h3>
                  <p className="text-stone-600 dark:text-zinc-400 leading-relaxed">
                    Understand the circumstances of revelation and the historical background behind each verse.
                  </p>
                </div>
                <div className="space-y-4 text-center md:text-left">
                  <div className="w-12 h-12 mx-auto md:mx-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                    <Lightbulb size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">Modern Reflection</h3>
                  <p className="text-stone-600 dark:text-zinc-400 leading-relaxed">
                    Discover how timeless wisdom applies to modern challenges and everyday life in the 21st century.
                  </p>
                </div>
                <div className="space-y-4 text-center md:text-left">
                  <div className="w-12 h-12 mx-auto md:mx-0 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                    <Book size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">Illustrative Story</h3>
                  <p className="text-stone-600 dark:text-zinc-400 leading-relaxed">
                    Read relatable stories and parables that beautifully illustrate the core message of the verse.
                  </p>
                </div>
              </section>
            </motion.div>
          )}

          {/* PAGE 2: SURAH LIST */}
          {view === 'surahs' && (
            <motion.div 
              key="surahs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">The Noble Qur'an</h2>
                <span className="text-sm font-medium text-stone-500 dark:text-zinc-500 bg-stone-200/50 dark:bg-zinc-800/50 px-4 py-1.5 rounded-full">
                  114 Surahs
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {surahs.map(surah => (
                  <button
                    key={surah.number}
                    onClick={() => selectSurah(surah)}
                    className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200/60 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-emerald-600/30 dark:hover:border-emerald-500/30 transition-all text-left flex flex-col h-full group"
                  >
                    <div className="flex justify-between items-start w-full mb-6">
                      <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-stone-500 dark:text-zinc-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {surah.number}
                      </div>
                      <div className="text-2xl font-arabic text-stone-800 dark:text-stone-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-500 transition-colors">
                        {surah.name}
                      </div>
                    </div>
                    <div className="flex-grow mb-6">
                      <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">{surah.englishName}</h3>
                      <p className="text-sm text-stone-500 dark:text-zinc-400 italic">{surah.englishNameTranslation}</p>
                    </div>
                    <div className="pt-4 border-t border-stone-100 dark:border-zinc-800 flex justify-between items-center text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} className={surah.revelationType === 'Meccan' ? 'text-amber-500' : 'text-emerald-500'} /> 
                        {surah.revelationType}
                      </span>
                      <span>{surah.numberOfAyahs} Verses</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* VERSE LIST (Intermediate step) */}
          {view === 'verses' && selectedSurah && (
            <motion.div 
              key="verses"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 max-w-3xl mx-auto"
            >
              <button 
                onClick={() => setView('surahs')}
                className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors mb-8"
              >
                <ArrowLeft size={16} /> Back to Surahs
              </button>

              <div className="text-center mb-12 space-y-4">
                <h2 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900 dark:text-stone-100">{selectedSurah.englishName}</h2>
                <p className="text-lg text-stone-500 dark:text-zinc-400 italic">{selectedSurah.englishNameTranslation}</p>
                <div className="flex items-center justify-center gap-4 text-sm font-medium uppercase tracking-widest text-stone-400 dark:text-zinc-500 pt-4">
                  <span>{selectedSurah.revelationType}</span>
                  <span>•</span>
                  <span>{selectedSurah.numberOfAyahs} Verses</span>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="animate-spin text-emerald-600" size={40} />
                </div>
              ) : (
                <div className="space-y-6">
                  {verses.map((verse, idx) => (
                    <div 
                      key={verse.number}
                      className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-stone-200/60 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-colors cursor-pointer group"
                      onClick={() => openVerseReader(verse.numberInSurah)}
                    >
                      <div className="flex flex-col gap-6">
                        <p className="text-3xl sm:text-4xl leading-[2.5] text-right font-arabic text-stone-900 dark:text-stone-50" dir="rtl">
                          {verse.text}
                          <span className="inline-flex items-center justify-center w-10 h-10 ml-4 rounded-full border border-stone-200 dark:border-zinc-700 text-sm font-sans text-stone-400 dark:text-zinc-500 align-middle">
                            {verse.numberInSurah}
                          </span>
                        </p>
                        <p className="text-stone-600 dark:text-zinc-300 italic font-serif text-lg leading-relaxed">
                          {translations[idx]?.text}
                        </p>
                        <div className="mt-4 flex justify-end">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-500 group-hover:translate-x-1 transition-transform">
                            Read & Understand <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* PAGE 3: VERSE READER */}
          {view === 'reader' && selectedSurah && activeVerseNum && (
            <motion.div 
              key="reader"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8 pb-20 max-w-3xl mx-auto"
            >
              <button 
                onClick={() => setView('verses')}
                className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors mb-6"
              >
                <ArrowLeft size={16} /> Back to {selectedSurah.englishName}
              </button>

              {/* Header */}
              <header className="flex items-center justify-between pb-6 border-b border-stone-200/60 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-stone-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-stone-500 dark:text-zinc-400 font-bold">
                    {activeVerseNum}
                  </div>
                  <div>
                    <h1 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">{selectedSurah.englishName}</h1>
                    <p className="text-sm text-stone-500 dark:text-zinc-400 uppercase tracking-widest mt-1">Verse {activeVerseNum}</p>
                  </div>
                </div>
                <div className="text-3xl font-arabic text-stone-400 dark:text-zinc-600">
                  {selectedSurah.name}
                </div>
              </header>

              {/* SECTION 1: Quran Text */}
              <section className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-stone-200/60 dark:border-zinc-800 p-8 sm:p-12">
                <div className="space-y-10">
                  <div className="flex justify-end">
                    <p className="text-4xl sm:text-5xl md:text-6xl leading-[2.5] sm:leading-[2.5] md:leading-[2.5] text-right font-arabic text-stone-900 dark:text-stone-50" dir="rtl">
                      {verses[activeVerseNum - 1]?.text}
                      <span className="inline-flex items-center justify-center w-12 h-12 ml-6 rounded-full border-2 border-stone-100 dark:border-zinc-800 text-lg font-sans text-stone-400 dark:text-zinc-500 align-middle">
                        {activeVerseNum}
                      </span>
                    </p>
                  </div>
                  
                  <hr className="border-stone-100 dark:border-zinc-800" />
                  
                  <div>
                    <p className="text-xl sm:text-2xl leading-relaxed text-stone-800 dark:text-zinc-300 font-serif italic">
                      "{translations[activeVerseNum - 1]?.text}"
                    </p>
                  </div>
                </div>
              </section>

              {/* SECTION 2: Verse Insight */}
              <section className="space-y-8 pt-8">
                <div className="flex items-center justify-center gap-3 mb-8">
                  <div className="h-px bg-stone-200 dark:bg-zinc-800 flex-grow"></div>
                  <Sparkles size={18} className="text-emerald-600 dark:text-emerald-500" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-zinc-400">
                    Verse Insight
                  </h2>
                  <div className="h-px bg-stone-200 dark:bg-zinc-800 flex-grow"></div>
                </div>

                {isGenerating ? (
                  <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-stone-200/60 dark:border-zinc-800 p-16 flex flex-col items-center justify-center gap-6">
                    <Loader2 className="animate-spin text-emerald-600" size={48} />
                    <p className="text-stone-500 dark:text-zinc-400 font-medium text-lg">Seeking knowledge...</p>
                  </div>
                ) : explanation ? (
                  <div className="grid gap-6">
                    {/* Historical Context Card */}
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-3xl p-8 sm:p-10 border border-amber-100/50 dark:border-amber-900/30">
                      <div className="flex items-center gap-3 mb-6 text-amber-700 dark:text-amber-500">
                        <History size={24} />
                        <h3 className="text-lg font-bold tracking-wide">Historical Context</h3>
                      </div>
                      <p className="text-stone-700 dark:text-zinc-300 leading-relaxed text-lg">
                        {explanation.historical_context}
                      </p>
                    </div>

                    {/* Modern Reflection Card */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-3xl p-8 sm:p-10 border border-emerald-100/50 dark:border-emerald-900/30">
                      <div className="flex items-center gap-3 mb-6 text-emerald-700 dark:text-emerald-500">
                        <Lightbulb size={24} />
                        <h3 className="text-lg font-bold tracking-wide">Modern Reflection</h3>
                      </div>
                      <p className="text-stone-700 dark:text-zinc-300 leading-relaxed text-lg">
                        {explanation.modern_reflection}
                      </p>
                    </div>

                    {/* Story Explanation Card */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-3xl p-8 sm:p-10 border border-indigo-100/50 dark:border-indigo-900/30">
                      <div className="flex items-center gap-3 mb-6 text-indigo-700 dark:text-indigo-400">
                        <Book size={24} />
                        <h3 className="text-lg font-bold tracking-wide">Illustrative Story</h3>
                      </div>
                      <p className="text-stone-800 dark:text-zinc-200 leading-relaxed text-lg italic font-serif">
                        "{explanation.illustrative_story}"
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-stone-200/60 dark:border-zinc-800 p-12 text-center">
                    <button 
                      onClick={() => generateExplanation(activeVerseNum)}
                      className="bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 text-white px-8 py-4 rounded-full font-medium transition-all shadow-sm hover:shadow-md text-lg"
                    >
                      Reveal Insights
                    </button>
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-stone-100 dark:bg-zinc-900 border-t border-stone-200/60 dark:border-zinc-800 py-16 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            <div>
              <h3 className="text-xl font-serif font-bold mb-6 flex items-center gap-3 text-stone-900 dark:text-stone-100">
                <BookOpen size={20} className="text-emerald-700 dark:text-emerald-500" />
                Ayah Insight
              </h3>
              <p className="text-stone-600 dark:text-zinc-400 leading-relaxed mb-6">
                Ayah Insight helps readers explore the Qur’an through translation, historical context, and thoughtful reflections that connect timeless verses with everyday life.
              </p>
              <p className="text-stone-600 dark:text-zinc-400 leading-relaxed">
                The Arabic text of the Qur’an is presented for reading and learning purposes. Historical explanations, reflections, and stories are educational interpretations intended to help readers understand the message and wisdom of each verse.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold mb-6 text-stone-900 dark:text-stone-100">About the Project</h3>
              <p className="text-stone-600 dark:text-zinc-400 leading-relaxed mb-6">
                Ayah Insight is built to help people engage with the Qur’an in a reflective and meaningful way by combining traditional knowledge with modern technology.
              </p>
              <div className="p-5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/50">
                <p className="text-sm text-amber-800 dark:text-amber-400 leading-relaxed">
                  <strong>Disclaimer:</strong> For deeper religious guidance, users are encouraged to consult qualified scholars and trusted Islamic sources.
                </p>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-stone-200/60 dark:border-zinc-800 text-center">
            <p className="text-sm text-stone-500 dark:text-zinc-500">
              © 2026 Ayah Insight. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
