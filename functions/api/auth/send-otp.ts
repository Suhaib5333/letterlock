// Cloudflare Pages Function — POST /api/auth/send-otp
//
// Why this exists:
//   Supabase's default mailer is rate-limited to 2 emails/hour project-wide.
//   That's fine for development, totally unusable for prod. This function
//   bypasses Supabase's mailer entirely:
//
//     1. Calls supabase.auth.admin.generateLink (server-side, service-role)
//        to mint a magic link + 6-digit OTP code for the email.
//     2. Sends a branded Letterlock email via Resend with the OTP code.
//
//   The user still verifies the OTP through the standard public API:
//     supabase.auth.verifyOtp({ email, token: '123456', type: 'email' })
//   — which has its own rate limit (controlled via Management API) but is
//   not the same as the email-send rate limit.
//
// Required Cloudflare Pages env vars (Settings → Environment variables):
//   RESEND_API                  — Resend API key (user added this)
//      or RESEND_API_KEY        — fallback name, also accepted
//   SUPABASE_SERVICE_ROLE_KEY   — from Supabase → Settings → API → service_role
//   VITE_SUPABASE_URL           — already set, used to know which project
//
// Optional:
//   MAIL_FROM                   — defaults to 'Letterlock <onboarding@resend.dev>'
//                                 Set to 'Letterlock <no-reply@yourdomain>' once
//                                 a Resend sending domain is verified.

interface Env {
  RESEND_API?: string;
  RESEND_API_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  VITE_SUPABASE_URL?: string;
  MAIL_FROM?: string;
  // PUBLIC_SITE_URL is the canonical origin for redirect-back links in the
  // email body. Defaults to the request origin so dev/prod both work.
  PUBLIC_SITE_URL?: string;
}

interface SendOtpRequest {
  email?: string;
}

interface GenerateLinkResponse {
  // Supabase returns either { properties: {...}, user: {...} } or an error.
  properties?: {
    action_link: string;
    email_otp: string;
    hashed_token: string;
    redirect_to: string;
    verification_type: string;
  };
  msg?: string;
  error?: string;
  error_description?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function emailHtml(otp: string, magicLink: string): string {
  const code = otp.replace(/(\d{3})(\d{3})/, '$1 $2'); // visual: 123 456
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your Letterlock sign-in code</title>
</head>
<body style="margin:0;padding:0;background:#0b1020;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e6e8ef;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1020;padding:40px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#11172b;border:1px solid #1f2742;border-radius:18px;overflow:hidden;">
        <tr><td style="padding:32px 32px 8px 32px;text-align:center;">
          <div style="font-size:30px;font-weight:800;letter-spacing:-0.01em;color:#e6e8ef;">
            Letterlock <span style="color:#7b8cff;">🔒</span>
          </div>
        </td></tr>
        <tr><td style="padding:8px 32px 24px 32px;">
          <h1 style="font-size:20px;font-weight:700;margin:16px 0 8px 0;color:#e6e8ef;">Your sign-in code</h1>
          <p style="font-size:15px;line-height:1.55;color:#aab0c4;margin:0 0 24px 0;">Enter this code in the Letterlock app to sign in:</p>
          <div style="background:#0b1020;border:1px solid #1f2742;border-radius:14px;padding:22px;text-align:center;margin:0 0 24px 0;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#7a83a3;margin-bottom:10px;">Verification code</div>
            <div style="font-size:42px;font-weight:800;letter-spacing:0.22em;color:#e6e8ef;font-variant-numeric:tabular-nums;">${code}</div>
            <div style="font-size:12px;color:#7a83a3;margin-top:10px;">Expires in 60 minutes · single-use</div>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center">
              <a href="${magicLink}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 28px;background:#7b8cff;color:#0b1020;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">Or click here to sign in</a>
            </td></tr>
          </table>
          <p style="font-size:12px;color:#6b738f;margin:24px 0 0 0;line-height:1.5;">
            Didn’t request this? Ignore the email — nothing happens without the code.
          </p>
        </td></tr>
      </table>
      <p style="font-size:11px;color:#5a6280;margin:16px 0 0 0;text-align:center;">
        Letterlock · connect your edges ·
        <a href="https://letterlock.raltech.dev" style="color:#7b8cff;text-decoration:none;">letterlock.raltech.dev</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function emailText(otp: string, magicLink: string): string {
  return `Your Letterlock sign-in code

Enter this code in the app to sign in:

   ${otp}

(Expires in 60 minutes — single use.)

Or click this link instead: ${magicLink}

Didn’t request this? Ignore the email.

— Letterlock`;
}

// CF Pages Function signature — handles POST.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const resendKey = env.RESEND_API ?? env.RESEND_API_KEY;
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    return jsonResponse({ ok: false, error: 'Server misconfigured: VITE_SUPABASE_URL missing.' }, 500);
  }
  if (!resendKey) {
    return jsonResponse(
      {
        ok: false,
        error: 'Server misconfigured: set RESEND_API (or RESEND_API_KEY) in Cloudflare Pages env.',
      },
      500,
    );
  }
  if (!serviceRole) {
    return jsonResponse(
      {
        ok: false,
        error:
          'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY missing. Get it from Supabase → Settings → API → service_role.',
      },
      500,
    );
  }

