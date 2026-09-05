import { expect, test } from '@playwright/test';

// A failed Google sign-in ends with the API redirecting BACK to the SPA at
// /auth/callback?error=<code> (apps/api/src/auth/auth.service.ts googleCallback).
// This used to be swallowed: the page just "refreshed" and the user was still
// signed out with no explanation (the reported bug). We surface it in the auth
// dialog and scrub the URL so a manual refresh is clean.

test('a failed OAuth redirect surfaces the error instead of silently refreshing', async ({ page }) => {
  await page.goto('/auth/callback?error=google_failed');

  // The auth dialog auto-opens showing the failure, mentioning Google.
  const err = page.getByTestId('auth-error');
  await expect(err).toBeVisible({ timeout: 10_000 });
  await expect(err).toContainText(/Google sign-in failed/i);
  await expect(err).toContainText(/google_failed/);

  // The callback URL is scrubbed (back to the app root) so a refresh doesn't replay it.
  await expect.poll(() => new URL(page.url()).pathname).toBe('/');
  await expect.poll(() => new URL(page.url()).search).toBe('');
});

test('the callback restores the route the sign-in started from (QR controller path)', async ({ page }) => {
  // A phone that signed in from the QR-join screen must come BACK to the
  // controller, not the home page. The API echoes `returnTo`; the SPA restores it
  // before rendering. An invalid one-time code must not break that.
  await page.goto('/auth/callback?code=definitely-not-a-real-code-1234&returnTo=%2F%3Froom%3DABC123%26view%3Dcontroller');
  await expect(page.getByTestId('controller')).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => new URL(page.url()).search).toBe('?room=ABC123&view=controller');
});
