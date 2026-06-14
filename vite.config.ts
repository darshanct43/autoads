import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  define: {
    'process.env': {},
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome91',
  },
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});
