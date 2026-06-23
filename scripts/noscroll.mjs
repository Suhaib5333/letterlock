import { chromium } from '@playwright/test';

const BASE = process.env.BASE || 'http://localhost:4173';
const VIEWPORTS = [
  { name: 'iphone-se', w: 375, h: 667 },
  { name: 'iphone-12mini', w: 360, h: 780 },
  { name: 'iphone-15', w: 393, h: 852 },
  { name: 'iphone-promax', w: 430, h: 932 },
  { name: 'pixel7', w: 412, h: 915 },
  { name: 'galaxy-s8', w: 360, h: 740 },
  { name: 'phone-landscape', w: 740, h: 360 },
  { name: 'se-landscape', w: 667, h: 375 },
  { name: 'iphone-landscape', w: 844, h: 390 },
  { name: 'ipad-mini-p', w: 768, h: 1024 },
  { name: 'ipad-pro-p', w: 834, h: 1112 },
  { name: 'ipad-landscape', w: 1024, h: 768 },
  { name: 'laptop-sm', w: 1280, h: 720 },
  { name: 'laptop', w: 1366, h: 768 },
  { name: 'desktop', w: 1440, h: 900 },
  { name: 'tv-1080', w: 1920, h: 1080 },
  { name: 'tv-1440', w: 2560, h: 1440 },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overflow(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const vScroll = Math.max(de.scrollHeight - de.clientHeight, document.body.scrollHeight - window.innerHeight);
    const hScroll = Math.max(de.scrollWidth - de.clientWidth, document.body.scrollWidth - window.innerWidth);
    // Also catch interactive controls clipped OFF-SCREEN by overflow:hidden — these
    // don't show up as document scroll but are unreachable. Check every button/input.
    const ih = window.innerHeight,
      iw = window.innerWidth;
    let offBottom = 0;
    let offSide = 0;
    const inScroller = (el) => {
      let p = el.parentElement;
      while (p) {
        const o = getComputedStyle(p);
        if (/(auto|scroll)/.test(o.overflowX + o.overflowY)) return true;
        p = p.parentElement;
      }
      return false;
    };
    for (const el of document.querySelectorAll('button, input, [role="gridcell"]')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (inScroller(el)) continue; // reachable via an intentional internal scroll region
      offBottom = Math.max(offBottom, Math.round(r.bottom - ih), Math.round(-r.top));
      offSide = Math.max(offSide, Math.round(r.right - iw), Math.round(-r.left));
    }
    // Detect content overflowing a height-constrained flex/grid region (overflow:visible
    // makes it paint OVER siblings — e.g. the setup options over the header).
    let regionOver = 0;
    for (const sel of ['.setup-body', '.hero', '.game-side', '.board-wrap', '.tut-body', '.victory', '.question-zone']) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const o = getComputedStyle(el);
      // a region that's intentionally scrollable can't "clip" — skip it
      if (/(auto|scroll)/.test(o.overflowY)) continue;
      regionOver = Math.max(regionOver, Math.round(el.scrollHeight - el.clientHeight));
    }
    return { v: Math.round(vScroll), h: Math.round(hScroll), offBottom, offSide, regionOver };
  });
}

const SCALE = process.env.SCALE; // 'large' | 'xlarge'
const PACK = process.env.PACK; // pack testid e.g. 'flags-easy'

