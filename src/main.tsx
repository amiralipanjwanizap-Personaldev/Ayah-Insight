import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register PWA service worker
const updateSW = registerSW({
  onNeedRefresh() {
    // Optional: show a prompt to user to refresh
  },
  onOfflineReady() {
    // Optional: show a message that app is ready for offline use
  },
});

// Capture beforeinstallprompt globally to ensure we don't miss it
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
