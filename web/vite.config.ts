import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      '@tokens': path.resolve(__dirname, '../shared/tokens'),
      '@mocks': path.resolve(__dirname, '../shared/mocks')
    }
  },
  define: {
    // Polyfill for Node.js globals required by simple-peer and its dependencies
    global: 'globalThis',
    'process.env': {}
  },
  server: {
    port: 5173
  }
});
