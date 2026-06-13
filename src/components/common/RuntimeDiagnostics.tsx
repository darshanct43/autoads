import React, { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';

interface DebugLog {
  type: 'error' | 'warn' | 'info' | 'success';
  message: string;
  timestamp: string;
}

export default function RuntimeDiagnostics() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [cssStatus, setCssStatus] = useState<string>('Checking...');
  const [firebaseStatus, setFirebaseStatus] = useState<string>('Checking...');
  const [reactMounted, setReactMounted] = useState<boolean>(false);

  useEffect(() => {
    setReactMounted(true);

    const formatTime = () => {
      const now = new Date();
      return now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    };

    const addLog = (type: 'error' | 'warn' | 'info' | 'success', message: string) => {
      setLogs((prev) => [
        ...prev,
        { type, message, timestamp: formatTime() }
      ].slice(-50)); // Keep last 50 logs
    };

    addLog('info', 'Screen diagnostics engine initialized.');
    addLog('info', 'User Agent: ' + (navigator.userAgent || 'Unknown'));

    // 1. Capture window.onerror
    const handleError = (event: ErrorEvent) => {
      const msg = 'Error: ' + event.message + ' at ' + event.filename + ':' + event.lineno + ':' + event.colno;
      addLog('error', msg);
    };
    window.addEventListener('error', handleError);

    // 2. Capture unhandledrejection
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = 'Promise Rejected: ' + (reason && reason.message ? reason.message : String(reason));
      addLog('error', msg);
    };
    window.addEventListener('unhandledrejection', handleRejection);

    // 3. Capture Console.error and Console.warn
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = function (...args: any[]) {
      const msg = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');
      addLog('error', msg);
      originalConsoleError.apply(console, args);
    };

    console.warn = function (...args: any[]) {
      const msg = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');
      addLog('warn', msg);
      originalConsoleWarn.apply(console, args);
    };

    // 4. Check CSS load status
    try {
      const sheets = document.styleSheets;
      if (sheets && sheets.length > 0) {
        // Measure elements to verify classes are parsed & computed
        const testElem = document.createElement('div');
        testElem.className = 'bg-slate-50';
        testElem.style.position = 'absolute';
        testElem.style.visibility = 'hidden';
        document.body.appendChild(testElem);
        const style = window.getComputedStyle(testElem);
        const isTailwindParsed = style.backgroundColor === 'rgb(248, 250, 252)' || style.backgroundColor === '#f8fafc';
        document.body.removeChild(testElem);

        if (isTailwindParsed) {
          setCssStatus('LOADED (Tailwind Active, Computed OK)');
          addLog('success', 'Tailwind parsed & applied correctly.');
        } else {
          setCssStatus('LOADED (Raw stylesheets exists, but Tailwind style matches failed)');
          addLog('warn', 'CSS files loaded but Tailwind variables might be ignored. Computed BG: ' + style.backgroundColor);
        }
      } else {
        setCssStatus('FAILED (No stylesheets detected)');
        addLog('error', 'No stylesheet objects registered in document.');
      }
    } catch (e: any) {
      setCssStatus('ERROR checking CSS: ' + e.message);
      addLog('error', 'Failed during stylesheet inspection: ' + e.message);
    }

    // 5. Check Firebase Initialization
    try {
      if (db && auth) {
        setFirebaseStatus('SUCCESS (Firestore and Auth configured)');
        addLog('success', 'Firebase setup validated: db and auth loaded.');
      } else {
        setFirebaseStatus('FAILED (Loaded, but instances missing)');
        addLog('error', 'Firebase imported, but db or auth returned null/undefined.');
      }
    } catch (e: any) {
      setFirebaseStatus('ERROR: ' + e.message);
      addLog('error', 'Firebase check exception: ' + e.message);
    }

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 999999,
          background: '#d97706',
          color: '#ffffff',
          borderRadius: '4px',
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: 'bold',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'monospace',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
        id="show-debug-panel-btn"
      >
        [SHOW DEBUG]
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        width: '90%',
        maxWidth: '480px',
        maxHeight: '350px',
        background: '#0f172a',
        color: '#f1f5f9',
        borderRadius: '8px',
        border: '2px solid #334155',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.8), 0 8px 10px -6px rgba(0,0,0,0.8)',
        zIndex: 999999,
        padding: '12px',
        fontSize: '11px',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      id="runtime-debug-panel"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #334155',
          paddingBottom: '6px',
          marginBottom: '8px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 'bold', color: '#fbbf24', fontSize: '12px' }}>
          📺 EXTREME TV BOX DIAGNOSTICS (CHROME 91 / ANDROID 9)
        </span>
        <div>
          <button
            onClick={() => setLogs([])}
            style={{
              background: '#334155',
              border: 'none',
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '3px',
              marginRight: '6px',
              cursor: 'pointer',
              fontSize: '10px',
            }}
            id="clear-debug-logs"
          >
            Clear
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: '#ef4444',
              border: 'none',
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px',
            }}
            id="close-debug-panel"
          >
            Hide
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          background: '#1e293b',
          padding: '6px',
          borderRadius: '4px',
          marginBottom: '8px',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '4px',
          flexShrink: 0,
        }}
      >
        <div>
          <span style={{ color: '#94a3b8' }}>CSS Load:</span>{' '}
          <span style={{ color: cssStatus.indexOf('LOADED') === 0 ? '#4ade80' : '#f87171' }}>
            {cssStatus}
          </span>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>Firebase Status:</span>{' '}
          <span style={{ color: firebaseStatus.indexOf('SUCCESS') === 0 ? '#4ade80' : '#f87171' }}>
            {firebaseStatus}
          </span>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>React Success:</span>{' '}
          <span style={{ color: reactMounted ? '#4ade80' : '#f87171' }}>
            {reactMounted ? 'YES (Component Mounted)' : 'Checking...'}
          </span>
        </div>
      </div>

      {/* Logs Window */}
      <div
        style={{
          flexGrow: 1,
          overflowY: 'auto',
          background: '#020617',
          padding: '6px',
          borderRadius: '4px',
          border: '1px solid #1e293b',
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
            No logs captured yet. Try navigating, interacting, or reloading.
          </div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: '4px',
                lineHeight: '1.4',
                wordBreak: 'break-all',
                color:
                  log.type === 'error'
                    ? '#f87171'
                    : log.type === 'warn'
                    ? '#fbbf24'
                    : log.type === 'success'
                    ? '#4ade80'
                    : '#cbd5e1',
              }}
            >
              <span style={{ color: '#64748b' }}>[{log.timestamp}]</span>{' '}
              <span style={{ fontWeight: log.type === 'error' ? 'bold' : 'normal' }}>
                {log.type === 'error' ? '❌' : log.type === 'warn' ? '⚠️' : log.type === 'success' ? '✅' : 'ℹ️'}{' '}
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
