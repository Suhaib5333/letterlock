// The settings modal must fit on ONE screen (no internal scroll, nothing
// clipped) on every device. `node scripts/checksettings.mjs`  (SCALE=xlarge for
// the enlarged-text pass, where internal scroll is an accepted fallback.)
import { chromium } from '@playwright/test';

const BASE = process.env.BASE || 'http://localhost:4173';
const SCALE = process.env.SCALE;
const VIEWPORTS = [
  ['iphone-se', 375, 667],
  ['iphone-12mini', 360, 780],
  ['iphone-15', 393, 852],
  ['iphone-promax', 430, 932],
  ['pixel7', 412, 915],
  ['galaxy-s8', 360, 740],
  ['phone-landscape', 740, 360],
  ['se-landscape', 667, 375],
  ['iphone-landscape', 844, 390],
  ['ipad-mini-p', 768, 1024],
  ['ipad-landscape', 1024, 768],
  ['laptop-sm', 1280, 720],
  ['laptop', 1366, 768],
  ['desktop', 1440, 900],
  ['tv-1080', 1920, 1080],
];

const browser = await chromium.launch();
let bad = 0;
for (const [name, w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  if (SCALE) {
    await ctx.addInitScript((s) => {
      localStorage.setItem(
        'letterlock.settings.v1',
        JSON.stringify({ sound: false, music: false, motion: 'full', font: 'default', textScale: s, tts: false, adjudicationStyle: 'structured' }),
      );
    }, SCALE);
  }
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.getByTestId('open-settings').click();
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const m = document.querySelector('.modal');
    const vh = window.innerHeight,
      vw = window.innerWidth;
    let off = 0;
    for (const el of m.querySelectorAll('button')) {
      const b = el.getBoundingClientRect();
      off = Math.max(off, Math.round(b.bottom - vh), Math.round(-b.top), Math.round(b.right - vw), Math.round(-b.left));
    }
    return {
      scroll: Math.round(m.scrollHeight - m.clientHeight),
      hscroll: Math.round(m.scrollWidth - m.clientWidth),
      off, // a control outside the viewport = cut off
      docScroll: Math.round(document.documentElement.scrollHeight - document.documentElement.clientHeight),
    };
  });
  const ok = r.scroll <= 1 && r.hscroll <= 1 && r.off <= 1 && r.docScroll <= 1;
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(18)} ${JSON.stringify(r)}`);
  await ctx.close();
}
await browser.close();
console.log(bad ? `\n${bad} viewport(s) FAILED` : '\nsettings: ALL CLEAR');
process.exit(bad ? 1 : 0);
