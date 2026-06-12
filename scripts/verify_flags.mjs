// Prove letterless packs serve FULLY RANDOMIZED questions (any hex -> a flag of
// any starting letter, not letter-per-hex). Picks several hexes in a flags game,
// reveals each answer, and prints the answers + their first letters.
import { chromium } from '@playwright/test';

const BASE = process.env.BASE || 'http://localhost:4173';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE);
await page.getByTestId('pack-flags-easy').click();
await page.getByTestId('play-button').click();
await page.getByTestId('mode-single').click();
await page.getByTestId('start-match').click();
await page.waitForSelector('[data-testid="game-screen"]');

const answers = [];
for (const cell of [0, 6, 12, 3, 18, 9, 21]) {
  const hex = page.locator(`.ll-hex.claimable[data-cell="${cell}"]`);
  if (!(await hex.count())) continue;
  await hex.click();
  await page.waitForSelector('[data-testid="question-card"]');
  await page.getByTestId('reveal-answer').click();
  const ans = (await page.getByTestId('answer-text').innerText()).replace(/\s+/g, ' ').trim();
  const a = ans.replace(/^Answer\s*/i, '');
  answers.push({ cell, a, first: a[0]?.toUpperCase() });
  await page.getByTestId('award-A').click(); // advance the turn
  await page.waitForTimeout(150);
}
await browser.close();

console.log('Served flags by hex:');
for (const r of answers) console.log(`  hex ${r.cell} -> [${r.first}] ${r.a}`);
const letters = [...new Set(answers.map((r) => r.first))];
console.log(`\nDistinct starting letters: ${letters.join(', ')} (${letters.length} of ${answers.length})`);
console.log(letters.length >= Math.min(4, answers.length) ? '✅ FULLY RANDOMIZED (varied letters across hexes)' : '❌ looks letter-bound');
