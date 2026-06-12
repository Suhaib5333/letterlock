import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const OUT = 'verify-shots';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch();

async function play(page, pack) {
  await page.goto('http://localhost:4173');
  await sleep(300);
  await page.getByTestId('open-categories').click();
  await sleep(200);
  await page.getByTestId(`pack-${pack}`).click();
  await sleep(200);
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-single').click().catch(() => {});
  await page.getByTestId('start-match').click();
  await page.getByTestId('game-screen').waitFor();
  await page.locator('.ll-hex.claimable').first().click();
  await page.getByTestId('question-card').waitFor();
}

// MOVIE: does the YT IFrame API inject a real iframe?
{
  const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await c.newPage();
  await play(p, 'movies-clips-easy');
  await sleep(5000); // give the IFrame API time to load + inject
  const info = await p.evaluate(() => {
    const host = document.querySelector('[data-testid="qcard-youtube"]');
    const iframe = host?.querySelector('iframe');
    const fb = document.querySelector('[data-testid="media-error"]');
    const skip = document.querySelector('[data-testid="skip-question"]');
    return {
      hostPresent: !!host,
      iframeInjected: !!iframe,
      iframeSrc: iframe?.getAttribute('src')?.slice(0, 60) ?? null,
      fallbackShown: !!fb,
      skipEnabled: skip ? !skip.disabled : null,
    };
  });
  console.log('MOVIE:', JSON.stringify(info));
  await p.screenshot({ path: `${OUT}/clip-movie.png` });
  await c.close();
}

// TV: does the <video> element load metadata (real clip)?
{
  const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await c.newPage();
  await play(p, 'tv-clips-easy');
  await sleep(3500);
  const info = await p.evaluate(() => {
    const v = document.querySelector('[data-testid="qcard-video"]');
    const fb = document.querySelector('[data-testid="media-error"]');
    const skip = document.querySelector('[data-testid="skip-question"]');
    return {
      videoPresent: !!v,
      readyState: v?.readyState ?? null, // >=1 means metadata loaded
      videoWidth: v?.videoWidth ?? null,
      src: v?.getAttribute('src')?.slice(0, 50) ?? null,
      fallbackShown: !!fb,
      skipEnabled: skip ? !skip.disabled : null,
    };
  });
  console.log('TV:', JSON.stringify(info));
  await p.screenshot({ path: `${OUT}/clip-tv.png` });
  await c.close();
}
await b.close();
