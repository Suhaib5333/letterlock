import { expect, test } from '@playwright/test';

// A failed Google sign-in redirects BACK to the app with the failure in the URL
// hash (#error=...&error_description=...). supabase-js only consumes success
// tokens, so this used to be swallowed — the page just "refreshed" and the user
// was still signed out with no explanation (the reported bug). We now surface it
// in the auth dialog and scrub the hash so a manual refresh is clean.
const ERROR_HASH =
  '#error=server_error&error_code=unexpected_failure' +
  '&error_description=Unable+to+exchange+external+code';

test('a failed OAuth redirect surfaces the error instead of silently refreshing', async ({ page }) => {
  await page.goto(`/${ERROR_HASH}`);

  // The auth dialog auto-opens showing the failure, mentioning Google.
  const err = page.getByTestId('auth-error');
  await expect(err).toBeVisible({ timeout: 10_000 });
  await expect(err).toContainText(/Google sign-in failed/i);
  await expect(err).toContainText(/exchange external code/i);

  // The error hash is scrubbed so a manual refresh doesn't replay it.
  await expect.poll(() => new URL(page.url()).hash).toBe('');
});
