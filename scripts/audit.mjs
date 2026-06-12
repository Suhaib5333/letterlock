import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = 'audit-shots';
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'se', w: 375, h: 667 },
  { name: 'androidsm', w: 360, h: 640 },
  { name: 'iphone15', w: 393, h: 852 },
  { name: 'landscape', w: 740, h: 360 },
  { name: 'ipad', w: 768, h: 1024 },
  { name: 'desktop', w: 1440, h: 900 },
  { name: 'tv', w: 1920, h: 1080 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Report elements that overflow the viewport or visibly overlap key siblings.
async function diagnostics(page, label) {
  return page.evaluate((label) => {
    const iw = window.innerWidth, ih = window.innerHeight;
    const issues = [];
    const de = document.documentElement;
    if (de.scrollWidth > iw + 1) issues.push(`H-SCROLL ${de.scrollWidth}>${iw}`);
    // any element wider than viewport
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > iw + 2 && r.height > 0) {
        const id = el.getAttribute('data-testid') || el.className?.toString().slice(0, 24) || el.tagName;
        if (typeof id === 'string' && !issues.some((i) => i.includes(id))) issues.push(`WIDE ${id} ${Math.round(r.width)}>${iw}`);
      }
    });
    // text that overflows its box (clipped)
    document.querySelectorAll('button, .turn-banner, .qcard-rule, .chip, .pie-pop-body, .repeat-badge').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 2) {
        const id = el.getAttribute('data-testid') || el.className?.toString().slice(0, 24);
        issues.push(`CLIP ${id} ${el.scrollWidth}>${el.clientWidth}`);
      }
    });
    const board = document.querySelector('.ll-board');
    const boardH = board ? Math.round(board.getBoundingClientRect().height) : 0;
    return { label, issues, boardH };
  }, label);
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function run() {
  const browser = await chromium.launch();
  const allIssues = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();

    // --- GK flow ---
    await page.goto(BASE);
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE);
    await sleep(200);
    await shot(page, `home_${vp.name}`);
    allIssues.push(await diagnostics(page, `home_${vp.name}`));

    await page.getByTestId('play-button').click();
    await page.getByTestId('mode-single').click();
    await page.getByTestId('start-match').click();
    await page.waitForSelector('[data-testid="game-screen"]');
    await sleep(150);
    await shot(page, `pick_${vp.name}`);
    allIssues.push(await diagnostics(page, `pick_${vp.name}`));

    // claim cell 0 for A -> pie popup appears (B's turn)
    await page.locator('.ll-hex.claimable[data-cell="0"]').click();
    await page.getByTestId('award-A').click();
    await sleep(250);
    await shot(page, `pie_${vp.name}`);
    allIssues.push(await diagnostics(page, `pie_${vp.name}`));

    // dismiss pie, pick a hex -> question card
    const dismiss = page.getByTestId('pie-dismiss');
    if (await dismiss.count()) await dismiss.click();
    await page.locator('.ll-hex.claimable[data-cell="12"]').click();
    await page.waitForSelector('[data-testid="question-card"]');
    await sleep(150);
    await shot(page, `question_${vp.name}`);
    allIssues.push(await diagnostics(page, `question_${vp.name}`));

    // --- Charades flow ---
    await page.goto(BASE);
    await page.getByTestId('pack-charades-easy').click();
    await page.getByTestId('play-button').click();
    await page.getByTestId('mode-single').click();
    await page.getByTestId('start-match').click();
    await page.waitForSelector('[data-testid="game-screen"]');
    await page.locator('.ll-hex.claimable').first().click();
    await page.waitForSelector('[data-testid="question-card"]');
    await sleep(200);
    await shot(page, `charade_${vp.name}`);
    allIssues.push(await diagnostics(page, `charade_${vp.name}`));

    await ctx.close();
  }

  // ImgView at a couple sizes
  for (const vp of [VIEWPORTS[0], VIEWPORTS[5]]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?view=img&w=Elephant&img=&h=Act%20it%20out!`);
    await sleep(150);
    await shot(page, `imgview_${vp.name}`);
    await ctx.close();
  }

  await browser.close();
  console.log('\n=== LAYOUT DIAGNOSTICS ===');
  let any = false;
  for (const d of allIssues) {
    if (d.issues.length) { any = true; console.log(`❌ ${d.label}: ${d.issues.join(' | ')}`); }
  }
  if (!any) console.log('✅ no auto-detected overflow/clip issues');

  // Board-stability check per viewport: pick vs pie vs question boardH should match.
  console.log('\n=== BOARD STABILITY (boardH should be equal across pick/pie/question) ===');
  const byVp = {};
  for (const d of allIssues) {
    const m = d.label.match(/^(pick|pie|question|charade)_(.+)$/);
    if (m) ((byVp[m[2]] ??= {})[m[1]] = d.boardH);
  }
  for (const [vp, hs] of Object.entries(byVp)) {
    const vals = Object.values(hs);
    const stable = Math.max(...vals) - Math.min(...vals) <= 4;
    console.log(`${stable ? '✅' : '❌'} ${vp}: ${JSON.stringify(hs)}`);
  }
  console.log(`\nScreenshots in ${OUT}/`);
}

run().catch((e) => { console.error(e); process.exit(1); });
