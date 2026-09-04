import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets several agents/sessions run e2e side by side (each gets its own
// preview server + build dir). Default stays 4173.
const PORT = Number(process.env.E2E_PORT || 4173);
const OUT = PORT === 4173 ? 'dist' : `dist-e2e-${PORT}`;

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
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // Pixel 7 is Chromium-based — exercises the mobile layout without a WebKit download.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: PORT === 4173 ? 'npm run build && npm run preview' : `npx vite build --outDir ${OUT} && npx vite preview --outDir ${OUT} --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