const browser = await chromium.launch();
let problems = 0;
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  // Unlock all gated content so the checker can reach 5×5/7×7/bo5/hard packs.
  await ctx.addInitScript(() => localStorage.setItem('letterlock.unlockall', '1'));
  if (SCALE) {
    await ctx.addInitScript((scale) => {
      localStorage.setItem(
        'letterlock.settings.v1',
        JSON.stringify({ sound: false, music: false, motion: 'full', font: 'default', textScale: scale, tts: false, adjudicationStyle: 'structured' }),
      );
    }, SCALE);
  }
  const page = await ctx.newPage();
  const rows = [];

  await page.goto(BASE);
  await sleep(400);
  rows.push(['home', await overflow(page)]);

  // ── Modals (overlay the current screen; we catch clipped controls) ──
  await page.getByTestId('open-settings').click().catch(() => {});
  await sleep(250);
  rows.push(['modal-settings', await overflow(page)]);
  await page.keyboard.press('Escape');
  await sleep(200);

  await page.getByTestId('open-categories').click().catch(() => {});
  await sleep(250);
  rows.push(['modal-category', await overflow(page)]);
  await page.keyboard.press('Escape');
  await sleep(200);

  await page.getByTestId('open-leaderboard').click().catch(() => {});
  await sleep(300);
  rows.push(['modal-leaderboard', await overflow(page)]);
  await page.keyboard.press('Escape');
  await sleep(200);

  await page.getByTestId('open-auth').click().catch(() => {});
  await sleep(250);
  rows.push(['modal-auth', await overflow(page)]);
  await page.keyboard.press('Escape');
  await sleep(200);

  // ── Admin dashboard + pack editor (via the ?__devscreens seam) ──
  await page.goto(`${BASE}/?__devscreens=1`);
  await sleep(300);
  await page.getByTestId('open-admin').click().catch(() => {});
  await sleep(350);
  rows.push(['modal-admin', await overflow(page)]);
  await page.keyboard.press('Escape');
  await sleep(200);
  await page.getByTestId('open-pack-editor').click().catch(() => {});
  await sleep(350);
  rows.push(['modal-packeditor', await overflow(page)]);
  await page.keyboard.press('Escape');
  await sleep(200);
  await page.goto(BASE);
  await sleep(200);

  // ── Tutorial ──
  await page.getByRole('button', { name: /how to play/i }).click().catch(() => {});
  await sleep(350);
  rows.push(['tutorial', await overflow(page)]);

  // ── Image/charade secret-prompt standalone page ──
  await page.goto(`${BASE}/?view=img&w=Elephant&h=Act+it+out`);
  await sleep(300);
  rows.push(['imgview', await overflow(page)]);

  if (PACK) {
    await page.goto(BASE);
    await page.getByTestId('open-categories').click().catch(() => {});
    await sleep(150);
    await page.getByTestId(`pack-${PACK}`).click().catch(() => {});
    await sleep(150);
  } else {
    await page.goto(BASE);
    await sleep(200);
  }
  await page.getByTestId('play-button').click();
  await sleep(300);
  rows.push(['mode-select', await overflow(page)]);

  // Online flow: mode-online → Setup (colours first) → Create room → lobby-host.
  await page.getByTestId('mode-online').click().catch(() => {});
  await sleep(250);
  rows.push(['setup-online', await overflow(page)]);
  await page.getByTestId('start-match').click().catch(() => {});
  await sleep(800);
  rows.push(['lobby-host', await overflow(page)]);
  await page.getByTestId('lobby-back').click().catch(() => {}); // → HOME
  await sleep(300);

  // Join screen — re-enter from home; join-back returns to mode-select.
  await page.getByTestId('play-button').click().catch(() => {});
  await sleep(200);
  await page.getByTestId('mode-join').click().catch(() => {});
  await sleep(250);
  rows.push(['lobby-join', await overflow(page)]);
  await page.getByTestId('join-back').click().catch(() => {});
  await sleep(250);

  // Couch mode → setup (now on mode-select after join-back).
  await page.getByTestId('mode-couch').click().catch(() => {});
  await page.getByTestId('mode-single').click().catch(() => {});
  await sleep(350);
  rows.push(['setup', await overflow(page)]);

  await page.getByTestId('start-match').click();
  await page.getByTestId('game-screen').waitFor();
  await sleep(350);
  rows.push(['game-pick', await overflow(page)]);

  await page.locator('.ll-hex.claimable').first().click();
  await page.getByTestId('question-card').waitFor();
  await page.getByTestId('reveal-answer').click().catch(() => {});
  await sleep(300);
  rows.push(['game-question', await overflow(page)]);

  // ── Win the (single) game: claim row 3 (cells 10–14) for Team A → game-over
  //    overlay → continue → victory. The game-question step above left a question
  //    OPEN (so the board isn't pickable) — clear it first by awarding it. ──
  await page.getByTestId('award-A').click({ timeout: 2000 }).catch(() => {});
  await sleep(150);
  for (const cell of [10, 11, 12, 13, 14]) {
    const hex = page.locator(`.ll-hex.claimable[data-cell="${cell}"]`);
    await hex.click({ timeout: 2500 }).catch(() => {});
    await page.getByTestId('award-A').click({ timeout: 2500 }).catch(() => {});
    await sleep(120);
  }
  await sleep(500);
  if (await page.getByTestId('game-over').count()) {
    rows.push(['game-over', await overflow(page)]);
    await page.getByTestId('continue-after-game').click().catch(() => {});
    await sleep(600);
    rows.push(['victory', await overflow(page)]);
  }

  // Online in-game layout (host's "Player answers" panel) — forced via the
  // ?__onlinepanel=1 test seam so we verify it without two live clients. This is
  // the screen the host sees during an online match; it must not overflow.
  await page.goto(`${BASE}/?__onlinepanel=1`);
  await sleep(200);
  await page.getByTestId('play-button').click().catch(() => {});
  await page.getByTestId('mode-couch').click().catch(() => {});
  await page.getByTestId('mode-single').click().catch(() => {});
  await page.getByTestId('start-match').click().catch(() => {});
  await page.getByTestId('game-screen').waitFor().catch(() => {});
  await page.locator('.ll-hex.claimable').first().click().catch(() => {});
  await page.getByTestId('question-card').waitFor().catch(() => {});
  await page.getByTestId('reveal-answer').click().catch(() => {});
  await sleep(300);
  rows.push(['game-online', await overflow(page)]);

  // Phone-as-controller name-entry (scanned QR, no name yet — Kahoot-style).
  await page.goto(`${BASE}/?room=TESTAB&view=controller`);
  await sleep(400);
  rows.push(['controller-join', await overflow(page)]);

  // Phone-as-controller (its own standalone page) — the lobby/waiting layout.
  await page.goto(`${BASE}/?room=TESTAB&view=controller&name=Tester`);
  await sleep(500);
  rows.push(['controller', await overflow(page)]);

  for (const [screen, o] of rows) {
    const bad = o.v > 2 || o.h > 2 || o.offBottom > 2 || o.offSide > 2 || o.regionOver > 2;
    if (bad) problems++;
    console.log(
      `${bad ? '❌' : '✅'} ${vp.name.padEnd(16)} ${screen.padEnd(14)} vScroll=${o.v} hScroll=${o.h} offBottom=${o.offBottom} offSide=${o.offSide} regionOver=${o.regionOver}`,
    );
  }
  await ctx.close();
}
await browser.close();
console.log(problems === 0 ? '\nALL CLEAR — no scrolling anywhere.' : `\n${problems} overflow problems remain.`);
process.exit(problems === 0 ? 0 : 1);
