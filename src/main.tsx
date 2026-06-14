// STAGE 0: Initialize Global Forensic Log Tracker Immediately
if (typeof window !== 'undefined') {
  (window as any).__forensic_logs = (window as any).__forensic_logs || [];
  const log = (type: string, ...args: any[]) => {
    const msg = args.map(arg => {
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch(e) { return String(arg); }
      }
      return String(arg);
    }).join(' ');
    (window as any).__forensic_logs.push(`[${new Date().toISOString().split('T')[1].slice(0, -1)}] [${type}] ${msg}`);
  };

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = (...args) => {
    origLog.apply(console, args);
    log('INFO', ...args);
  };
  console.warn = (...args) => {
    origWarn.apply(console, args);
    log('WARN', ...args);
  };
  console.error = (...args) => {
    origError.apply(console, args);
    log('ERROR', ...args);
  };

  console.log("[FORENSIC] Global forensic logs initialized");

  // Setup unhandled error catchers at the very earliest stage
  window.addEventListener('error', (event) => {
    const errorDetails = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
    console.error("[CRITICAL UNCAUGHT ERROR]", errorDetails);
    showRedFatalScreen(event.error || new Error(event.message));
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.stack || reason.message : String(reason);
    console.error("[CRITICAL UNHANDLED REJECTION]", msg);
    showRedFatalScreen(reason instanceof Error ? reason : new Error(msg));
  });
}

function showRedFatalScreen(error: Error) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('forensic-fatal-screen');
  if (existing) return;

  const logs = (window as any).__forensic_logs || [];
  const logsHtml = logs.map((l: string) => {
    let colorStyle = 'color: #cbd5e1;';
    if (l.includes('[ERROR]')) colorStyle = 'color: #f87171;';
    if (l.includes('[WARN]')) colorStyle = 'color: #fbbf24;';
    return `<div style="padding: 2px 0; border-bottom: 1px solid #1e293b; font-family: monospace; white-space: pre-wrap; ${colorStyle}">${l}</div>`;
  }).join('');

  const overlay = document.createElement('div');
  overlay.id = 'forensic-fatal-screen';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = '#0f172a';
  overlay.style.color = '#f1f5f9';
  overlay.style.padding = '16px';
  overlay.style.boxSizing = 'border-box';
  overlay.style.overflowY = 'auto';
  overlay.style.zIndex = '999999';

  overlay.innerHTML = `
    <div style="max-width: 650px; margin: 12px auto; background: #1e293b; border-radius: 12px; border: 3px solid #ef4444; padding: 20px; font-family: system-ui, -apple-system, sgo, monospace; line-height: 1.4;">
      <div style="display: flex; align-items: center; justify-between: center; gap: 8px; margin-bottom: 14px;">
        <span style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; letter-spacing: 0.5px;">FORENSIC FATAL CAPTURE</span>
        <span style="font-size: 11px; color: #94a3b8;">Active Session Logs</span>
      </div>
      
      <div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; padding: 12px; border-radius: 4px; margin-bottom: 16px; word-break: break-all;">
        <div style="font-weight: bold; color: #f87171; font-size: 13px; margin-bottom: 6px;">Error Detected: ${error.name || 'FatalError'}: ${error.message}</div>
        <pre style="margin: 0; font-size: 9px; color: #e2e8f0; font-family: monospace; overflow-x: auto; max-height: 120px; white-space: pre-wrap;">${error.stack || 'No stack trace captured.'}</pre>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 11px; font-weight: bold; color: #38bdf8; margin-bottom: 6px; letter-spacing: 0.5px;">STARTUP SEQUENCER TIMELINE (LATEST FIRST):</div>
        <div style="background: #0f172a; border-radius: 6px; padding: 10px; max-height: 200px; overflow-y: auto; font-size: 9px; border: 1px solid #334155; font-family: monospace;">
          ${logsHtml || '<div style="color: #64748b;">No logs recorded prior to the exception.</div>'}
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
        <div style="font-size: 10px; color: #cbd5e1; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase;">Capacitor Native Emergency Bypass:</div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          <button id="forensic-btn-offline-customer" style="flex: 1; min-width: 130px; background: #ea580c; border: none; color: white; padding: 8px; font-family: monospace; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 10px; text-transform: uppercase;">
            Force Customer (Offline)
          </button>
          <button id="forensic-btn-offline-driver" style="flex: 1; min-width: 130px; background: #a21caf; border: none; color: white; padding: 8px; font-family: monospace; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 10px; text-transform: uppercase;">
            Force Driver (Offline)
          </button>
          <button id="forensic-btn-clear" style="background: #4b5563; border: none; color: white; padding: 8px 12px; font-family: monospace; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 10px; text-transform: uppercase;">
            Reset Storage
          </button>
          <button id="forensic-btn-reload" style="background: #2563eb; border: none; color: white; padding: 8px 12px; font-family: monospace; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 10px; text-transform: uppercase;">
            Reload
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Bind emergency button handlers
  document.getElementById('forensic-btn-offline-customer')?.addEventListener('click', () => {
    try {
      localStorage.setItem('auto_ads_offline_mode', 'true');
      localStorage.setItem('auto_ads_offline_role', 'CUSTOMER');
      window.location.reload();
    } catch(e) {
      alert("Localstorage write error: " + String(e));
    }
  });

  document.getElementById('forensic-btn-offline-driver')?.addEventListener('click', () => {
    try {
      localStorage.setItem('auto_ads_offline_mode', 'true');
      localStorage.setItem('auto_ads_offline_role', 'DRIVER');
      window.location.reload();
    } catch(e) {
      alert("Localstorage write error: " + String(e));
    }
  });

  document.getElementById('forensic-btn-clear')?.addEventListener('click', () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch(e) {
      alert("Localstorage clear error: " + String(e));
    }
  });

  document.getElementById('forensic-btn-reload')?.addEventListener('click', () => {
    window.location.reload();
  });
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log("[FORENSIC] Rendering React Root");
try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("[FORENSIC] Render call queued");
} catch (err) {
  console.error("[FORENSIC] Render crashed synchronously:", err);
  if (err instanceof Error) {
    showRedFatalScreen(err);
  } else {
    showRedFatalScreen(new Error(String(err)));
  }
}

