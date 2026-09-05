// Low-end Android proxy: one board interaction under 4x CPU throttling (CDP
// Emulation.setCPUThrottlingRate), Pixel-7-sized viewport.
//   BASE=http://localhost:4183 node scripts/perf_claim.mjs
// Reports, averaged over 3 claims: pick -> question card attached (ms), frames
// rendered in the 1.2 s after the award (claim pop + confetti), i.e. effective
// FPS, and long tasks (>50 ms) in that window. Same script before and after, so
// the two numbers compare.
import { chromium } from '@playwright/test';

const BASE = process.env.BASE || 'http://localhost:4173';
const RATE = Number(process.env.RATE || 4);
const WINDOW_MS = 1200;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => localStorage.setItem('letterlock.unlockall', '1'));
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });

await page.goto(BASE);
await page.getByTestId('play-button').click();
await page.getByTestId('mode-couch').click();
await page.getByTestId('mode-single').click();
await page.getByTestId('start-match').click();
await page.getByTestId('game-screen').waitFor();
await page.waitForTimeout(500);

const samples = [];
for (let i = 0; i < 3; i++) {
  const hex = page.locator('.ll-hex.claimable').nth(i * 3);
  const t0 = Date.now();
  await hex.click();
  await page.getByTestId('question-card').waitFor({ state: 'attached' });
  const pickMs = Date.now() - t0;
  // Arm frame + long-task counters, then award (claim pop + confetti burst).
  await page.evaluate((win) => {
    const w = window;
    w.__frames = 0;
    w.__long = 0;
    w.__longMs = 0;
    const start = performance.now();
    const tick = () => {
      if (performance.now() - start > win) return;
      w.__frames++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          w.__long++;
          w.__longMs += e.duration;
        }
      });
      po.observe({ type: 'longtask', buffered: false });
      setTimeout(() => po.disconnect(), win + 50);
    } catch {
      /* longtask unsupported */
    }
  }, WINDOW_MS);
  await page.getByTestId('award-A').click();
  await page.waitForTimeout(WINDOW_MS + 150);
  const m = await page.evaluate(() => ({ frames: window.__frames, long: window.__long, longMs: Math.round(window.__longMs) }));
  samples.push({ pickMs, fps: Math.round((m.frames / WINDOW_MS) * 1000), long: m.long, longMs: m.longMs });
  await page.waitForTimeout(300);
}
await browser.close();
const avg = (k) => Math.round(samples.reduce((a, s) => a + s[k], 0) / samples.length);
console.log(`CPU x${RATE}, 412x915, ${samples.length} claims`);
for (const s of samples) console.log(`  pick->card ${s.pickMs} ms | ${s.fps} fps during claim | long tasks ${s.long} (${s.longMs} ms)`);
console.log(`AVG pick->card ${avg('pickMs')} ms | ${avg('fps')} fps | long tasks ${avg('long')} (${avg('longMs')} ms)`);
