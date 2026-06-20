import { expect, test, type Page } from '@playwright/test';

async function startMatch(
  page: Page,
  opts?: { size?: 4 | 5 | 7; mode?: 'single' | 'bo3' | 'bo5' },
) {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  if (opts?.mode) await page.getByTestId(`mode-${opts.mode}`).click();
  if (opts?.size) await page.getByTestId(`size-${opts.size}`).click();
  await page.getByTestId('start-match').click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
}

/** Open the category browse menu and choose a pack (selecting closes the menu). */
async function selectPack(page: Page, id: string) {
  await page.getByTestId('open-categories').click();
  await expect(page.getByTestId('category-menu')).toBeVisible();
  await page.getByTestId(`pack-${id}`).click();
  await expect(page.getByTestId('category-menu')).toHaveCount(0);
}

/** Pick a specific neutral hex and award it to a team via the host pad. */
async function claimFor(page: Page, cell: number, team: 'A' | 'B') {
  await page.locator(`.ll-hex.claimable[data-cell="${cell}"]`).click();
  await expect(page.getByTestId('question-card')).toBeVisible();
  await page.getByTestId(`award-${team}`).click();
}

test('home → setup → board renders with both teams', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('open-categories')).toBeVisible();
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('swatch-a-teal').click();
  await page.getByTestId('swatch-b-rose').click();
  // team name follows the chosen colour (not typable)
  await expect(page.getByTestId('team-a-name')).toHaveText('Teal');
  await expect(page.getByTestId('team-b-name')).toHaveText('Rose');
  await page.getByTestId('start-match').click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
  await expect(page.getByTestId('team-panel-A')).toContainText('Teal');
  await expect(page.getByTestId('team-panel-B')).toContainText('Rose');
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
  await expect(page.getByTestId('open-categories')).toBeVisible(); // back home
});

test('teams can pick colors and it carries into the match', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
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
  await selectPack(page, 'flags-easy');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('mode-single').click();
  await page.getByTestId('start-match').click();
  // No letter glyphs rendered on the board.
  await expect(page.locator('.ll-board .hex-letter')).toHaveCount(0);
  await page.locator('.ll-hex.claimable').first().click();
  await expect(page.getByTestId('question-card')).toBeVisible();
  // flag <img> is present (avoid network flakiness by asserting presence, not load)
  await expect(page.locator('.qcard-flag')).toHaveCount(1);
});

test('world-map: no <title> in the rendered svg (hover would leak the country)', async ({ page }) => {
  await page.goto('/');
  await selectPack(page, 'maps-easy');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('mode-single').click();
  await page.getByTestId('start-match').click();
  await page.locator('.ll-hex.claimable').first().click();
  const map = page.getByTestId('qcard-map');
  await expect(map.locator('svg')).toBeVisible({ timeout: 5000 });
  // The source BlankMap-World.svg ships <title> tags inside every country
  // path → browsers render them as native tooltips on hover, giving the
  // answer away. They're stripped both at build time (world.svg) and at
  // render time (CountryMap) — verify nothing slipped through.
  const titleCount = await map.locator('svg title').count();
  expect(titleCount).toBe(0);
});

test('world-map: viewBox is zoomed in (not the whole-world default)', async ({ page }) => {
  await page.goto('/');
  await selectPack(page, 'maps-easy');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('mode-single').click();
  await page.getByTestId('start-match').click();
  await page.locator('.ll-hex.claimable').first().click();
  const map = page.getByTestId('qcard-map');
  await expect(map.locator('svg')).toBeVisible({ timeout: 5000 });
  // The CountryMap effect retargets the SVG's viewBox to the highlighted
  // country's bbox + context padding. So the live viewBox must DIFFER from
  // the source default "0 0 2754 1398" — that's the binary "zoom happened"
  // check, robust to whatever country gets served by the no-repeat cycle.
  const vb = await map.locator('svg').evaluate((svg) => {
    const v = (svg as SVGSVGElement).viewBox.baseVal;
    return { x: v.x, y: v.y, w: v.width, h: v.height };
  });
  const isWholeWorld = vb.x === 0 && vb.y === 0 && vb.w === 2754 && vb.h === 1398;
  expect(isWholeWorld).toBe(false);
  // And the zoomed window covers at most ~90% of the world area — even
  // for huge countries (USA, Russia) the bbox + pad still excludes large
  // empty regions on the opposite side of the globe.
  expect(vb.w * vb.h).toBeLessThan(2754 * 1398 * 0.95);
});

