import { expect, test } from '@playwright/test';

// LAUNCH_PLAN Phases 4/5/8 on the WEB build: with VITE_ADSENSE_CLIENT unset (today,
// web ads come last per D12) no ad script may load, Settings must not show the
// native-only Remove Ads / Restore / Privacy options rows, boot must be clean,
// and the rewarded "extra skip" button must be absent (no ad system on web).

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('letterlock.unlockall', '1'));
});

test('web build loads no ad script and boots with zero console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  const adRequests: string[] = [];
  page.on('request', (r) => {
    if (/googlesyndication|doubleclick|adsbygoogle|googleads|admob/i.test(r.url())) adRequests.push(r.url());
  });

  await page.goto('/');
  await expect(page.getByTestId('open-categories')).toBeVisible();
  await page.waitForTimeout(500);

  expect(adRequests).toEqual([]);
  expect(await page.locator('script[src*="adsbygoogle"], script[data-ad-client]').count()).toBe(0);
  expect(await page.evaluate(() => typeof (window as unknown as { adBreak?: unknown }).adBreak)).toBe('undefined');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ad-banner-h').trim())).toBe('');
  expect(errors).toEqual([]);
});

test('Settings has no Remove Ads, Restore Purchases or Privacy options rows on the web', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-settings').click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('set-monetization')).toHaveCount(0);
  await expect(dialog.getByTestId('remove-ads')).toHaveCount(0);
  await expect(dialog.getByTestId('restore-purchases')).toHaveCount(0);
  await expect(dialog.getByTestId('privacy-options')).toHaveCount(0);
  await expect(dialog).not.toContainText('Remove Ads');
  await expect(dialog).not.toContainText('Privacy options');
});

test('extra-skip (rewarded ad) button never renders on the web, even with skips used up', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('play-button').click();
  await page.getByTestId('mode-couch').click();
  await page.getByTestId('mode-single').click();
  await page.getByTestId('start-match').click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
  await page.locator('.ll-hex.claimable').first().click();
  await expect(page.getByTestId('question-card')).toBeVisible();
  await expect(page.getByTestId('extra-skip')).toHaveCount(0);
  // Spend the one text-question skip: the button must still not appear.
  await page.getByTestId('skip-question').click();
  await expect(page.getByTestId('skip-question')).toBeDisabled();
  await expect(page.getByTestId('extra-skip')).toHaveCount(0);
});
