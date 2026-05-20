export function disableDevWebsocketLogs() {
  // Override WebSocket globally to prevent any connection attempts
  try {
    if (typeof window !== 'undefined') {
      (window as any).WebSocket = undefined;
    }
  } catch (e) {}

  // Override console to ignore websocket and Vite HMR connection log messages or errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && (
      args[0].includes('[vite]') || 
      args[0].includes('websocket') || 
      args[0].includes('ws://') || 
      args[0].includes('wss://')
    )) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
}
