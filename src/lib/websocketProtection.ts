export function disableDevWebsocketLogs() {
  if (import.meta.env.PROD) {
    // Override console to ignore websocket errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('[vite]')) {
        return;
      }
      originalConsoleError.apply(console, args);
    };
  }
}
