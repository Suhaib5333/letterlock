import { expect, test, type Page } from '@playwright/test';

async function startMatch(
  page: Page,
  opts?: { size?: 4 | 5 | 7; mode?: 'single' | 'bo3' | 'bo5' },
) {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  if (opts?.mode) await page.getByTestId(`mode-${opts.mode}`).click();
  if (opts?.size) await page.getByTestId(`size-${opts.size}`).click();
  await page.getByTestId('start-match').click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
}

/** Pick a specific neutral hex and award it to a team via the host pad. */
async function claimFor(page: Page, cell: number, team: 'A' | 'B') {
  await page.locator(`.ll-hex.claimable[data-cell="${cell}"]`).click();
  await expect(page.getByTestId('question-card')).toBeVisible();
  await page.getByTestId(`award-${team}`).click();
}

test('home → setup → board renders with both teams', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('pack-grid')).toBeVisible();
  await page.getByTestId('play-button').click();
  await page.getByTestId('team-a-name').fill('Falcons');
  await page.getByTestId('team-b-name').fill('Wolves');
  await page.getByTestId('start-match').click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
  await expect(page.getByTestId('team-panel-A')).toContainText('Falcons');
  await expect(page.getByTestId('team-panel-B')).toContainText('Wolves');
  await expect(page.locator('.ll-board')).toBeVisible();
});

test('serving a question shows the card and the answer', async ({ page }) => {
  await startMatch(page);
  await page.locator('.ll-hex.claimable').first().click();
  await expect(page.getByTestId('question-text')).toBeVisible();
  await page.getByTestId('reveal-answer').click();
  await expect(page.getByTestId('answer-text')).toBeVisible();
});

test('a team can win by connecting its edges and the result overlay fires', async ({ page }) => {
  await startMatch(page, { size: 5, mode: 'single' });
  // Team A (Blue) connects left↔right by claiming all of row 2 (cells 10..14).
  for (const cell of [10, 11, 12, 13, 14]) {
    await claimFor(page, cell, 'A');
  }
  const over = page.getByTestId('game-over');
  await expect(over).toBeVisible({ timeout: 4000 });
  await expect(over).toContainText(/left . right/i);
  // The winning trace is drawn on the board (assert presence; SVG <g> visibility
  // heuristics are unreliable in Playwright).
  await expect(page.locator('.ll-trace .trace-spark')).toHaveCount(1);
  // Continue resolves the single-game match to victory.
  await page.getByTestId('continue-after-game').click();
  await expect(page.getByTestId('victory-screen')).toBeVisible();
  await expect(page.getByTestId('victory-score')).toBeVisible();
});

test('undo reverses the last claim', async ({ page }) => {
  await startMatch(page);
  await claimFor(page, 0, 'A');
  // After one claim, the owned hex exists.
  await expect(page.locator('.ll-hex[data-cell="0"][data-owner="A"]')).toHaveCount(1);
  await page.getByTestId('undo-pick').click();
  // It is neutral again.
  await expect(page.locator('.ll-hex[data-cell="0"][data-owner="none"]')).toHaveCount(1);
});

test('host can leave a hex neutral with “No one”', async ({ page }) => {
  await startMatch(page);
  await page.locator('.ll-hex.claimable[data-cell="0"]').click();
  await expect(page.getByTestId('question-card')).toBeVisible();
  const noOne = page.getByTestId('award-none');
  await noOne.scrollIntoViewIfNeeded();
  await noOne.click();
  await expect(page.locator('.ll-hex[data-cell="0"][data-owner="none"]')).toHaveCount(1);
});

test('settings persist accessibility choices', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-settings').click();
  await page.getByRole('button', { name: 'Reduced' }).click();
  await page.getByRole('button', { name: 'Hyperlegible' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('html')).toHaveAttribute('data-font', 'hyperlegible');
});

test('exit uses an in-UI modal, not a browser dialog', async ({ page }) => {
  await startMatch(page);
  await page.getByTestId('exit-btn').click();
  await expect(page.getByTestId('exit-modal')).toBeVisible();
  await page.getByTestId('exit-cancel').click();
  await expect(page.getByTestId('game-screen')).toBeVisible(); // stayed in game
  await page.getByTestId('exit-btn').click();
  await page.getByTestId('exit-confirm').click();
  await expect(page.getByTestId('pack-grid')).toBeVisible(); // back home
});

test('teams can pick colors and it carries into the match', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  await page.getByTestId('swatch-a-teal').click();
  await page.getByTestId('swatch-b-violet').click();
  await page.getByTestId('start-match').click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
  // CSS var reflects the chosen team-A color (teal #12b5a6).
  const ta = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--ta').trim(),
  );
  expect(ta.toLowerCase()).toBe('#12b5a6');
});

test('flags pack hides board letters (no first-letter hint) and shows a flag', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('pack-flags-easy').click();
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-single').click();
  await page.getByTestId('start-match').click();
  // No letter glyphs rendered on the board.
  await expect(page.locator('.ll-board .hex-letter')).toHaveCount(0);
  await page.locator('.ll-hex.claimable').first().click();
  await expect(page.getByTestId('question-card')).toBeVisible();
  // flag <img> is present (avoid network flakiness by asserting presence, not load)
  await expect(page.locator('.qcard-flag')).toHaveCount(1);
});

test('tutorial walkthrough is reachable and playable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByTestId('tutorial-screen')).toBeVisible();
  await page.getByTestId('tut-next').click();
  await page.getByTestId('tut-next').click();
  await page.getByTestId('tut-play').click();
  await expect(page.locator('.setup')).toBeVisible();
});
