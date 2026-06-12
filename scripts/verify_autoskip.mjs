import { chromium } from '@playwright/test';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch();

async function run(pack, mediaTestId, label) {
  const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await c.newPage();
  await p.goto('http://localhost:4173');
  await sleep(300);
  await p.getByTestId('open-categories').click();
  await sleep(150);
  await p.getByTestId(`pack-${pack}`).click();
  await sleep(150);
  await p.getByTestId('play-button').click();
  await p.getByTestId('mode-single').click().catch(() => {});
  await p.getByTestId('start-match').click();
  await p.getByTestId('game-screen').waitFor();
  await p.locator('.ll-hex.claimable').first().click();
  await p.getByTestId('question-card').waitFor();
  const el = p.getByTestId(mediaTestId);
  await el.waitFor();
  const before = await el.getAttribute('src');
  // simulate the clip failing to load
  await el.evaluate((n) => n.dispatchEvent(new Event('error')));
  const autoNotice = await p.getByTestId('media-error').getAttribute('data-auto').catch(() => null);
  await sleep(1800); // auto-advance fires at ~1.1s
  const after = await p.getByTestId(mediaTestId).getAttribute('src').catch(() => null);
  const cardStill = await p.getByTestId('question-card').count();
  console.log(`${label}: autoNotice=${autoNotice} changed=${before !== after && !!after} cardPresent=${cardStill === 1}`);
  await c.close();
}

await run('tv-clips', 'qcard-video', 'VIDEO (TV)');
await run('songs', 'qcard-audio', 'AUDIO (song)');
await b.close();
