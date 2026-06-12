// Focused before/after verification for this session's 4 fixes:
//  1. Movie-clips pack exists + the YouTube trailer iframe renders.
//  2. Exit-modal "Keep playing" arrow pinned left on its own.
//  3. Steal-phase timer (no whole-phase blink; label not truncated; refill clean).
//  4. iPhone portrait + landscape: question card + host pad fully visible.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = 'verify-shots';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();

async function gotoBoard(page, packId, { single = true } = {}) {
  await page.goto(BASE);
  await sleep(300);
  if (packId) await page.getByTestId(`pack-${packId}`).click().catch(() => {});
  await page.getByTestId('play-button').click();
  if (single) await page.getByTestId('mode-single').click().catch(() => {});
  await sleep(250);
  await page.getByTestId('start-match').click();
  await page.getByTestId('game-screen').waitFor();
  await sleep(300);
}

// ---- 1. Movie pack + trailer iframe ----
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await gotoBoard(page, 'movies-clips');
  await page.locator('.ll-hex.claimable').first().click();
  await page.getByTestId('question-card').waitFor();
  await sleep(400);
  const yt = await page.getByTestId('qcard-youtube').count();
  const src = yt ? await page.getByTestId('qcard-youtube').getAttribute('src') : '(none)';
  const qtext = await page.getByTestId('question-text').textContent();
  console.log(`1. MOVIE PACK: youtube iframe present=${yt > 0}`);
  console.log(`   q="${qtext}"`);
  console.log(`   src=${src}`);
  await page.screenshot({ path: `${OUT}/1-movie-trailer.png` });
  await ctx.close();
}

// ---- 2. Exit modal "Keep playing" arrow ----
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await gotoBoard(page, 'general-knowledge');
  await page.getByTestId('exit-btn').click();
  await page.getByTestId('exit-modal').waitFor();
  await sleep(300);
  const geo = await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="exit-cancel"]');
    const arrow = btn?.querySelector('.exit-keep-arrow');
    const br = btn.getBoundingClientRect();
    const ar = arrow.getBoundingClientRect();
    return { btnLeft: br.left, arrowLeft: ar.left, arrowFromBtnLeft: Math.round(ar.left - br.left) };
  });
  console.log(`2. EXIT KEEP-PLAYING: arrow is ${geo.arrowFromBtnLeft}px from button's left edge (pinned-left ✓ if small)`);
  await page.screenshot({ path: `${OUT}/2-exit-modal.png` });
  await ctx.close();
}

// ---- 3. Steal-phase timer (use a fast timer via Blitz) ----
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await sleep(300);
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-single').click().catch(() => {});
  // pick the shortest timer (20s → 10s steal) to reach the steal phase fast
  await page.getByTestId('timer-20').click().catch(() => {});
  await sleep(200);
  await page.getByTestId('start-match').click();
  await page.getByTestId('game-screen').waitFor();
  await page.locator('.ll-hex.claimable').first().click();
  await page.getByTestId('question-card').waitFor();
  // wait for the main phase to expire → steal
  let phase = 'main';
  for (let i = 0; i < 60 && phase !== 'steal'; i++) {
    await sleep(500);
    phase = (await page.getByTestId('timer').getAttribute('data-phase').catch(() => 'gone')) || 'gone';
  }
  const label = await page.locator('.timer-label').textContent().catch(() => '(none)');
  const truncated = await page.evaluate(() => {
    const l = document.querySelector('.timer-label');
    return l ? l.scrollWidth - l.clientWidth > 2 : null;
  });
  console.log(`3. STEAL TIMER: reached phase=${phase}; label="${label}"; label-truncated=${truncated}`);
  await page.screenshot({ path: `${OUT}/3-steal-timer.png` });
  await ctx.close();
}

// ---- 4. iPhone portrait + landscape ----
for (const vp of [
  { name: 'iphone-portrait', w: 390, h: 844 },
  { name: 'iphone-se-portrait', w: 375, h: 667 },
  { name: 'iphone-landscape', w: 844, h: 390 },
  { name: 'se-landscape', w: 667, h: 375 },
]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await gotoBoard(page, 'general-knowledge');
  await page.locator('.ll-hex.claimable').first().click();
  await page.getByTestId('question-card').waitFor();
  await page.getByTestId('reveal-answer').click().catch(() => {});
  await sleep(300);
  const vis = await page.evaluate(() => {
    const ih = innerHeight,
      iw = innerWidth;
    const onScreen = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return 'missing';
      const r = el.getBoundingClientRect();
      const fully = r.top >= -2 && r.bottom <= ih + 2 && r.left >= -2 && r.right <= iw + 2;
      return fully ? 'ok' : `clipped(top=${Math.round(r.top)},bot=${Math.round(r.bottom)}/${ih})`;
    };
    return {
      q: onScreen('[data-testid="question-text"]'),
      reveal: onScreen('[data-testid="answer-text"]'),
      hostpad: onScreen('.hostpad'),
      docScroll: Math.round(document.documentElement.scrollHeight - innerHeight),
    };
  });
  console.log(`4. ${vp.name.padEnd(20)} q=${vis.q} answer=${vis.reveal} hostpad=${vis.hostpad} docScroll=${vis.docScroll}`);
  await page.screenshot({ path: `${OUT}/4-${vp.name}.png` });
  await ctx.close();
}

await browser.close();
console.log(`\nShots in ${OUT}/`);