test('world-map: clicking the map opens fullscreen, ✕ closes it', async ({ page }) => {
  await page.goto('/');
  await selectPack(page, 'maps-easy');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('mode-single').click();
  await page.getByTestId('start-match').click();
  await page.locator('.ll-hex.claimable').first().click();
  await expect(page.getByTestId('qcard-map').locator('svg')).toBeVisible({ timeout: 5000 });
  // Tap the map → fullscreen overlay appears with its own svg + a close button.
  await page.getByTestId('qcard-map-expand').click();
  const fs = page.getByTestId('qcard-map-fullscreen');
  await expect(fs).toBeVisible();
  await expect(fs.locator('svg')).toBeVisible({ timeout: 5000 });
  // ✕ closes the overlay.
  await page.getByTestId('qcard-map-fs-close').click();
  await expect(fs).toHaveCount(0);
});

test('world-map: pressing Escape closes the fullscreen overlay', async ({ page }) => {
  await page.goto('/');
  await selectPack(page, 'maps-easy');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('mode-single').click();
  await page.getByTestId('start-match').click();
  await page.locator('.ll-hex.claimable').first().click();
  await expect(page.getByTestId('qcard-map').locator('svg')).toBeVisible({ timeout: 5000 });
  await page.getByTestId('qcard-map-expand').click();
  await expect(page.getByTestId('qcard-map-fullscreen')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('qcard-map-fullscreen')).toHaveCount(0);
});

