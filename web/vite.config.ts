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
  server: {
    port: 5173
  }
});
