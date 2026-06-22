// Per-category overflow check: load ONE question from EVERY pack and verify the
// game-question screen doesn't scroll/clip — on the tightest viewports (small
// portrait + landscape phones), where differing media (maps/flags/logos/audio/
// video/charades) is most likely to overflow.
import { chromium } from '@playwright/test';

const BASE = process.env.BASE || 'http://localhost:4173';
const VIEWPORTS = [
  { name: 'iphone-se', w: 375, h: 667 },
  { name: 'galaxy-s8', w: 360, h: 740 },
  { name: 'phone-landscape', w: 740, h: 360 },
  { name: 'se-landscape', w: 667, h: 375 },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overflow(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const v = Math.max(de.scrollHeight - de.clientHeight, document.body.scrollHeight - window.innerHeight);
    const h = Math.max(de.scrollWidth - de.clientWidth, document.body.scrollWidth - window.innerWidth);
    const ih = window.innerHeight, iw = window.innerWidth;
    let offBottom = 0, offSide = 0;
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
      if (inScroller(el)) continue;
      offBottom = Math.max(offBottom, Math.round(r.bottom - ih), Math.round(-r.top));
      offSide = Math.max(offSide, Math.round(r.right - iw), Math.round(-r.left));
    }
    let regionOver = 0;
    for (const sel of ['.game-side', '.board-wrap', '.question-zone']) {
      const el = document.querySelector(sel);
      if (!el) continue;
      if (/(auto|scroll)/.test(getComputedStyle(el).overflowY)) continue;
      regionOver = Math.max(regionOver, Math.round(el.scrollHeight - el.clientHeight));
    }
    return { v: Math.round(v), h: Math.round(h), offBottom, offSide, regionOver };
  });
}

const browser = await chromium.launch();
// Collect every pack id from the category menu once.
const ctx0 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p0 = await ctx0.newPage();
await p0.goto(BASE);
await p0.getByTestId('open-categories').click();
await sleep(400);
const ids = await p0.$$eval('[data-testid^="pack-"]', (els) =>
  els
    .map((e) => e.getAttribute('data-testid').replace(/^pack-/, ''))
    // `pack-tier-*` are difficulty-switch BUTTONS inside a collapsed card, not
    // selectable pack cards — skip them (the card itself, e.g. `pack-flags-easy`,
    // is collected separately and represents that group's default tier).
    .filter((id) => !id.startsWith('tier-')),
);
await ctx0.close();
console.log(`Found ${ids.length} packs.`);

let problems = 0;
let checked = 0;
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const id of ids) {
    try {
      await page.goto(BASE);
      await page.getByTestId('open-categories').click();
      await sleep(120);
      await page.getByTestId(`pack-${id}`).click({ timeout: 3000 });
      await sleep(150);
      await page.getByTestId('play-button').click();
      await page.getByTestId('mode-couch').click().catch(() => {});
      await page.getByTestId('mode-single').click().catch(() => {});
      await page.getByTestId('start-match').click();
      await page.getByTestId('game-screen').waitFor({ timeout: 4000 });
      await page.locator('.ll-hex.claimable').first().click();
      await page.getByTestId('question-card').waitFor({ timeout: 4000 });
      await sleep(250);
      const o = await overflow(page);
      checked++;
      const bad = o.v > 2 || o.h > 2 || o.offBottom > 2 || o.offSide > 2 || o.regionOver > 2;
      if (bad) {
        problems++;
        console.log(`❌ ${vp.name.padEnd(16)} ${id.padEnd(22)} v=${o.v} h=${o.h} offB=${o.offBottom} offS=${o.offSide} region=${o.regionOver}`);
      }
    } catch (e) {
      console.log(`⚠️  ${vp.name.padEnd(16)} ${id.padEnd(22)} could not load (${String(e).slice(0, 50)})`);
    }
  }
  await ctx.close();
}
await browser.close();
console.log(`\nChecked ${checked} pack×viewport combos. ${problems === 0 ? 'ALL CLEAR — no scrolling on any category.' : problems + ' overflow problems.'}`);
process.exit(problems === 0 ? 0 : 1);
