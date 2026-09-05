// Touch-target audit (LAUNCH_PLAN Phase 1b): lists every visible interactive
// element smaller than 44x44 CSS px on the phone profiles, screen by screen.
//   BASE=http://localhost:4183 node scripts/audit44.mjs
// Exit code 1 when any control (other than a board hex, reported separately) is
// under 44px. Inline text links (legal footer) follow WCAG 2.5.8's inline
// exception and are listed as info only.
import { chromium } from '@playwright/test';

const BASE = process.env.BASE || 'http://localhost:4173';
const MIN = Number(process.env.MIN || 44);
const VIEWPORTS = [
  { name: 'iphone-se', w: 375, h: 667 },
  { name: 'pixel7', w: 412, h: 915 },
  { name: 'se-landscape', w: 667, h: 375 },
  { name: 'phone-landscape', w: 740, h: 360 },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function smallTargets(page) {
  return page.evaluate((MIN) => {
    const sel = 'button, a[href], input, select, textarea, [role="button"], [role="gridcell"], [role="tab"], [role="switch"], [role="option"], [role="menuitem"]';
    const out = [];
    for (const el of document.querySelectorAll(sel)) {
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') continue;
      if (el.disabled) continue; // a disabled control is not a target
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      // A control's tap area may be given by a padded parent (label wrapping an input).
      const wrap = el.closest('label');
      const rr = wrap && wrap !== el ? wrap.getBoundingClientRect() : r;
      const w = Math.round(Math.max(r.width, rr.width));
      const h = Math.round(Math.max(r.height, rr.height));
      if (w >= MIN && h >= MIN) continue;
      const inline = el.tagName === 'A' && !!el.closest('p, .legal-links, .home-foot, .set-legal');
      const hex = el.getAttribute('role') === 'gridcell';
      const label =
        el.getAttribute('data-testid') ||
        el.getAttribute('aria-label') ||
        (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28) ||
        el.className;
      out.push({ w, h, label: `${el.tagName.toLowerCase()}[${label}]`, inline, hex });
    }
    return out;
  }, MIN);
}

const browser = await chromium.launch();
let fails = 0;
const seen = new Map(); // label -> worst size, so the summary is de-duplicated
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => localStorage.setItem('letterlock.unlockall', '1'));
  const page = await ctx.newPage();
  const rows = [];
  const check = async (screen) => {
    await sleep(250);
    rows.push([screen, await smallTargets(page)]);
  };

  await page.goto(BASE);
  await check('home');
  await page.getByTestId('open-settings').click().catch(() => {});
  await check('modal-settings');
  await page.keyboard.press('Escape');
  await sleep(150);
  await page.getByTestId('open-categories').click().catch(() => {});
  await check('modal-category');
  await page.keyboard.press('Escape');
  await sleep(150);
  await page.getByTestId('play-button').click();
  await check('mode-select');
  await page.getByTestId('mode-join').click().catch(() => {});
  await check('lobby-join');
  await page.getByTestId('join-back').click().catch(() => {});
  await sleep(150);
  await page.getByTestId('mode-couch').click().catch(() => {});
  await page.getByTestId('mode-single').click().catch(() => {});
  await check('setup');
  await page.getByTestId('start-match').click();
  await page.getByTestId('game-screen').waitFor();
  await check('game-pick');
  await page.locator('.ll-hex.claimable').first().click();
  await page.getByTestId('question-card').waitFor();
  await check('game-question');
  await page.getByTestId('reveal-answer').click().catch(() => {});
  await check('game-revealed');
  await page.getByTestId('exit-btn').click().catch(() => {});
  await check('exit-modal');

  await page.goto(`${BASE}/?room=TESTAB&view=controller`);
  await check('controller-join');
  await page.goto(`${BASE}/?room=TESTAB&view=controller&name=Tester`);
  await sleep(400);
  await check('controller');

  for (const [screen, list] of rows) {
    const hard = list.filter((t) => !t.inline && !t.hex);
    const hexes = list.filter((t) => t.hex);
    const info = list.filter((t) => t.inline);
    fails += hard.length;
    const mark = hard.length ? '❌' : '✅';
    console.log(`${mark} ${vp.name.padEnd(16)} ${screen.padEnd(16)} small=${hard.length}${hexes.length ? ` hex<${MIN}=${hexes.length}` : ''}${info.length ? ` inline-links=${info.length}` : ''}`);
    for (const t of hard) {
      console.log(`     ${String(t.w).padStart(3)}x${String(t.h).padEnd(3)} ${t.label}`);
      const key = t.label;
      const prev = seen.get(key);
      if (!prev || Math.min(t.w, t.h) < Math.min(prev.w, prev.h)) seen.set(key, t);
    }
  }
  await ctx.close();
}
await browser.close();
if (seen.size) {
  console.log('\nDistinct controls under the floor (worst size seen):');
  for (const [label, t] of seen) console.log(`  ${String(t.w).padStart(3)}x${String(t.h).padEnd(3)} ${label}`);
}
console.log(fails === 0 ? `\nALL CLEAR: every control is at least ${MIN}x${MIN}px.` : `\n${fails} small-target hits across screens x viewports.`);
process.exit(fails === 0 ? 0 : 1);
