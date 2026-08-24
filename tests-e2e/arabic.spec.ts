import { expect, test, type Page } from '@playwright/test';

// The Arabic section (locale 'ar'): Arabic letters on the board, RTL question
// text, the عربي category group, and the full pick → reveal → award loop.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('letterlock.unlockall', '1'));
});

/** Open the category browse menu and choose a pack (selecting closes the menu). */
async function selectPack(page: Page, id: string) {
  await page.getByTestId('open-categories').click();
  await expect(page.getByTestId('category-menu')).toBeVisible();
  await page.getByTestId(`pack-${id}`).click();
  await expect(page.getByTestId('category-menu')).toHaveCount(0);
}

test('Arabic pack: Arabic board letters, RTL question, full claim flow', async ({ page }) => {
  await page.goto('/');
  await selectPack(page, 'ar-seen-jeem-easy');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('start-match').click();
  await expect(page.getByTestId('game-screen')).toBeVisible();

  // Every hex carries a DISTINCT Arabic letter (25 cells ≤ 28 Arabic letters).
  const letters = await page
    .locator('.ll-hex')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-letter')));
  expect(letters).toHaveLength(25);
  for (const l of letters) expect(l).toMatch(/^[ء-ي]$/);
  expect(new Set(letters).size).toBe(25);

  // Pick a hex → the question card shows Arabic text laid out right-to-left.
  await page.locator('.ll-hex.claimable').first().click();
  const q = page.getByTestId('question-text');
  await expect(q).toBeVisible();
  expect((await q.textContent()) ?? '').toMatch(/[ء-ي]/);
  expect(await q.evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');

  // Reveal shows an Arabic answer; awarding claims the hex for the team.
  await page.getByTestId('reveal-answer').click();
  const answer = page.getByTestId('answer-text');
  await expect(answer).toBeVisible();
  expect((await answer.textContent()) ?? '').toMatch(/[ء-ي]/);
  const cell = await page.locator('.ll-hex.selected').getAttribute('data-cell');
  await page.getByTestId('award-A').click();
  await expect(page.locator(`.ll-hex[data-cell="${cell}"]`)).toHaveAttribute('data-owner', 'A');
});

test('Arabic packs live in the عربي group with a tier picker for سين جيم', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-categories').click();
  await expect(page.getByTestId('category-menu')).toBeVisible();
  await page.getByTestId('cat-chip-عربي').click();
  // The three سين جيم tiers collapse into one card with tier buttons.
  await expect(page.getByTestId('pack-ar-seen-jeem-easy')).toBeVisible();
  await expect(page.getByTestId('pack-tier-ar-seen-jeem-medium')).toBeVisible();
  await expect(page.getByTestId('pack-tier-ar-seen-jeem-hard')).toBeVisible();
  // Single-tier Arabic packs render their own cards.
  await expect(page.getByTestId('pack-ar-geography')).toBeVisible();
  await expect(page.getByTestId('pack-ar-islamic')).toBeVisible();
});
