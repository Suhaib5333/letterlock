import { expect, test } from '@playwright/test';

// Party mode must fully fit on every device size — no scrolling, nothing pushed
// off-screen. These cover the two screens with the most content: the host lobby
// and the phone controller's question phase (where Submit used to fall below the
// fold on short / landscape screens).
const SIZES = [
  { name: '320x568 portrait', w: 320, h: 568 },
  { name: '360x640 portrait', w: 360, h: 640 },
  { name: '390x844 portrait', w: 390, h: 844 },
  { name: '667x375 landscape', w: 667, h: 375 },
  { name: '740x360 landscape', w: 740, h: 360 },
  { name: '844x390 landscape', w: 844, h: 390 },
];

function docOverflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    return { y: de.scrollHeight - de.clientHeight, x: de.scrollWidth - de.clientWidth };
  });
}

test('host lobby fits every device size (no scroll)', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => localStorage.setItem('letterlock.unlockall', '1'));
  for (const s of SIZES) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto('/');
    await page.getByTestId('play-button').click();
    await page.getByTestId('mode-online').click();
    await page.getByTestId('start-match').click();
    await page.getByTestId('lobby-host').waitFor();
    await page.waitForTimeout(300);
    const o = await docOverflow(page);
    expect(o.y, `vertical overflow at ${s.name}`).toBeLessThanOrEqual(1);
    expect(o.x, `horizontal overflow at ${s.name}`).toBeLessThanOrEqual(1);
  }
});

test('controller question phase: Submit stays in view at every size', async ({ browser }) => {
  test.setTimeout(120000);
  const hostCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  await host.addInitScript(() => localStorage.setItem('letterlock.unlockall', '1'));
  await host.goto('/');
  await host.getByTestId('play-button').click();
  await host.getByTestId('mode-online').click();
  await host.getByTestId('start-match').click();
  await expect(host.getByTestId('lobby-start')).toBeEnabled({ timeout: 20000 });
  const code = (await host.getByTestId('lobby-code').innerText()).replace(/[^A-Z0-9]/gi, '');

  const playerCtx = await browser.newContext();
  const player = await playerCtx.newPage();
  await player.goto(`/?room=${code}&view=controller&name=Tester`);
  await expect(player.getByTestId('controller-lobby')).toBeVisible({ timeout: 20000 });
  await expect(host.getByTestId('lobby-count')).toContainText('1 connected', { timeout: 20000 });
  await host.locator('.lobby-unassigned button', { hasText: 'Blue' }).first().click();
  await host.getByTestId('lobby-start').click();
  await host.locator('.ll-hex.claimable').first().click();
  await expect(player.getByTestId('controller-question')).toBeVisible({ timeout: 20000 });

  for (const s of SIZES) {
    await player.setViewportSize({ width: s.w, height: s.h });
    await player.waitForTimeout(250);
    const o = await docOverflow(player);
    expect(o.x, `horizontal overflow at ${s.name}`).toBeLessThanOrEqual(1);
    // The Submit button must be fully within the viewport (the original bug).
    const submitIn = await player.getByTestId('controller-submit').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom <= window.innerHeight + 1 && r.top >= -1 && r.width > 0;
    });
    expect(submitIn, `Submit fully in view at ${s.name}`).toBe(true);
    // The answer input must also be reachable.
    const inputIn = await player.getByTestId('controller-input').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom <= window.innerHeight + 1 && r.top >= -1;
    });
    expect(inputIn, `answer input in view at ${s.name}`).toBe(true);
  }
  await playerCtx.close();
  await hostCtx.close();
});
