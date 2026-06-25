import { expect, test } from '@playwright/test';

// The phone-as-controller QR-join flow for SIGNED-OUT players:
//  - a clear warning that guests forfeit XP / leaderboard progress,
//  - a Sign-in button that opens the full auth flow,
//  - a guest fallback (type a name and join anyway),
//  - and a way back to the home screen at every step.
//
// Landing here with NO `name` param mimics scanning the host's QR code.
const JOIN_URL = '/?view=controller&room=ABC123';

test('QR join (signed-out) warns about losing XP and offers sign-in', async ({ page }) => {
  await page.goto(JOIN_URL);

  await expect(page.getByTestId('controller')).toBeVisible();
  await expect(page.getByTestId('controller-join')).toBeVisible();

  // The XP nudge is front-and-centre and actually mentions XP.
  const notice = page.getByTestId('controller-xp-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(/XP/);

  // The sign-in button opens the FULL auth dialog (Google + email-OTP).
  await page.getByTestId('controller-signin').click();
  await expect(page.getByTestId('auth-modal')).toBeVisible();
  await expect(page.getByTestId('signin-google')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('signin-email-input')).toBeVisible();
});

test('sign-in dialog can be dismissed and the guest can still join', async ({ page }) => {
  await page.goto(JOIN_URL);
  await page.getByTestId('controller-signin').click();
  await expect(page.getByTestId('auth-modal')).toBeVisible();

  // "Skip — play locally" closes the dialog and returns to the join screen.
  await page.getByTestId('auth-cancel').click();
  await expect(page.getByTestId('auth-modal')).toHaveCount(0);
  await expect(page.getByTestId('controller-join')).toBeVisible();

  // Guests can still join with a name (joining swaps in the in-room Leave button).
  await page.getByTestId('controller-join-name').fill('Guesto');
  await page.getByTestId('controller-join-submit').click();
  await expect(page.getByTestId('controller-leave')).toBeVisible({ timeout: 10_000 });
});

test('a player can return home BEFORE joining (Home button on the join screen)', async ({ page }) => {
  await page.goto(JOIN_URL);
  await expect(page.getByTestId('controller-join')).toBeVisible();
  await page.getByTestId('controller-go-home').click();
  // Lands on the full app home — the controller route is gone.
  await expect(page.getByTestId('play-button')).toBeVisible();
  await expect(page.getByTestId('controller')).toHaveCount(0);
});

test('a player can leave mid-session and get back home (Leave → confirm)', async ({ page }) => {
  await page.goto(JOIN_URL);
  await page.getByTestId('controller-join-name').fill('Guesto');
  await page.getByTestId('controller-join-submit').click();

  await page.getByTestId('controller-leave').click();
  await expect(page.getByTestId('controller-leave-confirm')).toBeVisible();
  await page.getByTestId('controller-leave-confirm-yes').click();
  await expect(page.getByTestId('play-button')).toBeVisible();
});
