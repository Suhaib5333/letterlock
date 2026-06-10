import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = 'shots';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-15', width: 393, height: 852 },
  { name: 'iphone-promax', width: 430, height: 932 },
  { name: 'phone-landscape', width: 740, height: 360 },
  { name: 'ipad-portrait', width: 768, height: 1024 },
  { name: 'ipad-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tv-1080', width: 1920, height: 1080 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(page, name) {
  await sleep(450);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    ...(devices['Pixel 7'].userAgent && vp.width < 500 ? { isMobile: true, hasTouch: true } : {}),
  });
  const page = await ctx.newPage();

  // Home
  await page.goto(BASE);
  await shoot(page, `${vp.name}-1-home`);

  // Setup
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-single').click().catch(() => {});
  await shoot(page, `${vp.name}-2-setup`);

  // Game (pick phase)
  await page.getByTestId('start-match').click();
  await page.getByTestId('game-screen').waitFor();
  await shoot(page, `${vp.name}-3-game-pick`);

  // Game (question phase)
  await page.locator('.ll-hex.claimable').first().click();
  await page.getByTestId('question-card').waitFor();
  await page.getByTestId('reveal-answer').click().catch(() => {});
  await shoot(page, `${vp.name}-4-game-question`);

  await ctx.close();
}
await browser.close();
console.log('done');
