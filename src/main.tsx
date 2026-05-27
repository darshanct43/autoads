import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { disableDevWebsocketLogs } from './lib/websocketProtection.ts';
import './lib/razorpay-direct.ts';

import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';

// Immediately disable WS / HMR logs and block WebSocket connections
disableDevWebsocketLogs();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary componentName="Application Root">
    <App />
  </ErrorBoundary>,
);
