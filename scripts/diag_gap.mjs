import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const BASE = 'http://localhost:4173';
const OUT = 'verify-shots';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
for (const vp of [
  { name: 'desktop-1440', w: 1440, h: 900 },
  { name: 'laptop-1280', w: 1280, h: 720 },
  { name: 'iphone-landscape', w: 844, h: 390 },
]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await sleep(300);
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-single').click().catch(() => {});
  await sleep(200);
  await page.getByTestId('start-match').click();
  await page.getByTestId('game-screen').waitFor();
  await page.locator('.ll-hex.claimable').first().click();
  await page.getByTestId('question-card').waitFor();
  await page.getByTestId('reveal-answer').click().catch(() => {});
  await sleep(300);
  const gap = await page.evaluate(() => {
    const card = document.querySelector('.qcard');
    const pad = document.querySelector('.hostpad');
    if (!card || !pad) return 'missing';
    return Math.round(pad.getBoundingClientRect().top - card.getBoundingClientRect().bottom);
  });
  console.log(`${vp.name.padEnd(18)} gap(card→hostpad)=${gap}px`);
  await page.screenshot({ path: `${OUT}/gap-${vp.name}.png` });
  await ctx.close();
}
await browser.close();
