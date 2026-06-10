import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Path-based URLs so room deep-links work cleanly on the VPS (plan §4 / 13.2).
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    target: 'es2021',
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    host: true,
  },
});
