import { expect, test, type Browser, type Page } from '@playwright/test';

// Connection-resilience matrix: lose connection / refresh / go offline at every
// phase of an online match and confirm the player is restored and can continue.
// Online runs against the real local API + Socket.IO gateway (playwright.config.ts);
// the dev seams are enabled on localhost (no unlock needed: online uses the default 5x5).

const CONTROLLER = (code: string) => `/?room=${code}&view=controller&name=Tester`;

async function openHost(browser: Browser): Promise<{ host: Page; code: string; ctx: Awaited<ReturnType<Browser['newContext']>> }> {
  const ctx = await browser.newContext();
  const host = await ctx.newPage();
  await host.goto('/');
  await host.getByTestId('play-button').click();
  await host.getByTestId('mode-online').click();
  await host.getByTestId('start-match').click();
  await expect(host.getByTestId('lobby-start')).toBeEnabled({ timeout: 35000 });
  const code = (await host.getByTestId('lobby-code').innerText()).replace(/[^A-Z0-9]/gi, '');
  return { host, code, ctx };
}

async function joinPlayer(browser: Browser, code: string): Promise<{ player: Page; ctx: Awaited<ReturnType<Browser['newContext']>> }> {
  const ctx = await browser.newContext();
  const player = await ctx.newPage();
  await player.goto(CONTROLLER(code));
  await expect(player.getByTestId('controller-lobby')).toBeVisible({ timeout: 35000 });
  return { player, ctx };
}

async function assignAndStart(host: Page, team: 'Blue' | 'Amber') {
  await expect(host.getByTestId('lobby-count')).toContainText('1 connected', { timeout: 35000 });
  await host.locator('.lobby-unassigned button', { hasText: team }).first().click();
  await host.getByTestId('lobby-start').click();
  await expect(host.getByTestId('game-screen')).toBeVisible();
}

async function serveQuestion(host: Page, player: Page) {
  await host.locator('.ll-hex.claimable').first().click();
  await expect(host.getByTestId('question-card')).toBeVisible();
  await expect(player.getByTestId('controller-question')).toBeVisible({ timeout: 35000 });
}

// â”€â”€ 1. Refresh while in the LOBBY â†’ still joined, no name re-prompt â”€â”€
test('reconnect: refresh in lobby keeps the player joined', async ({ browser }) => {
  test.setTimeout(90000);
  const { host, code, ctx: hc } = await openHost(browser);
  const { player, ctx: pc } = await joinPlayer(browser, code);
  await player.reload();
  await expect(player.getByTestId('controller-lobby')).toBeVisible({ timeout: 35000 });
  await expect(player.getByTestId('controller-join')).toHaveCount(0);
  await pc.close();
  await hc.close();
});

// â”€â”€ 2. Refresh AFTER match start, before a question â†’ lands ready/question â”€â”€
test('reconnect: refresh after start (no question yet) re-syncs into the match', async ({ browser }) => {
  test.setTimeout(90000);
  const { host, code, ctx: hc } = await openHost(browser);
  const { player, ctx: pc } = await joinPlayer(browser, code);
  await assignAndStart(host, 'Blue');
  await expect(player.getByTestId('controller-ready')).toBeVisible({ timeout: 35000 });
  await player.reload();
  // Must leave the lobby/join â€” re-synced into the live match (ready or question).
  await expect(player.getByTestId('controller-join')).toHaveCount(0, { timeout: 35000 });
  await expect(player.locator('[data-testid="controller-ready"], [data-testid="controller-question"]')).toHaveCount(1, { timeout: 35000 });
  await pc.close();
  await hc.close();
});

