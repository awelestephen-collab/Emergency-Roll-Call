import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA installability and offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = (import.meta.env.BASE_URL || './') + 'sw.js';
    navigator.serviceWorker.register(swPath).then((reg) => {
      console.log('Emergency Roll Call SW registered:', reg.scope);
    }).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

