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

// Email design notes — every choice here is for deliverability + UX:
//   • Light-themed HTML (not dark) — dark emails score worse on most spam
//     filters and look wrong in users' default light-mode clients.
//   • Single semantic <table> layout, no images, no remote assets — every
//     external fetch costs spam-score points.
//   • NO clickable magic link (per user request — code only). Fewer links
//     also means a much better spam score.
//   • Plain-text version mirrors the HTML 1:1 so spam filters don't flag
//     the text/HTML mismatch (a classic spam signal).
//   • Code presented in a way mail.app/Gmail iOS recognise as a one-time
//     code (the digits sit clearly in a code block, the subject contains
//     "code", and the iOS quick-fill heuristic picks them up).
function emailHtml(otp: string): string {
  const code = otp.replace(/(\d{3})(\d{3})/, '$1 $2');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your Letterlock verification code is ${otp}</title>
</head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a2240;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f6fa;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border:1px solid #e3e6f0;border-radius:12px;">
        <tr><td style="padding:32px 32px 8px 32px;">
          <div style="font-size:22px;font-weight:700;color:#1a2240;">Letterlock</div>
        </td></tr>
        <tr><td style="padding:8px 32px 28px 32px;">
          <p style="font-size:15px;line-height:1.55;color:#1a2240;margin:0 0 12px 0;">
            Hi,
          </p>
          <p style="font-size:15px;line-height:1.55;color:#1a2240;margin:0 0 20px 0;">
            Use the verification code below to sign in to your Letterlock account.
            The code expires in 60 minutes and can only be used once.
          </p>
          <div style="font-size:13px;color:#5a6280;margin-bottom:6px;">Verification code:</div>
          <div style="font-size:34px;font-weight:700;letter-spacing:0.18em;color:#1a2240;font-variant-numeric:tabular-nums;margin:0 0 20px 0;">${code}</div>
          <p style="font-size:13px;line-height:1.5;color:#5a6280;margin:0;">
            If you didn’t try to sign in, you can safely ignore this email — nothing happens without the code.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 24px 32px;border-top:1px solid #e3e6f0;padding-top:16px;">
          <p style="font-size:12px;color:#7a83a3;margin:0;">
            Letterlock — letterlock.raltech.dev
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function emailText(otp: string): string {
  return `Letterlock

Hi,

Use the verification code below to sign in to your Letterlock account.
The code expires in 60 minutes and can only be used once.

Verification code: ${otp}

If you didn't try to sign in, you can safely ignore this email — nothing
happens without the code.

— Letterlock
letterlock.raltech.dev`;
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
  // Default to the user's verified raltech.dev sender; falls back to Resend's
  // sandbox sender if the GH Variable is set to empty. If mail.raltech.dev
  // ever fails verification, set MAIL_FROM='Letterlock <onboarding@resend.dev>'
  // in GH Variables to switch back.
  const mailFrom =
    Deno.env.get('MAIL_FROM') || 'Letterlock <reminders@mail.raltech.dev>';

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
  // We mint the magic link too (Supabase always returns one) but no longer
  // include it in the email — user requested code-only emails for clarity
  // and better deliverability (every link costs spam score).
  if (!otp) {
    console.error('[send-otp] no email_otp in generate_link response', generated);
    return jsonResponse(
      { ok: false, error: 'Supabase admin returned no OTP. Is service_role correct?' },
      502,
    );
  }

  // 2. Send via Resend — with deliverability tuning (Context7-verified against
  // resend.com/docs/api-reference/emails/send-batch-emails):
  //   • subject contains the code → Gmail/iOS Mail auto-fill heuristic
  //     recognises it as a one-time code and offers it as suggested keyboard
  //     input on the OTP entry screen.
  //   • reply_to set to a real, monitored address (or a no-reply alias on
  //     the verified domain) so the message doesn't look "blackhole-sender".
  //   • tags so we can filter in the Resend dashboard.
  //   • headers.X-Entity-Ref-ID for Gmail's transactional-mail signal.
  const replyTo = Deno.env.get('MAIL_REPLY_TO') ?? 'support@mail.raltech.dev';
  const resendResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: mailFrom,
      to: [email],
      reply_to: replyTo,
      subject: `Your Letterlock verification code is ${otp}`,
      html: emailHtml(otp),
      text: emailText(otp),
      headers: {
        // Helps Gmail classify this as transactional rather than bulk/marketing.
        'X-Entity-Ref-ID': `letterlock-otp-${crypto.randomUUID()}`,
      },
      tags: [
        { name: 'category', value: 'auth' },
        { name: 'kind', value: 'otp' },
      ],
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
