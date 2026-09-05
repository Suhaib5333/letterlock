import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// Regression guard for the swallowed "Choose a username" gate:
// a first-time sign-in (email OTP here; a Google redirect exercises the same
// session-arrives-then-profile-known path) must land on the username claim
// IMMEDIATELY. The modal used to close itself mid-profile-fetch and a
// once-per-session flag then blocked it from ever reopening.
//
// Runs against the REAL local API (playwright.config.ts starts apps/api in dev
// mode, where the emailed code is captured and readable via /auth/otp/dev-code).
// Every account created here is deleted at the end through the QA cleanup route.

const API = `http://localhost:${Number(process.env.E2E_API_PORT || Number(process.env.E2E_PORT || 4173) - 1000)}`;
const QA_TOKEN = 'qa-e2e-token';

const uniqueEmail = (tag: string) => `gate-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

async function devCode(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.get(`${API}/auth/otp/dev-code?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
  const { code } = (await res.json()) as { code: string | null };
  expect(code).toMatch(/^\d{6}$/);
  return code!;
}

async function deleteAccount(request: APIRequestContext, target: string) {
  await request.delete(`${API}/admin/users/${encodeURIComponent(target)}`, { headers: { 'x-qa-token': QA_TOKEN } });
}

async function expectSignedOut(page: Page) {
  await expect(page.getByTestId('open-auth')).toBeVisible();
}

test('first email-OTP sign-in lands on "Choose a username" immediately', async ({ page, request }) => {
  const email = uniqueEmail('otp');
  await page.goto('/');
  await expectSignedOut(page);

  await page.getByTestId('open-auth').click();
  await expect(page.getByTestId('auth-modal')).toBeVisible();
  await page.getByTestId('signin-email-input').fill(email);
  await page.getByTestId('signin-email').click();
  await expect(page.getByTestId('signin-otp-input')).toBeVisible();

  await page.getByTestId('signin-otp-input').fill(await devCode(request, email));
  await page.getByTestId('signin-otp-verify').click();

  // THE regression: the modal must stay open and show the username claim.
  await expect(page.getByTestId('username-input')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('auth-modal')).toBeVisible();

  // Claim goes through (real uniqueness check + POST /me/username) and the
  // auto-opened gate closes itself.
  const username = `gate_${Date.now().toString(36)}`.slice(0, 20);
  await page.getByTestId('username-input').fill(username);
  await expect(page.getByTestId('username-status')).toHaveAttribute('data-status', 'ok');
  await page.getByTestId('username-claim').click();
  await expect(page.getByTestId('auth-modal')).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByTestId('hero-signed')).toContainText(`@${username}`);

  // QA cleanup (CLAUDE.md testing mandate): the account must not outlive the test.
  await deleteAccount(request, email);
});

test('page load with a session but no profile auto-opens the username claim (Google-redirect path)', async ({ page, request }) => {
  // Mint a real session through the API (what /auth/exchange hands the SPA after
  // the Google round-trip) and seed its tokens BEFORE the app boots.
  const email = uniqueEmail('seed');
  expect((await request.post(`${API}/auth/otp/request`, { data: { email } })).ok()).toBeTruthy();
  const verify = await request.post(`${API}/auth/otp/verify`, { data: { email, code: await devCode(request, email) } });
  expect(verify.ok()).toBeTruthy();
  const tokens = (await verify.json()) as { accessToken: string; refreshToken: string; profile: null };
  expect(tokens.profile).toBeNull();

  await page.addInitScript(
    ([a, r]) => {
      localStorage.setItem('ll_access', a);
      localStorage.setItem('ll_refresh', r);
    },
    [tokens.accessToken, tokens.refreshToken] as const,
  );
  await page.goto('/');

  // No clicks: the app itself must force the claim open.
  await expect(page.getByTestId('auth-modal')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('username-input')).toBeVisible();

  await deleteAccount(request, email);
});

test('an expired access token is refreshed transparently and the account can delete itself in-app', async ({ page, request }) => {
  const email = uniqueEmail('refresh');
  await request.post(`${API}/auth/otp/request`, { data: { email } });
  const verify = await request.post(`${API}/auth/otp/verify`, { data: { email, code: await devCode(request, email) } });
  const tokens = (await verify.json()) as { accessToken: string; refreshToken: string };
  const username = `del_${Date.now().toString(36)}`.slice(0, 20);
  expect((await request.post(`${API}/me/username`, { data: { username }, headers: { Authorization: `Bearer ${tokens.accessToken}` } })).status()).toBe(201);

  // A garbage access token + a valid refresh token: the app must recover the
  // session through POST /auth/refresh (single-flight, retry once), not sign out.
  await page.addInitScript(
    ([r]) => {
      localStorage.setItem('ll_access', 'expired.access.token');
      localStorage.setItem('ll_refresh', r);
    },
    [tokens.refreshToken] as const,
  );
  await page.goto('/');
  await expect(page.getByTestId('hero-signed')).toContainText(`@${username}`, { timeout: 10_000 });

  // In-app account deletion (Apple 5.1.1(v) / Play policy): two-step confirm.
  await page.getByTestId('open-auth').click();
  await expect(page.getByTestId('auth-username')).toHaveText(`@${username}`);
  await page.getByTestId('account-delete').click();
  await expect(page.getByTestId('account-delete-confirm')).toBeVisible();
  await page.getByTestId('account-delete-confirm').click();
  await expect(page.getByTestId('auth-modal')).toHaveCount(0, { timeout: 10_000 });
  await expectSignedOut(page);
  // The account is really gone server-side (QA delete finds nothing).
  const gone = await request.delete(`${API}/admin/users/${encodeURIComponent(email)}`, { headers: { 'x-qa-token': QA_TOKEN } });
  expect(gone.status()).toBe(404);
});