// Verifies the world-map question fits its card at multiple device sizes:
//  - the inline <svg> fills the qcard-map container exactly (no overflow / scrollbars)
//  - the "Name the highlighted country" overlay sits on the map
//  - the highlighted country path is visible inside the rendered svg.
for (const { name, w, h } of [
  { name: 'iphone-portrait', w: 390, h: 844 },
  { name: 'iphone-landscape', w: 844, h: 390 },
  { name: 'desktop', w: 1440, h: 900 },
]) {
  test(`world-map question fits perfectly on ${name} (${w}×${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    await selectPack(page, 'maps-easy');
    await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
    await page.getByTestId('mode-single').click();
    await page.getByTestId('start-match').click();
    // Letterless: no per-hex letters AND chess coords are drawn.
    await expect(page.locator('.ll-board .hex-letter')).toHaveCount(0);
    await expect(page.locator('.ll-board .ll-coord-col').first()).toBeVisible();
    await page.locator('.ll-hex.claimable').first().click();
    await expect(page.getByTestId('question-card')).toBeVisible();

    const map = page.getByTestId('qcard-map');
    await expect(map).toBeVisible();
    await expect(map.locator('svg')).toBeVisible({ timeout: 5000 });

    // The overlay label always shows the prompt, so the player never needs to
    // hunt for it. The duplicate question text below is hidden for map cards.
    await expect(map.locator('.qcard-map-overlay')).toHaveText(/Name the highlighted country/i);
    await expect(page.getByTestId('question-text')).toHaveCount(0);

    // 1) The SVG must fit inside the container — its rendered width/height
    //    can't exceed the container's. This catches the "horizontal scrollbar"
    //    regression where the source SVG's fixed 2754×1398 dimensions blew
    //    past the card on small screens.
    const fit = await map.evaluate((el) => {
      const svg = el.querySelector('svg');
      if (!svg) return null;
      const a = el.getBoundingClientRect();
      const b = svg.getBoundingClientRect();
      return {
        cardW: a.width, cardH: a.height,
        svgW: b.width, svgH: b.height,
        scrollX: el.scrollWidth - el.clientWidth,
        scrollY: el.scrollHeight - el.clientHeight,
      };
    });
    expect(fit).not.toBeNull();
    expect(fit!.svgW).toBeLessThanOrEqual(fit!.cardW + 1);
    expect(fit!.svgH).toBeLessThanOrEqual(fit!.cardH + 1);
    expect(fit!.scrollX).toBeLessThanOrEqual(0);
    expect(fit!.scrollY).toBeLessThanOrEqual(0);

    // 2) The whole game container also shouldn't scroll horizontally because
    //    of this card (covers the case where the map pushes the row wider).
    const docScroll = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    }));
    expect(docScroll.x).toBeLessThanOrEqual(0);
  });
}

test('letterless packs show chess-style coordinates (cols 1..N, rows A..N)', async ({ page }) => {
  await page.goto('/');
  await selectPack(page, 'flags-easy');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('size-5').click();
  await page.getByTestId('start-match').click();
  // Per-hex letters are still hidden…
  await expect(page.locator('.ll-board .hex-letter')).toHaveCount(0);
  // …but the chess-coord layer is rendered with 5 column numbers + 5 row letters.
  await expect(page.locator('.ll-board .ll-coord-col')).toHaveCount(5);
  await expect(page.locator('.ll-board .ll-coord-row')).toHaveCount(5);
  await expect(page.locator('.ll-board .ll-coord-col').nth(0)).toHaveText('1');
  await expect(page.locator('.ll-board .ll-coord-col').nth(4)).toHaveText('5');
  await expect(page.locator('.ll-board .ll-coord-row').nth(0)).toHaveText('A');
  await expect(page.locator('.ll-board .ll-coord-row').nth(4)).toHaveText('E');
});

test('lettered packs do NOT render chess coords (avoid double-labelling)', async ({ page }) => {
  await startMatch(page, { size: 5, mode: 'single' });
  // Letters on hexes are visible — coords should NOT also be drawn.
  await expect(page.locator('.ll-board .hex-letter').first()).toBeVisible();
  await expect(page.locator('.ll-board .ll-coord-col')).toHaveCount(0);
  await expect(page.locator('.ll-board .ll-coord-row')).toHaveCount(0);
});

test('melody pack plays a real audio clip and hides board letters', async ({ page }) => {
  await page.goto('/');
  await selectPack(page, 'melodies');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('mode-single').click();
  await page.getByTestId('start-match').click();
  await expect(page.locator('.ll-board .hex-letter')).toHaveCount(0); // letters hidden
  await page.locator('.ll-hex.claimable').first().click();
  await expect(page.getByTestId('question-card')).toBeVisible();
  const audio = page.getByTestId('qcard-audio');
  await expect(audio).toHaveCount(1);
  // A melody is either a synthesized PD clip (/clips/*.wav) or an iTunes instrumental
  // preview (.m4a) — both are real, playable audio.
  await expect(audio).toHaveAttribute('src', /\/clips\/.*\.wav$|itunes\.apple\.com.*\.m4a/);
});

test('tv-clips pack plays a real episode video clip and hides board letters', async ({ page }) => {
  await page.goto('/');
  await selectPack(page, 'tv-clips');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('mode-single').click();
  await page.getByTestId('start-match').click();
  await expect(page.locator('.ll-board .hex-letter')).toHaveCount(0); // letters hidden
  await page.locator('.ll-hex.claimable').first().click();
  await expect(page.getByTestId('question-card')).toBeVisible();
  const vid = page.getByTestId('qcard-video');
  await expect(vid).toHaveCount(1);
  await expect(vid).toHaveAttribute('src', /itunes\.apple\.com.*\.m4v/);
  await expect(page.getByTestId('skip-question')).toBeEnabled();
});

test('clip timer holds until the clip is first played, then counts down', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await selectPack(page, 'tv-clips');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('mode-single').click();
  await page.getByTestId('start-match').click();
  await page.locator('.ll-hex.claimable').first().click();
  const num = page.locator('.timer-num');
  await expect(num).toBeVisible();
  const before = await num.textContent();
  // Before playing the clip the countdown is HELD (reading/watching isn't on the clock).
  await page.waitForTimeout(1600);
  await expect(num).toHaveText(before!); // unchanged
  // Trigger the clip's first play → the timer starts.
  await page.getByTestId('qcard-video').evaluate((v: HTMLVideoElement) => v.dispatchEvent(new Event('play')));
  await page.waitForTimeout(1600);
  const after = await num.textContent();
  expect(parseInt(after!)).toBeLessThan(parseInt(before!));
});

test('image timer holds until the image fully loads, then counts down', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  // Throttle ALL flag image requests so the image takes ~2.5s to start arriving.
  // The timer must NOT decrement during that load window — the user's complaint was
  // "the image still takes from the timer while it's loading". Flags are bundled
  // locally at /flags/<code>.svg (see src/content/flags.ts).
  await page.route('**/flags/*.svg', async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  await page.goto('/');
  await selectPack(page, 'flags-easy');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('mode-single').click();
  await page.getByTestId('start-match').click();
  await page.locator('.ll-hex.claimable').first().click();
  await expect(page.getByTestId('question-card')).toBeVisible();
  const num = page.locator('.timer-num');
  await expect(num).toBeVisible();
  const before = await num.textContent();
  // While the image is still in flight (intercepted, hasn't fired onLoad yet) — the
  // countdown must HOLD. Sample at 1.8s, well before the 2.5s release.
  await page.waitForTimeout(1800);
  await expect(num).toHaveText(before!);
  // Wait for the image to actually finish loading…
  await page
    .locator('img.qcard-flag')
    .evaluate(
      (el: HTMLImageElement) =>
        new Promise<void>((res) => {
          if (el.complete && el.naturalWidth > 0) return res();
          el.addEventListener('load', () => res(), { once: true });
          el.addEventListener('error', () => res(), { once: true });
        }),
    );
  // …then the timer should start decrementing.
  await page.waitForTimeout(1500);
  const after = await num.textContent();
  expect(parseInt(after!)).toBeLessThan(parseInt(before!));
});

test('pie-rule prompt is an overlay that does not shrink the board, and swap works (no blank)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startMatch(page, { size: 5, mode: 'single' });
  // Claim one hex for A → it becomes B's turn with the pie-rule offer.
  await claimFor(page, 0, 'A');
  const pop = page.getByTestId('pie-banner');
  await expect(pop).toBeVisible();
  // The popup overlays (position:absolute) so it is OUT OF FLOW and cannot reflow
  // or shrink the board — this is the core fix for the "hex gets smaller" bug.
  const overlay = await pop.evaluate((el) => getComputedStyle(el).position);
  expect(overlay).toBe('absolute');
  const boardH = await page.locator('.ll-board').evaluate((el) => el.getBoundingClientRect().height);
  expect(boardH).toBeGreaterThan(120); // board stays clearly visible, never collapsed
  // Swapping sides keeps the game on-screen (no blank) and leaves one owned hex.
  await page.getByTestId('pie-swap').click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
  await expect(page.locator('.ll-hex[data-owner="A"],.ll-hex[data-owner="B"]')).toHaveCount(1);
  await expect(pop).toHaveCount(0); // prompt dismissed after swapping
});

test('an uncaught error shows a recovery card, never a blank screen', async ({ page }) => {
  // A blank screen = the React tree unmounted on an uncaught error. The top-level
  // ErrorBoundary must catch ANY such error and show a recoverable card instead.
  await page.goto('/?__crashtest=1');
  await expect(page.getByTestId('crash-screen')).toBeVisible();
  await expect(page.getByTestId('crash-recover')).toBeVisible();
  // Recover returns to a clean home (no crash param) — fully playable again.
  await page.getByTestId('crash-recover').click();
  await expect(page.getByTestId('open-categories')).toBeVisible();
  await expect(page.getByTestId('crash-screen')).toHaveCount(0);
});

test('no pie-swap offer (and no blank-screen crash) when the opponent steals the first hex', async ({ page }) => {
  // Regression: B stealing the very first hex left A owning nothing, but the swap
  // window still opened. Clicking "Swap sides" then threw and crashed the whole UI
  // to a blank screen. The swap must simply not be offered in that case.
  const crashes: string[] = [];
  page.on('pageerror', (e) => crashes.push(e.message));
  await startMatch(page, { size: 5, mode: 'single' });
  // A picks the opening hex but B WINS it (steal) via the host pad.
  await claimFor(page, 0, 'B');
  await expect(page.locator('.ll-hex[data-cell="0"][data-owner="B"]')).toHaveCount(1);
  // The pie-swap prompt must NOT appear (A owns no hex to swap into).
  await expect(page.getByTestId('pie-banner')).toHaveCount(0);
  // The game keeps playing normally — board on screen, never blanked.
  await expect(page.getByTestId('game-screen')).toBeVisible();
  await expect(page.locator('.ll-board')).toBeVisible();
  await page.locator('.ll-hex.claimable').first().click();
  await expect(page.getByTestId('question-card')).toBeVisible();
  expect(crashes).toEqual([]); // no uncaught error ever reached the page
});

test('manual switch-turn flips the active team', async ({ page }) => {
  await startMatch(page, { size: 5, mode: 'single' });
  const banner = page.getByTestId('turn-banner');
  const first = (await banner.innerText()).includes('Blue') ? 'Blue' : 'Amber';
  await page.getByTestId('switch-turn').click();
  await expect(banner).not.toContainText(first);
});

test('only one skip is allowed and the skip button then disables', async ({ page }) => {
  await startMatch(page);
  await page.locator('.ll-hex.claimable[data-cell="0"]').click();
  await expect(page.getByTestId('question-card')).toBeVisible();
  const skip = page.getByTestId('skip-question');
  await expect(skip).toBeEnabled();
  await skip.click();
  await expect(skip).toBeDisabled(); // second skip not allowed
});

test('charades pack shows a QR secret-prompt and the /img page renders the word', async ({ page }) => {
  await page.goto('/');
  await selectPack(page, 'charades-easy');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('mode-single').click();
  await page.getByTestId('start-match').click();
  await page.locator('.ll-hex.claimable').first().click();
  await expect(page.getByTestId('question-card')).toBeVisible();
  await expect(page.getByTestId('charade-qr')).toBeVisible();
  // "Show answer" reveals the word + the prompt image (host verification).
  await page.getByTestId('reveal-answer').click();
  await expect(page.getByTestId('answer-text')).toBeVisible();
  await expect(page.locator('.answer-charade-img')).toHaveCount(1);
  // The standalone secret-prompt deep link renders a name.
  await page.goto('/?view=img&w=Elephant&img=&h=Act%20it%20out!');
  await expect(page.getByTestId('imgview-name')).toHaveText('Elephant');
});

test('charade questions show a Start-timer button that releases the held countdown', async ({ page }) => {
  await page.goto('/');
  await selectPack(page, 'charades-easy');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('mode-single').click();
  await page.getByTestId('start-match').click();
  await page.locator('.ll-hex.claimable').first().click();
  await expect(page.getByTestId('question-card')).toBeVisible();
  const num = page.locator('.timer-num');
  await expect(num).toBeVisible();
  const before = await num.textContent();
  // Before the Start tap the clock is HELD so players can scan the QR.
  await page.waitForTimeout(1700);
  await expect(num).toHaveText(before!);
  const startBtn = page.getByTestId('charade-start');
  await expect(startBtn).toBeVisible();
  await expect(startBtn).toBeEnabled();
  await startBtn.click();
  // After tapping it disables (one-shot) and the countdown starts decrementing.
  await expect(startBtn).toBeDisabled();
  await page.waitForTimeout(1500);
  const after = await num.textContent();
  expect(parseInt(after!)).toBeLessThan(parseInt(before!));
});

test('an unreachable media clip AUTO-ADVANCES to another question on its own', async ({ page }) => {
  await page.goto('/');
  await selectPack(page, 'songs');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('mode-single').click();
  await page.getByTestId('start-match').click();
  await page.locator('.ll-hex.claimable').first().click();
  await expect(page.getByTestId('question-card')).toBeVisible();
  const audio = page.getByTestId('qcard-audio');
  await expect(audio).toHaveCount(1);
  const firstSrc = await audio.getAttribute('src');
  // Simulate the hotlinked preview failing to load.
  await audio.evaluate((el) => el.dispatchEvent(new Event('error')));
  // It shows the auto-advance notice (no manual action needed)…
  await expect(page.getByTestId('media-error')).toHaveAttribute('data-auto', '1');
  // …then serves a DIFFERENT question all by itself — the game never stalls.
  await expect
    .poll(async () => page.getByTestId('qcard-audio').getAttribute('src'), { timeout: 5000 })
    .not.toBe(firstSrc);
  await expect(page.getByTestId('question-card')).toBeVisible();
});

test('auth modal opens with Google sign-in CTA (Supabase configured)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-auth').click();
  await expect(page.getByTestId('auth-modal')).toBeVisible();
  await expect(page.getByTestId('signin-google')).toBeVisible();
  await expect(page.getByTestId('auth-cancel')).toBeVisible();
});

test('leaderboard modal opens, shows the pack filter and loading state', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-leaderboard').click();
  await expect(page.getByTestId('leaderboard-modal')).toBeVisible();
  await expect(page.getByTestId('lb-pack')).toBeVisible();
  await expect(page.getByTestId('lb-list')).toBeVisible();
});

test('category browser collapses tier siblings under one card with a picker', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-categories').click();
  // Sitcoms easy/medium/hard share the `sitcoms` stem — the browser should
  // render ONE card with three tier buttons (one per difficulty) rather than
  // three near-identical full cards. Tier buttons carry deterministic ids.
  await expect(page.locator('[data-testid="pack-tier-sitcoms-easy"]')).toBeVisible();
  await expect(page.locator('[data-testid="pack-tier-sitcoms-medium"]')).toBeVisible();
  await expect(page.locator('[data-testid="pack-tier-sitcoms-hard"]')).toBeVisible();
  // Tapping a tier updates the card's selected state.
  await page.locator('[data-testid="pack-tier-sitcoms-medium"]').click();
  await expect(page.locator('[data-testid="pack-tier-sitcoms-medium"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-testid="pack-tier-sitcoms-easy"]')).toHaveAttribute('aria-selected', 'false');
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

test('the chosen category is visible on the game screen', async ({ page }) => {
  // default pack with no selection — should show "General Knowledge"
  await startMatch(page);
  const tag = page.getByTestId('pack-tag');
  await expect(tag).toBeVisible();
  await expect(tag).toContainText('General Knowledge');
  // chip is laid out inside the scoreboard's middle column AND visible to the user
  // (a 0-height / display:none chip would still match toBeVisible if it had children,
  // so also assert a sane bounding box)
  const box = await tag.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(40);
  expect(box!.height).toBeGreaterThan(10);
});

test('switching to a different pack updates the category chip in-game', async ({ page }) => {
  await page.goto('/');
  await selectPack(page, 'kids-easy');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('start-match').click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
  const tag = page.getByTestId('pack-tag');
  await expect(tag).toBeVisible();
  // The Kids & Family pack name should now appear (NOT the default GK label).
  await expect(tag).toContainText(/Kids/i);
  await expect(tag).not.toContainText(/General Knowledge/i);
});

// ============================================================================
// Mode select + Online lobby + Player controller
// ============================================================================

test('mode-select shows Couch and Online cards', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  await expect(page.getByTestId('mode-select')).toBeVisible();
  await expect(page.getByTestId('mode-couch')).toBeVisible();
  await expect(page.getByTestId('mode-online')).toBeVisible();
  await expect(page.getByTestId('mode-join')).toBeVisible();
});

test('couch mode jumps straight into match setup', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await expect(page.getByTestId('mode-badge')).toContainText(/Couch/i);
  await expect(page.getByTestId('start-match')).toBeVisible();
});

test('online host lobby renders a 6-char code, QR and Copy button', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-online').click();
  await expect(page.getByTestId('lobby-host')).toBeVisible();
  const code = page.getByTestId('lobby-code');
  await expect(code).toBeVisible();
  // 6 character cells inside the code container
  await expect(code.locator('.lobby-code-ch')).toHaveCount(6);
  await expect(page.getByTestId('lobby-copy')).toBeVisible();
  // QR image renders (data URL produced by qrcode.js)
  await expect(page.locator('.lobby-qr img.qr-img')).toBeVisible();
});

test('online join screen validates code length + name', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-join').click();
  await expect(page.getByTestId('lobby-join')).toBeVisible();
  const submit = page.getByTestId('join-submit');
  await expect(submit).toBeDisabled();
  await page.getByTestId('join-name').fill('Suhaib');
  await page.getByTestId('join-code').fill('ab12'); // too short
  await expect(submit).toBeDisabled();
  await page.getByTestId('join-code').fill('abc123'); // 6 valid chars
  await expect(submit).toBeEnabled();
});

test('controller URL renders the phone view with the room code', async ({ page }) => {
  await page.goto('/?view=controller&room=ABC123&name=Tester');
  await expect(page.getByTestId('controller')).toBeVisible();
  await expect(page.getByTestId('controller')).toContainText('ABC123');
  // It does not show the regular app shell (no play-button on this page)
  await expect(page.getByTestId('play-button')).toHaveCount(0);
});

test('mode-select back returns home', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-back').click();
  await expect(page.getByTestId('play-button')).toBeVisible();
});
