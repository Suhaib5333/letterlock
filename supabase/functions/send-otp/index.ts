// supabase/functions/send-otp/index.ts
//
// Public endpoint: POST /functions/v1/send-otp  (no JWT required)
// Body: { "email": "user@example.com" }
//
// What it does — pure Resend send, no Cloudflare in the path:
//   1. Calls supabase.auth.admin.generateLink() server-side (service-role
//      key, never leaves this function) to mint a magic-link + 6-digit OTP.
//   2. Sends a Letterlock-branded HTML email through Resend using the user's
//      RESEND_API_KEY secret.
//   3. The user types the 6-digit code back in the app; the standard public
//      supabase.auth.verifyOtp({ email, token, type: 'email' }) verifies it.
//
// Deploy:
//   supabase functions deploy send-otp --no-verify-jwt --project-ref lkudntyvngwwlzuciocd
//
// Secrets required (set via Management API in the GH Actions workflow):
//   RESEND_API_KEY             — the Resend API key
//   SUPABASE_SERVICE_ROLE_KEY  — the project service_role key
//   MAIL_FROM (optional)       — defaults to 'Letterlock <onboarding@resend.dev>'

/// <reference lib="deno.ns" />

interface SendOtpRequest {
  email?: string;
}

interface GenerateLinkResponse {
  properties?: {
    action_link: string;
    email_otp: string;
    hashed_token: string;
    redirect_to: string;
    verification_type: string;
  };
  action_link?: string;
  email_otp?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function emailHtml(otp: string, magicLink: string): string {
  const code = otp.replace(/(\d{3})(\d{3})/, '$1 $2');
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  const resendKey = Deno.env.get('RESEND_API_KEY') ?? Deno.env.get('RESEND_API');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // SUPABASE_URL is automatically injected into every Edge Function by the
  // runtime — see https://supabase.com/docs/guides/functions/secrets
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const mailFrom = Deno.env.get('MAIL_FROM') ?? 'Letterlock <onboarding@resend.dev>';

  if (!supabaseUrl || !serviceRole || !resendKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL (auto-injected — should never be missing)');
    if (!serviceRole) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!resendKey) missing.push('RESEND_API_KEY');
    return jsonResponse(
      { ok: false, error: 'Function misconfigured', missing },
      500,
    );
  }

  let body: SendOtpRequest;
  try {
    body = (await req.json()) as SendOtpRequest;
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON.' }, 400);
  }
  const email = (body.email ?? '').trim().toLowerCase();
  if (!isEmail(email)) {
    return jsonResponse({ ok: false, error: 'Enter a valid email.' }, 400);
  }

  const origin = req.headers.get('origin') ?? 'https://letterlock.raltech.dev';

  // 1. Mint magic link + OTP via Supabase Admin Auth API.
  const genLinkResp = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRole}`,
      apikey: serviceRole,
    },
    body: JSON.stringify({
      type: 'magiclink',
      email,
      options: { redirect_to: origin },
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
  const generated = (await genLinkResp.json()) as GenerateLinkResponse;
  const otp = generated.properties?.email_otp ?? generated.email_otp;
  const magicLink = generated.properties?.action_link ?? generated.action_link ?? origin;

  if (!otp) {
    console.error('[send-otp] no email_otp in generate_link response', generated);
    return jsonResponse(
      { ok: false, error: 'Supabase admin returned no OTP. Is service_role correct?' },
      502,
    );
  }

  // 2. Send via Resend.
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
});
