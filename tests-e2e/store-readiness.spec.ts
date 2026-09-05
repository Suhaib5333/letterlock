import { expect, test, type Page } from '@playwright/test';

// Store-readiness items from LAUNCH_PLAN Phase 1 / 6b: legal pages, /join/CODE,
// offline handling, remote app-config (maintenance, version gate, store funnel),
// and the D10 / D11 content captions.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('letterlock.unlockall', '1'));
});

/** Serve a fake `/api/app-config` and load Home through the local-only `__apiurl` seam. */
async function withAppConfig(page: Page, config: Record<string, unknown>) {
  await page.route('**/api/app-config', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(config) }),
  );
  await page.goto('/?__apiurl=/api');
}

test('privacy and terms pages are real static documents', async ({ page }) => {
  await page.goto('/privacy.html');
  await expect(page.locator('h1')).toHaveText('Privacy Policy');
  await expect(page.locator('main')).toContainText('legal@raltech.dev');
  await expect(page.locator('main')).toContainText('AdMob');
  await expect(page.locator('main')).toContainText('RevenueCat');
  await expect(page.locator('main')).toContainText('13');
  await expect(page.locator('main')).toContainText('never sell');

  await page.goto('/terms.html');
  await expect(page.locator('h1')).toHaveText('Terms of Service');
  await expect(page.locator('main')).toContainText('Kingdom of Bahrain');
  await expect(page.locator('main')).toContainText('48 hours');
  await expect(page.locator('main')).toContainText('trademarks');

  await page.goto('/account/delete/');
  await expect(page.locator('h1')).toContainText('Delete your Letterlock account');
  await expect(page.locator('a[href^="mailto:legal@raltech.dev"]').first()).toBeVisible();
});

test('legal links are on Home and in Settings and open a new tab', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-settings').click();
  const link = page.locator('.set-legal a', { hasText: 'Privacy' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('href', /\/privacy\.html$/);
  await expect(page.locator('.set-legal a', { hasText: 'Terms' })).toHaveAttribute('href', /\/terms\.html$/);
});

test('/join/CODE opens the phone controller with the code prefilled', async ({ page }) => {
  await page.goto('/join/abc123');
  await expect(page.getByTestId('controller')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.controller-room')).toContainText('ABC123');
  // The path is rewritten to the canonical query form so every reader of ?room= works.
  await expect(page).toHaveURL(/[?&]room=ABC123/);
  await expect(page).toHaveURL(/[?&]view=controller/);
  // Old query links keep working too.
  await page.goto('/?room=ZZZ999&view=controller');
  await expect(page.locator('.controller-room')).toContainText('ZZZ999');
});

test('offline: banner appears and online rooms are disabled, then recover', async ({ page, context }) => {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  await expect(page.getByTestId('mode-online')).toBeEnabled();
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByTestId('offline-banner')).toBeVisible();
  await expect(page.getByTestId('offline-banner')).toContainText('You are offline');
  await expect(page.getByTestId('mode-online')).toBeDisabled();
  await expect(page.getByTestId('mode-join')).toBeDisabled();
  // Local play is untouched.
  await expect(page.getByTestId('mode-couch')).toBeEnabled();
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByTestId('offline-banner')).toHaveCount(0);
  await expect(page.getByTestId('mode-online')).toBeEnabled();
});

test('offline: Create room is disabled in the party setup', async ({ page, context }) => {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-online').click();
  await expect(page.getByTestId('start-match')).toHaveText(/Create room/);
  await expect(page.getByTestId('start-match')).toBeEnabled();
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByTestId('start-match')).toBeDisabled();
});

test('offline: packs that need remote media disappear from the category menu', async ({ page, context }) => {
  await page.goto('/');
  await page.getByTestId('open-categories').click();
  await expect(page.getByTestId('pack-songs')).toBeVisible();
  await page.getByTestId('category-close').click();
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.getByTestId('open-categories').click();
  await expect(page.getByTestId('pack-songs')).toHaveCount(0);
  // Bundled content stays.
  await expect(page.getByTestId('pack-default-gk-medium')).toBeVisible();
});

test('maintenance flag shows a banner and pauses online rooms', async ({ page }) => {
  await withAppConfig(page, { maintenance: true, message: 'Down for maintenance until 18:00.' });
  await expect(page.getByTestId('maintenance-banner')).toBeVisible();
  await expect(page.getByTestId('maintenance-banner')).toContainText('Down for maintenance');
  await page.getByTestId('play-button').click();
  await expect(page.getByTestId('mode-online')).toBeDisabled();
  await expect(page.getByTestId('mode-couch')).toBeEnabled();
});

test('minBundle above the build shows the Update required screen', async ({ page }) => {
  await withAppConfig(page, { minBundle: '999.0.0' });
  await expect(page.getByTestId('update-required')).toBeVisible();
  await expect(page.getByTestId('update-reload')).toBeVisible();
  await expect(page.getByTestId('play-button')).toHaveCount(0);
});

test('minBundle at or below the build does not gate', async ({ page }) => {
  await withAppConfig(page, { minBundle: '0.0.1' });
  await expect(page.getByTestId('play-button')).toBeVisible();
  await expect(page.getByTestId('update-required')).toHaveCount(0);
});

test('store sheet: mobile browsers only, dismiss remembered', async ({ page }) => {
  const isMobile = test.info().project.name === 'mobile';
  await withAppConfig(page, {
    storeLinks: {
      ios: 'https://apps.apple.com/app/id0000000000',
      android: 'https://play.google.com/store/apps/details?id=dev.raltech.letterlock',
    },
  });
  await expect(page.getByTestId('play-button')).toBeVisible();
  if (!isMobile) {
    await expect(page.getByTestId('store-sheet')).toHaveCount(0);
    return;
  }
  const sheet = page.getByTestId('store-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Play Letterlock in the app');
  await expect(page.getByTestId('store-badge-android')).toHaveAttribute('href', /utm_source=web/);
  await expect(page.getByTestId('store-badge-ios')).toHaveAttribute('href', /utm_source=web/);
  // Never blocks: Play is still clickable with the sheet up.
  await expect(page.getByTestId('play-button')).toBeEnabled();
  await page.getByTestId('store-sheet-close').click();
  await expect(sheet).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('play-button')).toBeVisible();
  await expect(page.getByTestId('store-sheet')).toHaveCount(0);
});

test('store sheet stays hidden when app-config has no store links', async ({ page }) => {
  await withAppConfig(page, {});
  await expect(page.getByTestId('play-button')).toBeVisible();
  await expect(page.getByTestId('store-sheet')).toHaveCount(0);
});

test('Fandoms cards carry the unofficial caption and the D11 renames', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-categories').click();
  await page.getByTestId('cat-chip-fandoms').click();
  const notes = page.getByTestId('cat-card-note');
  await expect(notes.first()).toHaveText('Unofficial fan trivia, not affiliated');
  await expect(page.getByTestId('pack-fandom-harry-potter')).toContainText('Wizarding School Trivia');
  await expect(page.getByTestId('pack-fandom-pokemon')).toContainText('Pocket Monsters Trivia');
  await expect(page.getByTestId('category-body')).not.toContainText('Harry Potter');
});

test('Logos cards carry the trademark caption', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-categories').click();
  await page.getByTestId('cat-chip-logos-&-brands').click();
  await expect(page.getByTestId('cat-card-note').first()).toHaveText('All logos are trademarks of their owners');
});

test('static ads.txt / app-ads.txt placeholders are served', async ({ request }) => {
  for (const path of ['/app-ads.txt', '/ads.txt']) {
    const res = await request.get(path);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('google.com, pub-');
  }
});
