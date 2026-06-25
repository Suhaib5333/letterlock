import { expect, test } from '@playwright/test';

// Reconnection guarantee: a player who leaves/refreshes — even mid-question —
// is dropped straight back into the live match and can still type an answer.
// Exercises the real host↔player realtime path (two browser contexts).
test('a player who refreshes mid-question is put back and can still answer', async ({ browser }) => {
  test.setTimeout(90000);

  const hostCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  await host.goto('/');
  await host.getByTestId('play-button').click();
  await host.getByTestId('mode-online').click();
  await host.getByTestId('start-match').click(); // Online: Setup → Create room
  await expect(host.getByTestId('lobby-host')).toBeVisible();
  await expect(host.getByTestId('lobby-start')).toBeEnabled({ timeout: 20000 });
  const code = (await host.getByTestId('lobby-code').innerText()).replace(/[^A-Z0-9]/gi, '');

  const playerCtx = await browser.newContext();
  const player = await playerCtx.newPage();
  await player.goto(`/?room=${code}&view=controller&name=Recon`);
  await expect(player.getByTestId('controller-lobby')).toBeVisible({ timeout: 20000 });

  // Assign to Blue (Team A = first picker) and start.
  await expect(host.getByTestId('lobby-count')).toContainText('1 connected', { timeout: 20000 });
  await host.locator('.lobby-unassigned button', { hasText: 'Blue' }).first().click();
  await host.getByTestId('lobby-start').click();
  await expect(host.getByTestId('game-screen')).toBeVisible();

  // Host serves a question → it reaches the player's phone.
  await host.locator('.ll-hex.claimable').first().click();
  await expect(host.getByTestId('question-card')).toBeVisible();
  await expect(player.getByTestId('controller-question')).toBeVisible({ timeout: 20000 });

  // ── THE RECONNECT: player refreshes mid-question ──
  await player.reload();

  // Put straight back into the SAME live question — not the join/name screen,
  // not a stale "waiting" lobby — with the answer input ready.
  await expect(player.getByTestId('controller-question')).toBeVisible({ timeout: 20000 });
  await expect(player.getByTestId('controller-input')).toBeVisible({ timeout: 20000 });

  // …and the answer still goes through to the host.
  await player.getByTestId('controller-input').fill('Reconnected');
  await player.getByTestId('controller-submit').click();
  await expect(host.getByTestId('online-show-answers')).toBeVisible({ timeout: 20000 });
  await host.getByTestId('online-show-answers').click();
  await expect(host.getByTestId('online-answers')).toContainText('Reconnected', { timeout: 20000 });

  await playerCtx.close();
  await hostCtx.close();
});
