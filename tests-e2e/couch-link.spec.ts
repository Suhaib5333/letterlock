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

test('couch lobby: player picks their own team, is told they can close, then closes', async ({ browser }) => {
  test.setTimeout(120000);
  const { host, code, ctx: hc } = await openCouchLobby(browser);
  const hostErrors: string[] = [];
  host.on('pageerror', (e) => hostErrors.push(e.message));

  const pc = await browser.newContext();
  const player = await pc.newPage();
  await player.goto(CONTROLLER(code, 'Picker'));
  await expect(player.getByTestId('controller-lobby')).toBeVisible({ timeout: 35000 });

  // The couch lobby lets the player pick their OWN team (so they don't have to
  // wait for the host) — picking locks in their membership server-side.
  await expect(player.getByTestId('controller-pickteam')).toBeVisible({ timeout: 35000 });
  await player.getByTestId('pickteam-A').click();
  // …and they're told it's safe to close the phone now.
  await expect(player.getByTestId('controller-couch-linked')).toBeVisible({ timeout: 10000 });
  await expect(player.getByTestId('controller-couch-close')).toBeVisible();
  // The host sees them on Blue (Team A) via presence.
  await expect(host.getByTestId('lobby-team-A')).toContainText('Picker', { timeout: 35000 });

  // Player CLOSES their phone right from the lobby — before the match even starts.
  await pc.close();

  // Host starts whenever and plays a Team A win; the closed phone causes no error.
  await host.getByTestId('lobby-start').click();
  await expect(host.getByTestId('game-screen')).toBeVisible();
  for (const cell of [10, 11, 12, 13, 14]) {
    await host.locator(`.ll-hex.claimable[data-cell="${cell}"]`).click();
    await expect(host.getByTestId('question-card')).toBeVisible();
    await host.getByTestId('award-A').click();
  }
  await expect(host.getByTestId('game-over')).toBeVisible({ timeout: 10000 });
  expect(hostErrors).toEqual([]);

  await hc.close();
});

test('couch link: host can × remove a player (they are ejected from the room)', async ({ browser }) => {
  test.setTimeout(120000);
  const { host, code, ctx: hc } = await openCouchLobby(browser);

  const pc = await browser.newContext();
  const player = await pc.newPage();
  await player.goto(CONTROLLER(code, 'Unwanted'));
  await expect(player.getByTestId('controller-lobby')).toBeVisible({ timeout: 35000 });
  await expect(host.getByTestId('lobby-count')).toContainText('1 connected', { timeout: 35000 });
  // Wait until the player row (with its × remove button) has actually rendered.
  await expect(host.getByTestId('lobby-roster')).toContainText('Unwanted', { timeout: 35000 });
  const removeBtn = host.locator('.lobby-roster .lobby-kick').first();
  await expect(removeBtn).toBeVisible({ timeout: 35000 });

  // Host clicks the × next to the player → they're removed from the room.
  await removeBtn.click();
  await expect(player.getByTestId('controller-error')).toBeVisible({ timeout: 35000 });
  await expect(player.getByTestId('controller-error')).toContainText(/removed/i);
  // Roster empties on the host side too.
  await expect(host.getByTestId('lobby-count')).toContainText('0 connected', { timeout: 35000 });

  await pc.close();
  await hc.close();
});

test('couch link: a player can CLOSE their phone after joining and the host finishes fine', async ({ browser }) => {
  test.setTimeout(120000);
  const { host, code, ctx: hc } = await openCouchLobby(browser);
  // Catch any uncaught host error caused by a vanished player.
  const hostErrors: string[] = [];
  host.on('pageerror', (e) => hostErrors.push(e.message));

  const pc = await browser.newContext();
  const player = await pc.newPage();
  await player.goto(CONTROLLER(code, 'Driveby'));
  await expect(player.getByTestId('controller-lobby')).toBeVisible({ timeout: 35000 });
  await expect(host.getByTestId('lobby-count')).toContainText('1 connected', { timeout: 35000 });
  await host.locator('.lobby-unassigned button', { hasText: 'Blue' }).first().click();
  await host.getByTestId('lobby-start').click();
  await expect(host.getByTestId('game-screen')).toBeVisible();

  // The player scanned once and is linked — now they CLOSE their phone entirely.
  await pc.close();

  // Host plays the game to a Team A win (row 2). The server credits members at
  // game end; the closed phone causes NO error on the host, and the match
  // completes normally.
  for (const cell of [10, 11, 12, 13, 14]) {
    await host.locator(`.ll-hex.claimable[data-cell="${cell}"]`).click();
    await expect(host.getByTestId('question-card')).toBeVisible();
    await host.getByTestId('award-A').click();
  }
  await expect(host.getByTestId('game-over')).toBeVisible({ timeout: 10000 });
  expect(hostErrors).toEqual([]);

  await hc.close();
});
