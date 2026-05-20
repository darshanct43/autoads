import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { disableDevWebsocketLogs } from './lib/websocketProtection.ts';

// Immediately disable WS / HMR logs and block WebSocket connections
disableDevWebsocketLogs();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