// â”€â”€ 3. Refresh mid-question (NOT answered) â†’ back in the question, can answer â”€â”€
test('reconnect: refresh mid-question (unanswered) â†’ can still answer', async ({ browser }) => {
  test.setTimeout(90000);
  const { host, code, ctx: hc } = await openHost(browser);
  const { player, ctx: pc } = await joinPlayer(browser, code);
  await assignAndStart(host, 'Blue');
  await serveQuestion(host, player);
  await player.reload();
  await expect(player.getByTestId('controller-question')).toBeVisible({ timeout: 35000 });
  await expect(player.getByTestId('controller-input')).toBeVisible({ timeout: 35000 });
  await player.getByTestId('controller-input').fill('Reconnected');
  await player.getByTestId('controller-submit').click();
  await expect(player.getByTestId('controller-submitted')).toBeVisible({ timeout: 10000 });
  await pc.close();
  await hc.close();
});

// â”€â”€ 4. Refresh mid-question (ANSWERED) â†’ stays locked, no double submit â”€â”€
test('reconnect: refresh after answering stays locked (one answer)', async ({ browser }) => {
  test.setTimeout(90000);
  const { host, code, ctx: hc } = await openHost(browser);
  const { player, ctx: pc } = await joinPlayer(browser, code);
  await assignAndStart(host, 'Blue');
  await serveQuestion(host, player);
  await player.getByTestId('controller-input').fill('Zzwrong');
  await player.getByTestId('controller-submit').click();
  await expect(player.getByTestId('controller-submitted')).toBeVisible({ timeout: 10000 });
  await player.reload();
  await expect(player.getByTestId('controller-submitted')).toBeVisible({ timeout: 35000 });
  await expect(player.getByTestId('controller-input')).toHaveCount(0);
  await pc.close();
  await hc.close();
});

// â”€â”€ 5. Go OFFLINE then ONLINE mid-question (no reload) â†’ recovers + can answer â”€â”€
test('reconnect: offlineâ†’online mid-question recovers without reload', async ({ browser }) => {
  test.setTimeout(90000);
  const { host, code, ctx: hc } = await openHost(browser);
  const { player, ctx: pc } = await joinPlayer(browser, code);
  await assignAndStart(host, 'Blue');
  await serveQuestion(host, player);
  await pc.setOffline(true);
  await player.waitForTimeout(1500);
  await pc.setOffline(false);
  // After the socket recovers, the player can still submit an answer.
  await expect(player.getByTestId('controller-input')).toBeVisible({ timeout: 35000 });
  await player.getByTestId('controller-input').fill('BackOnline');
  await player.getByTestId('controller-submit').click();
  await expect(player.getByTestId('controller-submitted')).toBeVisible({ timeout: 15000 });
  await pc.close();
  await hc.close();
});

// â”€â”€ 6. LATE join: player joins AFTER the host already served a question â”€â”€
test('reconnect: a player who joins mid-question receives the live question', async ({ browser }) => {
  test.setTimeout(90000);
  const { host, code, ctx: hc } = await openHost(browser);
  // First player joins, gets assigned, host starts + serves a question.
  const { player, ctx: pc } = await joinPlayer(browser, code);
  await assignAndStart(host, 'Blue');
  await serveQuestion(host, player);
  // A SECOND player opens the controller mid-question â€” the host must re-broadcast
  // the in-flight question to them (so they aren't stranded in the lobby).
  const lc = await browser.newContext();
  const late = await lc.newPage();
  await late.goto(`/?room=${code}&view=controller&name=Latecomer`);
  await expect(late.getByTestId('controller-question')).toBeVisible({ timeout: 35000 });
  await lc.close();
  await pc.close();
  await hc.close();
});

// â”€â”€ 7. Team assignment survives a refresh â”€â”€
test('reconnect: team assignment persists across a refresh', async ({ browser }) => {
  test.setTimeout(90000);
  const { host, code, ctx: hc } = await openHost(browser);
  const { player, ctx: pc } = await joinPlayer(browser, code);
  await expect(host.getByTestId('lobby-count')).toContainText('1 connected', { timeout: 35000 });
  await host.locator('.lobby-unassigned button', { hasText: 'Amber' }).first().click();
  await expect(player.getByTestId('controller-team')).toHaveText(/Amber/i, { timeout: 35000 });
  await player.reload();
  await expect(player.getByTestId('controller-team')).toHaveText(/Amber/i, { timeout: 35000 });
  await pc.close();
  await hc.close();
});

