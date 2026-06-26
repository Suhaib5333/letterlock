import { expect, test, type Browser, type Page } from '@playwright/test';

// Couch Mode with linked players (XP attribution):
//   - Couch Setup offers a host-team selector + an "Invite players for XP" button.
//   - Inviting opens a Couch lobby (QR/code); a joined phone is PASSIVE (no answer
//     input) — it just watches the big screen and earns XP for its team.
//   - The host adjudicates on the shared screen (HostPad), and on a game win the
//     result reaches the linked phone (its XP-award trigger).
// (Real XP increments need a signed-in account, which the isolated test browser
//  can't OTP into — the winner/loser/host XP MATH is proven by unit tests in
//  src/core/progression.test.ts; here we prove the end-to-end FLOW + passive view.)

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('letterlock.unlockall', '1'));
});

const CONTROLLER = (code: string, name: string) => `/?room=${code}&view=controller&name=${name}`;

test('couch Setup shows the host-team selector and the Invite-for-XP button', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await expect(page.getByTestId('mode-badge')).toContainText(/Couch/i);
  // Host picks which team they play on (or "just hosting").
  await expect(page.getByTestId('host-team-A')).toBeVisible();
  await expect(page.getByTestId('host-team-B')).toBeVisible();
  await expect(page.getByTestId('host-team-none')).toBeVisible();
  // And can open a room for friends to link their accounts for XP.
  await expect(page.getByTestId('couch-invite')).toBeVisible();
  // Solo start still works (goes straight to the board, no lobby).
  await expect(page.getByTestId('start-match')).toHaveText(/Start match/i);
});

test('party Setup does NOT show the couch host-team selector (host is arbiter)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-online').click();
  await expect(page.getByTestId('mode-badge')).toContainText(/Party/i);
  await expect(page.getByTestId('host-team-A')).toHaveCount(0);
  await expect(page.getByTestId('couch-invite')).toHaveCount(0);
});

async function openCouchLobby(browser: Browser): Promise<{ host: Page; code: string; ctx: Awaited<ReturnType<Browser['newContext']>> }> {
  const ctx = await browser.newContext();
  const host = await ctx.newPage();
  await host.addInitScript(() => localStorage.setItem('letterlock.unlockall', '1'));
  await host.goto('/');
  await host.getByTestId('play-button').click();
  await host.getByTestId('mode-couch').click();
  await host.getByTestId('mode-single').click(); // single game so a win ends the match
  await host.getByTestId('couch-invite').click(); // open the couch lobby
  await expect(host.getByTestId('lobby-host')).toBeVisible();
  await expect(host.getByTestId('mode-badge')).toContainText(/Couch/i); // couch lobby, not party
  await expect(host.getByTestId('lobby-start')).toBeEnabled({ timeout: 35000 });
  const code = (await host.getByTestId('lobby-code').innerText()).replace(/[^A-Z0-9]/gi, '');
  return { host, code, ctx };
}

test('couch link: joined phone is PASSIVE (no answer input) and earns XP on a win', async ({ browser }) => {
  test.setTimeout(120000);
  const { host, code, ctx: hc } = await openCouchLobby(browser);

  const pc = await browser.newContext();
  const player = await pc.newPage();
  await player.goto(CONTROLLER(code, 'Linked'));
  await expect(player.getByTestId('controller-lobby')).toBeVisible({ timeout: 35000 });

  // Host puts the player on Blue (Team A) and starts.
  await expect(host.getByTestId('lobby-count')).toContainText('1 connected', { timeout: 35000 });
  await host.locator('.lobby-unassigned button', { hasText: 'Blue' }).first().click();
  await host.getByTestId('lobby-start').click();
  await expect(host.getByTestId('game-screen')).toBeVisible();

  // Host serves a question (cell 10, start of row 2) → couch uses the manual
  // HostPad (NOT the party reveal overlay).
  await host.locator('.ll-hex.claimable[data-cell="10"]').click();
  await expect(host.getByTestId('question-card')).toBeVisible();
  await expect(host.getByTestId('host-pad')).toBeVisible();
  await expect(host.getByTestId('party-reveal')).toHaveCount(0);

  // The linked phone shows the PASSIVE watch-and-earn view — never an answer input.
  await expect(player.getByTestId('controller-couch-watch')).toBeVisible({ timeout: 35000 });
  await expect(player.getByTestId('controller-input')).toHaveCount(0);
  await expect(player.getByTestId('controller-submit')).toHaveCount(0);

  // Host adjudicates this hex to Blue, then completes a left↔right connection for
  // Team A (row 2 = cells 10..14 on a 5×5) to win the single-game match.
  await host.getByTestId('award-A').click();
  for (const cell of [11, 12, 13, 14]) {
    await host.locator(`.ll-hex.claimable[data-cell="${cell}"]`).click();
    await expect(host.getByTestId('question-card')).toBeVisible();
    await host.getByTestId('award-A').click();
  }
  // The win reaches the linked phone (its XP-award trigger) → final result screen.
  await expect(player.getByTestId('controller-done')).toBeVisible({ timeout: 35000 });
  await expect(player.getByTestId('controller-done')).toContainText(/Your team|Blue/i);

  await pc.close();
  await hc.close();
});
