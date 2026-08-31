import { expect, test, type Page } from '@playwright/test';

// Regression guard for the swallowed "Choose a username" gate:
// a first-time sign-in (email OTP here; a Google redirect exercises the same
// session-arrives-then-profile-fetch path) must land on the username claim
// IMMEDIATELY — the modal used to close itself mid-profile-fetch and a
// once-per-session flag then blocked it from ever reopening.
//
// Supabase's network is mocked (deterministic, no real emails), but the whole
// UI flow is the real app: send code → verify → claim → signed in.

const USER_ID = '00000000-0000-4000-8000-00000000e2e0'.replace('e2e0', 'aaaa');
const EMAIL = 'gate-test@example.com';

const b64url = (o: object) =>
  Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// Unsigned-but-well-formed JWT — supabase-js only decodes it client-side.
const JWT = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({
  sub: USER_ID,
  email: EMAIL,
  role: 'authenticated',
  aud: 'authenticated',
  exp: 4102444800,
})}.e2e`;

const authUser = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: EMAIL,
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};

const session = {
  access_token: JWT,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'e2e-refresh',
  user: authUser,
};

/** Mock every Supabase endpoint the sign-in → claim flow touches. The `state`
 * object is shared across routes so an INSERT into profiles makes later GETs
 * return the row (exactly what refreshProfile relies on). */
async function mockSupabase(page: Page, state: { profile: Record<string, unknown> | null }) {
  await page.route('**/functions/v1/send-otp', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
  );
  await page.route('**/auth/v1/verify', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) }),
  );
  await page.route('**/auth/v1/token**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) }),
  );
  await page.route('**/auth/v1/user**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(authUser) }),
  );
  await page.route('**/auth/v1/logout**', (r) => r.fulfill({ status: 204, body: '' }));
  await page.route('**/rest/v1/**', (r) => {
    const url = r.request().url();
    const method = r.request().method();
    const json = (status: number, body: unknown) =>
      r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/rpc/username_available')) return json(200, true);
    if (url.includes('/rest/v1/profiles')) {
      if (method === 'POST') {
        const sent = r.request().postDataJSON() as { username?: string };
        state.profile = {
          id: USER_ID,
          username: sent?.username ?? 'e2e_player',
          xp: 0,
          level: 1,
          prestige: 0,
          role: 'player',
          banned_at: null,
          username_changed_at: null,
          created_at: '2026-01-01T00:00:00Z',
        };
        return json(201, [state.profile]);
      }
      // maybeSingle() sends Accept: application/vnd.pgrst.object — a bare
      // object (or 406-with-null) is expected; an array also parses fine.
      return json(200, state.profile ? [state.profile] : []);
    }
    if (method === 'GET' || method === 'HEAD') return json(200, []);
    return json(204, null);
  });
}

test('first email-OTP sign-in lands on "Choose a username" immediately', async ({ page }) => {
  const state = { profile: null as Record<string, unknown> | null };
  await mockSupabase(page, state);
  await page.goto('/');

  await page.getByTestId('open-auth').click();
  await expect(page.getByTestId('auth-modal')).toBeVisible();
  await page.getByTestId('signin-email-input').fill(EMAIL);
  await page.getByTestId('signin-email').click();

  await page.getByTestId('signin-otp-input').fill('123456');
  await page.getByTestId('signin-otp-verify').click();

  // THE regression: the modal must stay open and show the username claim —
  // it used to close silently here and never come back.
  await expect(page.getByTestId('username-input')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('auth-modal')).toBeVisible();

  // Claim goes through and the (auto-opened) gate closes itself.
  await page.getByTestId('username-input').fill('gate_test_player');
  await expect(page.getByTestId('username-status')).toHaveAttribute('data-status', 'ok');
  await page.getByTestId('username-claim').click();
  await expect(page.getByTestId('auth-modal')).toHaveCount(0, { timeout: 10_000 });
});

test('page load with a session but no profile auto-opens the username claim (Google-redirect path)', async ({ page }) => {
  const state = { profile: null as Record<string, unknown> | null };
  await mockSupabase(page, state);

  // Seed the persisted session BEFORE the app boots — exactly the state a
  // Google OAuth redirect (or any reload mid-claim) lands in.
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [
      // supabase-js v2 default storage key: sb-<project-ref>-auth-token
      'sb-lkudntyvngwwlzuciocd-auth-token',
      JSON.stringify(session),
    ] as const,
  );
  await page.goto('/');

  // No clicks: the app itself must force the claim open.
  await expect(page.getByTestId('auth-modal')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('username-input')).toBeVisible();
});
