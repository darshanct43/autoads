import * as React from 'react';

export default function LoaderPage() {
  const [attempts, setAttempts] = React.useState(0);
  const [status, setStatus] = React.useState<'CONNECTING' | 'FAILED' | 'SUCCESS'>('CONNECTING');
  const [dots, setDots] = React.useState('...');

  // Blinking dots animation
  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        if (prev === '') return '.';
        if (prev === '.') return '..';
        return '...';
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Main connectivity loop
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkConnectivity = async () => {
      setAttempts(prev => prev + 1);
      setStatus('CONNECTING');

      try {
        const img = new Image();
        const timestamp = new Date().getTime();
        
        const loadPromise = new Promise((resolve, reject) => {
          img.onload = () => resolve(true);
          img.onerror = () => reject(new Error('Failed to load image'));
          // Set a timeout for the fetch itself
          setTimeout(() => reject(new Error('Timeout')), 4000);
        });

        img.src = `/icon.png?t=${timestamp}`;
        
        await loadPromise;
        
        // Success
        setStatus('SUCCESS');
        // Removed: window.location.href = '/' to prevent infinite refresh cycles when used as a component in App.tsx
      } catch (err) {
        // Failure
        setStatus('FAILED');
        timeoutId = setTimeout(checkConnectivity, 5000);
      }
    };

    checkConnectivity();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Backup auto-reload every 30 seconds
  React.useEffect(() => {
    const reloadTimer = setTimeout(() => {
      window.location.reload();
    }, 30000);
    return () => clearTimeout(reloadTimer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-center select-none font-sans overflow-hidden">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-[#FFD700] uppercase italic">
          AutoAds
        </h1>
        
        <div className="h-12 flex flex-col items-center">
          {status === 'CONNECTING' && (
            <p className="text-white/60 text-sm font-medium tracking-[0.2em] uppercase">
              Connecting{dots}
            </p>
          )}
          
          {status === 'FAILED' && (
            <p className="text-rose-500 text-sm font-bold tracking-tight uppercase">
              No internet. Retry in 5s... (Attempt {attempts})
            </p>
          )}

          {status === 'SUCCESS' && (
            <p className="text-emerald-500 text-sm font-bold tracking-widest uppercase animate-pulse">
              Internet Found. Launching TV...
            </p>
          )}
        </div>
      </div>

      {/* Attempt Counter - Subtle Indicator */}
      <div className="absolute bottom-8 text-white/10 text-[10px] font-mono tracking-widest uppercase">
        Network Stack Diagnostics: Cycle {attempts}
      </div>

      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FFD700]/5 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
