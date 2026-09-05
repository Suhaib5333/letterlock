import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Root-hosted on Cloudflare Pages (auto-deploys dist/ on push). `base` overridable
// via BASE_PATH for subpath hosts; in-app URLs use import.meta.env.BASE_URL regardless.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  // Build version for the remote `minBundle` gate (src/lib/appConfig.ts).
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
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
