import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const OUT = 'verify-shots';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
const p = await c.newPage();
await p.goto('http://localhost:4173');
await sleep(300);
await p.getByTestId('open-categories').click();
await sleep(200);
await p.getByTestId('pack-movies-clips-easy').click();
await sleep(200);
await p.getByTestId('play-button').click();
await p.getByTestId('mode-single').click().catch(() => {});
await p.getByTestId('start-match').click();
await p.getByTestId('game-screen').waitFor();
await p.locator('.ll-hex.claimable').first().click();
await p.getByTestId('question-card').waitFor();
await sleep(3500); // let the player become ready (cover enabled)

// 1) BEFORE play — cover should fully hide the poster/title.
const before = await p.evaluate(() => {
  const cover = document.querySelector('[data-testid="qcard-yt-play"]');
  const mask = document.querySelector('.qcard-yt-mask');
  const coverRect = cover?.getBoundingClientRect();
  const stage = document.querySelector('.qcard-yt-stage')?.getBoundingClientRect();
  return {
    coverPresent: !!cover,
    coverDisabled: cover ? cover.disabled : null,
    coverCoversStage: coverRect && stage ? Math.round(coverRect.width) >= Math.round(stage.width) - 2 && Math.round(coverRect.height) >= Math.round(stage.height) - 2 : null,
    maskPresent: !!mask,
  };
});
console.log('BEFORE play:', JSON.stringify(before));
await p.screenshot({ path: `${OUT}/spoiler-covered.png` });

// 2) Click play → cover hides, video plays, title masked.
await p.getByTestId('qcard-yt-play').click();
await sleep(4000);
const after = await p.evaluate(() => {
  const cover = document.querySelector('[data-testid="qcard-yt-play"]');
  const mask = document.querySelector('.qcard-yt-mask');
  const m = mask?.getBoundingClientRect();
  return { coverGone: !cover, maskHeight: m ? Math.round(m.height) : null };
});
console.log('AFTER play:', JSON.stringify(after));
await p.screenshot({ path: `${OUT}/spoiler-playing.png` });
await c.close();
await b.close();
