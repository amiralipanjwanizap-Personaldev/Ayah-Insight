import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('installBannerDismissed');
    
    // Check if it was already captured globally
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
      if (!isDismissed) {
        setShowBanner(true);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      if (!isDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowBanner(false);
      localStorage.setItem('installBannerDismissed', 'true');
    }
    setDeferredPrompt(null);
    (window as any).deferredPrompt = null;
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('installBannerDismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 md:hidden">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-stone-200 dark:border-zinc-800 p-4 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="font-bold text-stone-900 dark:text-stone-100">Ayah Insight</span>
          <span className="text-sm text-stone-500 dark:text-zinc-400">Install for a better experience</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDismiss}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200"
            aria-label="Dismiss"
          >
            <X size={20} />
          </button>
          <button 
            onClick={handleInstall}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
          >
            <Download size={16} /> Install
          </button>
        </div>
      </div>
    </div>
  );
}
