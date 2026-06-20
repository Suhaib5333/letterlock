// supabase/functions/send-email/index.ts
//
// Supabase Auth "Send Email" hook → Resend bridge.
//
// Wire-up (once):
//   1.  npx supabase login        # uses SUPABASE_ACCESS_TOKEN from .env.local
//   2.  npx supabase link --project-ref lkudntyvngwwlzuciocd
//   3.  npx supabase functions deploy send-email --no-verify-jwt
//        (--no-verify-jwt is required because Supabase Auth calls this hook
//         from server→server without a user JWT; the standard-webhooks HMAC
//         signature on the SEND_EMAIL_HOOK_SECRET is what authenticates.)
//   4.  In dashboard → Project settings → Edge Functions → Secrets, set:
//          RESEND_API_KEY          = re_xxxxxxxxxxxxxxxxxxxxxxxxxxx
//          SEND_EMAIL_HOOK_SECRET  = v1,whsec_<base64>   (generated below)
//          MAIL_FROM               = "Letterlock <no-reply@letterlock.raltech.dev>"
//   5.  In dashboard → Auth → Hooks → Send email hook:
//          - Type: HTTPS
//          - URL:  https://lkudntyvngwwlzuciocd.functions.supabase.co/send-email
//          - Secret: same SEND_EMAIL_HOOK_SECRET (paste the v1,whsec_… string)
//          - Enabled: ON
//   6.  Save. Email magic links + OTP codes now flow through Resend.
//
// Generating the secret: `openssl rand -base64 32` then prefix with
//   `v1,whsec_` — that exact prefix is what Supabase docs use.
//
// Fail-open behavior: if the function 500s, Supabase falls back to its
// built-in mailer. So a deploy mistake degrades to "default emails still
// work" rather than "no emails go out".

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { Resend } from 'npm:resend@4.0.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RAW_HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '';
const HOOK_SECRET = RAW_HOOK_SECRET.replace(/^v1,whsec_/, '');
const MAIL_FROM = Deno.env.get('MAIL_FROM') ?? 'Letterlock <onboarding@resend.dev>';

if (!RESEND_API_KEY) console.warn('[send-email] RESEND_API_KEY not set');
if (!HOOK_SECRET) console.warn('[send-email] SEND_EMAIL_HOOK_SECRET not set');

const resend = new Resend(RESEND_API_KEY ?? '');

interface AuthEmailPayload {
  user: { email: string };
  email_data: {
    token: string; // 6-digit OTP code
    token_hash: string; // for the magic link URL
    redirect_to: string; // where to send the user after clicking
    email_action_type:
      | 'signup'
      | 'magiclink'
      | 'recovery'
      | 'invite'
      | 'email_change'
      | 'email_change_current'
      | 'email_change_new'
      | 'reauthentication';
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

const SUBJECTS: Record<AuthEmailPayload['email_data']['email_action_type'], string> = {
  signup: 'Confirm your Letterlock account',
  magiclink: 'Your Letterlock sign-in code',
  recovery: 'Reset your Letterlock password',
  invite: 'You’ve been invited to Letterlock',
  email_change: 'Confirm your new Letterlock email',
  email_change_current: 'Your Letterlock email is being changed',
  email_change_new: 'Confirm your new Letterlock email',
  reauthentication: 'Confirm it’s you',
};

function renderEmail(payload: AuthEmailPayload): { subject: string; html: string; text: string } {
  const { token, token_hash, redirect_to, email_action_type, site_url } = payload.email_data;
  const subject = SUBJECTS[email_action_type] ?? 'Your Letterlock sign-in code';
  const link = `${site_url}/auth/v1/verify?token=${encodeURIComponent(token_hash)}&type=${encodeURIComponent(
    email_action_type,
  )}&redirect_to=${encodeURIComponent(redirect_to || 'https://letterlock.raltech.dev')}`;

  const intro =
    email_action_type === 'recovery'
      ? 'Tap the button to reset your password, or enter this code in the app:'
      : 'Tap the button to sign in, or enter this code in the app:';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0b1020;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e6e8ef;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1020;padding:40px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#11172b;border:1px solid #1f2742;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 8px 32px;text-align:center;">
              <div style="font-size:30px;font-weight:800;letter-spacing:-0.01em;color:#e6e8ef;">
                Letterlock <span style="color:#7b8cff;">🔒</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <h1 style="font-size:20px;font-weight:700;margin:16px 0 8px 0;color:#e6e8ef;">${subject}</h1>
              <p style="font-size:15px;line-height:1.55;color:#aab0c4;margin:0 0 24px 0;">${intro}</p>
              <div style="background:#0b1020;border:1px solid #1f2742;border-radius:14px;padding:18px;text-align:center;margin:0 0 24px 0;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#7a83a3;margin-bottom:8px;">Verification code</div>
                <div style="font-size:38px;font-weight:800;letter-spacing:0.22em;color:#e6e8ef;font-variant-numeric:tabular-nums;">${token}</div>
                <div style="font-size:12px;color:#7a83a3;margin-top:8px;">Expires in 60 minutes · single-use</div>
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${link}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 28px;background:#7b8cff;color:#0b1020;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">Sign in to Letterlock</a>
                  </td>
                </tr>
              </table>
              <p style="font-size:12px;color:#6b738f;margin:24px 0 0 0;line-height:1.5;">
                Didn’t request this? Ignore the email — nothing happens without the code or link.
                Link not working? Copy it into your browser: <span style="color:#aab0c4;word-break:break-all;">${link}</span>
              </p>
            </td>
          </tr>
        </table>
        <p style="font-size:11px;color:#5a6280;margin:16px 0 0 0;text-align:center;">
          Letterlock · connect your edges ·
          <a href="https://letterlock.raltech.dev" style="color:#7b8cff;text-decoration:none;">letterlock.raltech.dev</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${subject}

${intro}

  Verification code: ${token}
  (Expires in 60 minutes — single use.)

Or open this link to sign in:
${link}

Didn’t request this? Ignore the email.

— Letterlock`;

  return { subject, html, text };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  const body = await req.text();
  const headers = Object.fromEntries(req.headers);

  let payload: AuthEmailPayload;
  try {
    const wh = new Webhook(HOOK_SECRET);
    payload = wh.verify(body, headers) as AuthEmailPayload;
  } catch (err) {
    console.error('[send-email] webhook verification failed', err);
    return new Response(
      JSON.stringify({ error: { http_code: 401, message: 'invalid signature' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { subject, html, text } = renderEmail(payload);

  const { error } = await resend.emails.send({
    from: MAIL_FROM,
    to: [payload.user.email],
    subject,
    html,
    text,
  });

  if (error) {
    console.error('[send-email] resend send failed', error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: typeof error === 'object' && error && 'message' in error ? (error as { message: string }).message : 'send failed',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
