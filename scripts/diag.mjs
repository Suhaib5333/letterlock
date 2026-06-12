import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173';
const b = await chromium.launch();
async function shot(vp, name, fn) {
  const ctx = await b.newContext({ viewport: vp });
  const p = await ctx.newPage();
  await p.goto(BASE); await p.evaluate(() => localStorage.clear()); await p.goto(BASE);
  await fn(p);
  await p.screenshot({ path: `audit-shots/${name}.png` });
  await ctx.close();
}
const startFlags = async (p) => {
  await p.getByTestId('pack-flags-easy').click();
  await p.getByTestId('play-button').click();
  await p.getByTestId('mode-single').click();
  await p.getByTestId('start-match').click();
  await p.waitForSelector('[data-testid="game-screen"]');
};
// 1. Home portrait (flags pack card)
await shot({ width: 375, height: 667 }, 'diag_home', async () => {});
// 2. Flags game board (letters hidden? flags on board?)
await shot({ width: 390, height: 844 }, 'diag_flags_board', startFlags);
// 3. Flags question card (does flag image show?)
await shot({ width: 390, height: 844 }, 'diag_flags_q', async (p) => {
  await startFlags(p);
  await p.locator('.ll-hex.claimable').first().click();
  await p.waitForSelector('[data-testid="question-card"]');
  await p.waitForTimeout(1500); // let flag image load
});
// 4. Landscape game question (cut off?)
await shot({ width: 740, height: 360 }, 'diag_landscape_q', async (p) => {
  await p.getByTestId('play-button').click();
  await p.getByTestId('start-match').click();
  await p.waitForSelector('[data-testid="game-screen"]');
  await p.locator('.ll-hex.claimable[data-cell="12"]').click();
  await p.waitForSelector('[data-testid="question-card"]');
});
await b.close();
console.log('shots written');
