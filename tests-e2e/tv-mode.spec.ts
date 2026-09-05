import { expect, test, type Page } from '@playwright/test';

/**
 * TV mode (LAUNCH_PLAN.md Phase 3b): the whole app driven with a remote.
 * 1920x1080, `?tv=1`, KEYBOARD ONLY: arrows, Enter, Escape/Backspace. No
 * page.click anywhere in this file. On every step the focused element must be
 * on screen and carry the big TV focus ring.
 */
test.use({ viewport: { width: 1920, height: 1080 } });
test.skip(({ isMobile }) => !!isMobile, 'TV mode is a 1080p, remote-driven run');
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('letterlock.unlockall', '1'));
});

interface Active {
  testid: string | null;
  role: string | null;
  cell: string | null;
  zone: string | null;
  pack: string | null;
  visible: boolean;
  ring: boolean;
  tv: boolean;
}

function active(page: Page): Promise<Active | null> {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a || a === document.body) return null;
    const r = a.getBoundingClientRect();
    const cs = getComputedStyle(a);
    const transparent = (c: string) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
    const outlineRing = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && !transparent(cs.outlineColor);
    const shadowRing = cs.boxShadow !== 'none';
    // The hex is an SVG group: its ring is the white hex outline (tv.css).
    const stroke = a.getAttribute('role') === 'gridcell' ? a.querySelector('.hex-stroke') : null;
    const hexRing = !!stroke && getComputedStyle(stroke).stroke === 'rgb(255, 255, 255)';
    return {
      testid: a.dataset.testid ?? null,
      role: a.getAttribute('role'),
      cell: a.dataset.cell ?? null,
      zone: (a.closest('[data-testid="question-card"], [data-testid="host-pad"]') as HTMLElement | null)?.dataset.testid ?? null,
      pack: (a.closest('[data-testid^="pack-"]') as HTMLElement | null)?.dataset.testid ?? null,
      visible: r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight,
      ring: outlineRing || shadowRing || hexRing,
      tv: document.documentElement.classList.contains('tv-mode'),
    };
  });
}

/** The focused control is on screen and wears the TV ring. */
async function expectRing(page: Page): Promise<Active> {
  await expect.poll(() => active(page), { timeout: 3000 }).toMatchObject({ visible: true, ring: true, tv: true });
  return (await active(page))!;
}

/** Press `key` until the focused element satisfies `pred` (bounded). */
async function pressUntil(page: Page, key: string, pred: (a: Active) => boolean, max = 12): Promise<Active> {
  for (let i = 0; i < max; i++) {
    const a = await active(page);
    if (a && pred(a)) return a;
    await page.keyboard.press(key);
    await page.waitForTimeout(80);
  }
  const a = await active(page);
  expect(a && pred(a), `focus never reached the target with ${key}; ended on ${JSON.stringify(a)}`).toBeTruthy();
  return a!;
}

async function expectNoPageScroll(page: Page) {
  const s = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight - window.innerHeight,
    w: document.documentElement.scrollWidth - window.innerWidth,
  }));
  expect(s.h).toBeLessThanOrEqual(1);
  expect(s.w).toBeLessThanOrEqual(1);
}