  let body: SendOtpRequest;
  try {
    body = (await request.json()) as SendOtpRequest;
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON.' }, 400);
  }
  const email = (body.email ?? '').trim().toLowerCase();
  if (!isEmail(email)) {
    return jsonResponse({ ok: false, error: 'Enter a valid email.' }, 400);
  }

  // 1. Mint a magic link + 6-digit OTP via the Supabase Admin Auth API.
  //    `redirect_to` is what the magic-link URL will route to after a click.
  const origin =
    env.PUBLIC_SITE_URL || new URL(request.url).origin || 'https://letterlock.raltech.dev';
  const redirectTo = origin;

  const genLinkResp = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Admin endpoint expects both Authorization (Bearer service_role) AND apikey.
      Authorization: `Bearer ${serviceRole}`,
      apikey: serviceRole,
    },
    body: JSON.stringify({
      type: 'magiclink',
      email,
      options: { redirect_to: redirectTo },
    }),
  });

  if (!genLinkResp.ok) {
    const errText = await genLinkResp.text().catch(() => '');
    console.error('[send-otp] generate_link failed', genLinkResp.status, errText);
    return jsonResponse(
      {
        ok: false,
        error: `Supabase admin error (${genLinkResp.status}). ${errText.slice(0, 200)}`,
      },
      502,
    );
  }
  const generated = (await genLinkResp.json()) as GenerateLinkResponse & {
    // The admin endpoint returns properties at top level in newer versions,
    // and nested under `properties` in older versions — handle both.
    action_link?: string;
    email_otp?: string;
  };

  const otp = generated.properties?.email_otp ?? generated.email_otp;
  const magicLink = generated.properties?.action_link ?? generated.action_link ?? redirectTo;

  if (!otp) {
    console.error('[send-otp] no email_otp in generate_link response', generated);
    return jsonResponse(
      { ok: false, error: 'Supabase admin returned no OTP. Is service_role correct?' },
      502,
    );
  }

  // 2. Send the OTP via Resend.
  const mailFrom = env.MAIL_FROM ?? 'Letterlock <onboarding@resend.dev>';
  const resendResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: mailFrom,
      to: [email],
      subject: 'Your Letterlock sign-in code',
      html: emailHtml(otp, magicLink),
      text: emailText(otp, magicLink),
    }),
  });

  if (!resendResp.ok) {
    const errText = await resendResp.text().catch(() => '');
    console.error('[send-otp] resend send failed', resendResp.status, errText);
    return jsonResponse(
      {
        ok: false,
        error: `Email send failed (${resendResp.status}). ${errText.slice(0, 200)}`,
      },
      502,
    );
  }

  return jsonResponse({ ok: true });
};

// CORS preflight (Cloudflare Pages serves the function and the site from the
// same origin in production, but the local dev server hits this via fetch,
// so be explicit).
export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
