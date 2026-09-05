import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets several agents/sessions run e2e side by side (each gets its own
// preview server + build dir + API instance + database). Default stays 4173.
const PORT = Number(process.env.E2E_PORT || 4173);
const OUT = PORT === 4173 ? 'dist' : `dist-e2e-${PORT}`;
// The REAL local API (apps/api) runs alongside the web build: port = web port - 1000
// (4173 -> 3173, 4181 -> 3181), on its own Postgres database `ll_e2e_<port>` in the
// Docker `ll-pg` container (see tests-e2e/api-server.mjs). The web bundle is built
// with VITE_API_URL pointing at it, so auth, leaderboard and the Socket.IO lobby
// all run against the genuine backend, no mocks.
const API_PORT = Number(process.env.E2E_API_PORT || PORT - 1000);
const API_URL = `http://localhost:${API_PORT}`;
const WEB_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // CI retries twice; locally retry once too — the two-client online/realtime
  // reconnect tests are inherently timing-sensitive and can flake under heavy
  // local parallelism (a genuinely broken test still fails both attempts).
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // Pixel 7 is Chromium-based — exercises the mobile layout without a WebKit download.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'node tests-e2e/api-server.mjs',
      url: `${API_URL}/healthz`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: {
        API_PORT: String(API_PORT),
        WEB_URL,
        DATABASE_URL: process.env.E2E_DATABASE_URL || `postgresql://postgres:ll@localhost:55432/ll_e2e_${API_PORT}`,
      },
    },
    {
      command:
        PORT === 4173
          ? 'npm run build && npm run preview'
          : `npx vite build --outDir ${OUT} && npx vite preview --outDir ${OUT} --port ${PORT} --strictPort`,
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { VITE_API_URL: API_URL, VITE_APPLE_SERVICES_ID: '' },
    },
  ],
});
