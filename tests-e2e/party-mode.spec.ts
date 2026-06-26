import { expect, test, type Browser, type Page } from '@playwright/test';

// Party Mode (online) sequential answer flow + auto-winner reveal:
//   picker answers first → their window ends (lock-in OR timeout) → the OTHER
//   team's window opens → they answer → a winner-reveal screen shows the answer
//   + the auto-detected winner, with a 15s auto-continue and manual override.
// Also covers the timer being tinted with the active team's colour.

test.beforeEach(async ({ page }) => {
  // Couch tests below use the default 5×5 / bo3 which are progression-gated;
  // grant the test-only unlock seam (online uses the same default, harmless).
  await page.addInitScript(() => localStorage.setItem('letterlock.unlockall', '1'));
});

const CONTROLLER = (code: string, name: string) => `/?room=${code}&view=controller&name=${name}`;

/** Host an online room, join two players, assign Blue (Team A = picker) + Amber
 *  (Team B), start, and serve the first question. Returns the picker/other pages
 *  resolved by which one actually landed on the Blue team. */
async function setupTwoPlayerQuestion(browser: Browser): Promise<{
  host: Page;
  picker: Page;
  other: Page;
  ctxs: Awaited<ReturnType<Browser['newContext']>>[];
}> {
  const hostCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  await host.goto('/');
  await host.getByTestId('play-button').click();
  await host.getByTestId('mode-online').click();
  await host.getByTestId('start-match').click();
  await expect(host.getByTestId('lobby-start')).toBeEnabled({ timeout: 35000 });
  const code = (await host.getByTestId('lobby-code').innerText()).replace(/[^A-Z0-9]/gi, '');

  const aCtx = await browser.newContext();
  const p1 = await aCtx.newPage();
  await p1.goto(CONTROLLER(code, 'Pone'));
  await expect(p1.getByTestId('controller-lobby')).toBeVisible({ timeout: 35000 });

  const bCtx = await browser.newContext();
  const p2 = await bCtx.newPage();
  await p2.goto(CONTROLLER(code, 'Ptwo'));
  await expect(p2.getByTestId('controller-lobby')).toBeVisible({ timeout: 35000 });

  await expect(host.getByTestId('lobby-count')).toContainText('2 connected', { timeout: 35000 });

  // Assign the two players to the two teams (the list re-renders after each).
  const unassigned = host.locator('.lobby-unassigned li');
  await unassigned.first().locator('button', { hasText: 'Blue' }).click();
  await expect(unassigned).toHaveCount(1);
  await unassigned.first().locator('button', { hasText: 'Amber' }).click();
  await expect(unassigned).toHaveCount(0);

  // Resolve which page is the picker (Blue = Team A picks first).
  await expect(p1.getByTestId('controller-team')).toHaveText(/Blue|Amber/, { timeout: 35000 });
  await expect(p2.getByTestId('controller-team')).toHaveText(/Blue|Amber/, { timeout: 35000 });
  const p1Team = await p1.getByTestId('controller-team').innerText();
  const picker = /Blue/i.test(p1Team) ? p1 : p2;
  const other = picker === p1 ? p2 : p1;

  await host.getByTestId('lobby-start').click();
  await expect(host.getByTestId('game-screen')).toBeVisible();
  await host.locator('.ll-hex.claimable').first().click();
  await expect(host.getByTestId('question-card')).toBeVisible();
  await expect(picker.getByTestId('controller-question')).toBeVisible({ timeout: 35000 });

  return { host, picker, other, ctxs: [hostCtx, aCtx, bCtx] };
}

async function close(ctxs: Awaited<ReturnType<Browser['newContext']>>[]) {
  for (const c of ctxs) await c.close();
}

test('timer fill is tinted with the active team colour', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('start-match').click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
  await page.locator('.ll-hex.claimable').first().click();
  const timer = page.getByTestId('timer');
  await expect(timer).toBeVisible();
  // The picker is Team A (Blue = #0a84ff). The timer carries the active team's colour.
  const accent = await timer.evaluate((el) =>
    getComputedStyle(el).getPropertyValue('--timer-accent').trim(),
  );
  expect(accent.toLowerCase()).toBe('#0a84ff');
});

test('party mode: sequential windows → auto-winner reveal → manual override applies', async ({ browser }) => {
  test.setTimeout(120000);
  const { host, picker, other, ctxs } = await setupTwoPlayerQuestion(browser);

  // The non-picking team is locked while the picker's window is open.
  await expect(other.getByTestId('controller-locked')).toBeVisible({ timeout: 20000 });
  await expect(other.getByTestId('controller-input')).toHaveCount(0);

  // Picker answers (gibberish so it never auto-grades correct).
  await expect(picker.getByTestId('controller-input')).toBeVisible({ timeout: 20000 });
  await picker.getByTestId('controller-input').fill('Zzqxwv');
  await picker.getByTestId('controller-submit').click();
  await expect(picker.getByTestId('controller-submitted')).toBeVisible({ timeout: 15000 });

  // Picker locking in OPENS the other team's window.
  await expect(other.getByTestId('controller-input')).toBeVisible({ timeout: 20000 });
  await other.getByTestId('controller-input').fill('Yyqxwv');
  await other.getByTestId('controller-submit').click();

  // Both windows closed → the host shows the winner-reveal overlay.
  await expect(host.getByTestId('party-reveal')).toBeVisible({ timeout: 20000 });
  await expect(host.getByTestId('reveal-answer')).toBeVisible();
  await expect(host.getByTestId('reveal-countdown')).toBeVisible();
  // Neither answer was correct → no winner is pre-selected.
  await expect(host.getByTestId('reveal-winner')).toContainText(/No winner/i);

  // Host overrides the selection → award the picking team, then Continue applies.
  await host.getByTestId('reveal-pick-A').click();
  await expect(host.getByTestId('reveal-winner')).not.toContainText(/No winner/i);
  await host.getByTestId('reveal-continue').click();
  await expect(host.getByTestId('party-reveal')).toHaveCount(0);
  // The picked hex was claimed for Team A.
  await expect(host.locator('.ll-hex[data-owner="A"]')).toHaveCount(1);

  await close(ctxs);
});

test('party mode: reveal auto-continues after the 15s countdown (no winner → neutral)', async ({ browser }) => {
  test.setTimeout(120000);
  const { host, picker, other, ctxs } = await setupTwoPlayerQuestion(browser);

  await expect(picker.getByTestId('controller-input')).toBeVisible({ timeout: 20000 });
  await picker.getByTestId('controller-input').fill('Zzqxwv');
  await picker.getByTestId('controller-submit').click();
  await expect(other.getByTestId('controller-input')).toBeVisible({ timeout: 20000 });
  await other.getByTestId('controller-input').fill('Yyqxwv');
  await other.getByTestId('controller-submit').click();

  await expect(host.getByTestId('party-reveal')).toBeVisible({ timeout: 20000 });
  // Leave it untouched — after the 15s countdown it auto-applies the (no-winner)
  // selection and closes on its own.
  await expect(host.getByTestId('party-reveal')).toHaveCount(0, { timeout: 25000 });
  // Nobody got it → the hex stays neutral (no owner).
  await expect(host.locator('.ll-hex[data-owner="A"], .ll-hex[data-owner="B"]')).toHaveCount(0);

  await close(ctxs);
});
