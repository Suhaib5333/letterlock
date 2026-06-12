import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Root-hosted on Cloudflare Pages (auto-deploys dist/ on push). `base` overridable
// via BASE_PATH for subpath hosts; in-app URLs use import.meta.env.BASE_URL regardless.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
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
