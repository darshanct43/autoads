import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if (typeof window !== 'undefined' && (window as any).autoAdsStartupCheckpoint) {
  (window as any).autoAdsStartupCheckpoint(3, 'completed', 'React JavaScript Bundle Loaded (Ok)');
  (window as any).autoAdsStartupCheckpoint(4, 'running', 'Mounting React Application');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
