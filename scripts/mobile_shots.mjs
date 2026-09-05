// Before/after screenshots for the mobile rehaul (LAUNCH_PLAN Phase 1b).
//   BASE=http://localhost:4183 TAG=before node scripts/mobile_shots.mjs
// Writes docs/mobile-rehaul/<TAG>/<viewport>-<screen>.jpg (JPEG q55 keeps the
// whole set well under 3 MB). Same screens, same viewports, both tags, so the two
// folders diff 1:1.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:4173';
const TAG = process.env.TAG || 'after';
const OUT = `docs/mobile-rehaul/${TAG}`;
mkdirSync(OUT, { recursive: true });
const VIEWPORTS = [
  { name: 'pixel7', w: 412, h: 915 },
  { name: 'iphone-se', w: 375, h: 667 },
  { name: 'iphone-landscape', w: 844, h: 390 },
  { name: 'se-landscape', w: 667, h: 375 },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => localStorage.setItem('letterlock.unlockall', '1'));
  const page = await ctx.newPage();
  const shot = async (name) => {
    await sleep(350);
    await page.screenshot({ path: `${OUT}/${vp.name}-${name}.jpg`, type: 'jpeg', quality: 55 });
  };
  await page.goto(BASE);
  await shot('home');
  await page.getByTestId('play-button').click();
  await shot('mode-select');
  await page.getByTestId('mode-couch').click().catch(() => {});
  await page.getByTestId('mode-single').click().catch(() => {});
  await shot('setup');
  await page.getByTestId('start-match').click();
  await page.getByTestId('game-screen').waitFor();
  await shot('game-pick');
  await page.locator('.ll-hex.claimable').first().click();
  await page.getByTestId('question-card').waitFor();
  await shot('game-question');
  await page.getByTestId('reveal-answer').click().catch(() => {});
  await shot('game-revealed');
  await page.goto(`${BASE}/?room=TESTAB&view=controller&name=Tester`);
  await shot('controller');
  await ctx.close();
}
await browser.close();
console.log(`wrote ${OUT}`);
