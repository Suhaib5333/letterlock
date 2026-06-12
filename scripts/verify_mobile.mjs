import { chromium, devices } from '@playwright/test';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch();

// Use a real mobile device profile (touch, coarse pointer) so the autofocus rule applies.
const c = await b.newContext({ ...devices['iPhone 13'] });
const p = await c.newPage();
await p.goto('http://localhost:4173');
await sleep(400);

// 1) Category menu must NOT auto-focus the search (no keyboard pop) on touch devices.
await p.getByTestId('open-categories').click();
await sleep(500);
const focusInfo = await p.evaluate(() => {
  const search = document.querySelector('[data-testid="category-search"]');
  return {
    searchPresent: !!search,
    searchFocused: document.activeElement === search,
    activeTag: document.activeElement?.tagName,
  };
});
console.log('MOBILE SEARCH:', JSON.stringify(focusInfo), '→ keyboard would NOT pop:', !focusInfo.searchFocused);
// tapping the field focuses it (then keyboard is fine)
await p.getByTestId('category-search').click();
await sleep(200);
const afterTap = await p.evaluate(() => document.activeElement === document.querySelector('[data-testid="category-search"]'));
console.log('  focuses on tap:', afterTap);

// 2) TV clip: native video supports fullscreen, has controls, no nofullscreen restriction.
await p.getByTestId('pack-tv-clips-easy').click();
await sleep(200);
await p.getByTestId('play-button').click();
await p.getByTestId('mode-single').click().catch(() => {});
await p.getByTestId('start-match').click();
await p.getByTestId('game-screen').waitFor();
await p.locator('.ll-hex.claimable').first().click();
await p.getByTestId('question-card').waitFor();
await sleep(2500);
const vid = await p.evaluate(() => {
  const v = document.querySelector('[data-testid="qcard-video"]');
  if (!v) return { present: false };
  return {
    present: true,
    hasControls: v.hasAttribute('controls'),
    controlsList: v.getAttribute('controlslist') || '(none)',
    playsInline: v.hasAttribute('playsinline'),
    fullscreenEnabled: document.fullscreenEnabled,
    readyState: v.readyState,
  };
});
console.log('TV VIDEO:', JSON.stringify(vid));
await c.close();
await b.close();