test('remote only: home -> category -> mode -> setup -> board -> question -> award -> back -> exit -> home', async ({ page }) => {
  await page.goto('/?tv=1');
  await expect(page.getByTestId('play-button')).toBeVisible();
  // Roving focus lands on the primary CTA without any key press.
  expect((await expectRing(page)).testid).toBe('play-button');
  await expectNoPageScroll(page);

  // Category menu (above Play), pick the first reachable pack.
  await pressUntil(page, 'ArrowUp', (a) => a.testid === 'open-categories');
  await expectRing(page);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('category-menu')).toBeVisible();
  await expectRing(page);
  const pack = await pressUntil(page, 'ArrowDown', (a) => a.pack !== null);
  await expectRing(page);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('category-menu')).toHaveCount(0);
  // The menu's own restore target was its (unmounted) search box, so roving focus
  // lands on Home's primary control instead of leaving the remote focus-less.
  await expectRing(page);

  // Play -> mode select -> setup -> start.
  await pressUntil(page, 'ArrowDown', (a) => a.testid === 'play-button');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('mode-select')).toBeVisible();
  expect((await expectRing(page)).testid).toBe('mode-couch');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('start-match')).toBeVisible();
  expect((await expectRing(page)).testid).toBe('start-match');
  await expectNoPageScroll(page);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('game-screen')).toBeVisible();

  // The cursor starts on a hex and arrows walk the board.
  const start = await expectRing(page);
  expect(start.role).toBe('gridcell');
  await page.keyboard.press('ArrowRight');
  const right = await expectRing(page);
  expect(right.role).toBe('gridcell');
  expect(right.cell).not.toBe(start.cell);
  await page.keyboard.press('ArrowDown');
  const down = await expectRing(page);
  expect(down.role).toBe('gridcell');
  expect(down.cell).not.toBe(right.cell);
  await expectNoPageScroll(page);

  // Pick it: a question is served.
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('question-card')).toBeVisible();
  await expectRing(page);

  // Over to the host pad and award the hex to a team.
  await pressUntil(page, 'ArrowRight', (a) => a.zone !== null, 8);
  await expectRing(page);
  const award = await pressUntil(page, 'ArrowDown', (a) => !!a.testid && /^award-[AB]$/.test(a.testid), 10);
  await expectRing(page);
  await page.keyboard.press('Enter');
  await expect(page.locator(`.ll-hex[data-cell="${down.cell}"][data-owner="${award.testid!.slice(-1)}"]`)).toHaveCount(1);
  // The pad unmounts (with an exit animation, so poll rather than sample once) and
  // focus rolls back onto the board instead of being lost.
  // The first claim raises the pie-rule prompt (§2.4 swap sides). It is a real
  // decision, so on a TV it must take the remote's focus — and dismissing it must
  // hand focus back to the board rather than leaving the remote nowhere.
  await expect(page.getByTestId('pie-banner')).toBeVisible();
  // Focus rolls over once the host pad finishes its exit animation, so poll.
  await expect
    .poll(async () => (await active(page))?.testid ?? null, { timeout: 5000 })
    .toBe('pie-swap');
  await expectRing(page);
  await pressUntil(page, 'ArrowRight', (a) => a.testid === 'pie-dismiss', 6);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pie-banner')).toHaveCount(0);
  await expect
    .poll(async () => (await active(page))?.role ?? null, { timeout: 5000 })
    .toBe('gridcell');
  await expectRing(page);

  // Back opens the exit confirm (never a dead end), confirm -> Home.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('exit-modal')).toBeVisible();
  expect((await expectRing(page)).testid).toBe('exit-cancel');
  await page.keyboard.press('ArrowRight');
  expect((await expectRing(page)).testid).toBe('exit-confirm');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('play-button')).toBeVisible();
  expect((await expectRing(page)).testid).toBe('play-button');
  expect(pack.pack).toMatch(/^pack-/);
});

test('Back on Home with nothing open does nothing harmful', async ({ page }) => {
  await page.goto('/?tv=1');
  await expect(page.getByTestId('play-button')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(150);
  await expect(page.getByTestId('play-button')).toBeVisible();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  await expectRing(page);
  // Back from a sub-screen returns one level (its "‹ Back" button).
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('mode-select')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-button')).toBeVisible();
});

test('room code pad: the remote types a code and the Join key takes focus', async ({ page }) => {
  await page.goto('/?tv=1');
  await expect(page.getByTestId('play-button')).toBeVisible();
  await expectRing(page);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('mode-select')).toBeVisible();
  await pressUntil(page, 'ArrowRight', (a) => a.testid === 'mode-join');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('lobby-join')).toBeVisible();
  await expect(page.getByTestId('room-pad')).toBeVisible();
  // Guest name via the (system) keyboard on the name field, then down to the pad.
  await pressUntil(page, 'ArrowDown', (a) => a.testid === 'join-name', 6);
  await page.keyboard.type('Couch');
  await pressUntil(page, 'ArrowDown', (a) => !!a.testid && a.testid.startsWith('pad-key-'), 6);
  await expectRing(page);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Enter');
    if (i < 5) await pressUntil(page, 'ArrowRight', (a) => !!a.testid && a.testid.startsWith('pad-key-') && !a.testid.endsWith(`-${'ABCDEF'[i]}`), 3);
  }
  await expect(page.getByTestId('join-code')).toHaveValue(/^[A-Z0-9]{6}$/);
  await expect(page.getByTestId('pad-join')).toBeFocused();
  await expectRing(page);
  await expect(page.getByTestId('join-submit')).toBeEnabled();
  await expectNoPageScroll(page);
});
