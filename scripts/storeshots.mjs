#!/usr/bin/env node
// Store screenshots from the real build (LAUNCH_PLAN Phase 6).
//   BASE=http://localhost:4173 node scripts/storeshots.mjs            -> docs/store/shots/<device>/<n>-<screen>.png
//   BASE=http://localhost:4173 node scripts/storeshots.mjs --feature  -> also the 1024x500 Play feature graphic
// Screens: home, category browser, board mid-game, question, victory. No logos / fandom
// packs on screen (D10/D11): the default General Knowledge pack is used.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = 'docs/store/shots';
const DEVICES = {
  'iphone-6.9': { w: 440, h: 956, scale: 3 }, // 1320x2868
  'ipad-13': { w: 1032, h: 1376, scale: 2 }, // 2064x2752
  'play-phone': { w: 360, h: 640, scale: 3 }, // 1080x1920
  'play-tablet-10': { w: 800, h: 1280, scale: 2 }, // 1600x2560
  'android-tv': { w: 1920, h: 1080, scale: 1 },
};

const browser = await chromium.launch();
for (const [name, d] of Object.entries(DEVICES)) {
  const dir = `${OUT}/${name}`;
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.scale, isMobile: d.w < 900, hasTouch: d.w < 900 });
  const page = await ctx.newPage();
  const shot = (n, label) => page.screenshot({ path: `${dir}/${n}-${label}.png` });
  await page.goto(`${BASE}/?__nofunnel=1${name === 'android-tv' ? '&tv=1' : ''}`);
  await page.waitForLoadState('networkidle');
  await shot(1, 'home');
  const cat = page.getByTestId('open-category-menu').or(page.getByRole('button', { name: /category/i })).first();
  if (await cat.count()) {
    await cat.click();
    await page.waitForTimeout(400);
    await shot(2, 'categories');
    await page.keyboard.press('Escape');
  }
  // Start a couch game on the default pack via the existing e2e-friendly path.
  const play = page.getByTestId('play').or(page.getByRole('button', { name: /^play/i })).first();
  if (await play.count()) {
    await play.click();
    const couch = page.getByTestId('mode-couch').or(page.getByRole('button', { name: /couch/i })).first();
    if (await couch.count()) await couch.click();
    const start = page.getByTestId('start-game').or(page.getByRole('button', { name: /start/i })).first();
    if (await start.count()) await start.click();
    await page.waitForTimeout(600);
    await shot(3, 'board');
    const hex = page.locator('[role=gridcell]:not([aria-disabled=true])').nth(12);
    if (await hex.count()) {
      await hex.click();
      await page.waitForTimeout(500);
      await shot(4, 'question');
    }
  }
  await ctx.close();
  console.log(`${name}: done`);
}
if (process.argv.includes('--feature')) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 500 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?__nofunnel=1`);
  await page.waitForLoadState('networkidle');
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: `${OUT}/feature-graphic-1024x500.png` });
  await ctx.close();
}
await browser.close();
