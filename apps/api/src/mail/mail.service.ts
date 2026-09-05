import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

// Light-themed, single-table, no images, no links: the design notes from the
// old send-otp edge function (deliverability + iOS/Gmail code auto-fill).
function otpHtml(code: string): string {
  const spaced = code.replace(/(\d{3})(\d{3})/, '$1 $2');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Your Letterlock verification code is ${code}</title></head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a2240;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f6fa;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border:1px solid #e3e6f0;border-radius:12px;">
<tr><td style="padding:32px 32px 8px 32px;"><div style="font-size:22px;font-weight:700;color:#1a2240;">Letterlock</div></td></tr>
<tr><td style="padding:8px 32px 28px 32px;">
<p style="font-size:15px;line-height:1.55;margin:0 0 12px 0;">Hi,</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 20px 0;">Use the verification code below to sign in to your Letterlock account. The code expires in 10 minutes and can only be used once.</p>
<div style="font-size:13px;color:#5a6280;margin-bottom:6px;">Verification code:</div>
<div style="font-size:34px;font-weight:700;letter-spacing:0.18em;color:#1a2240;font-variant-numeric:tabular-nums;margin:0 0 20px 0;">${spaced}</div>
<p style="font-size:13px;line-height:1.5;color:#5a6280;margin:0;">If you did not try to sign in, you can safely ignore this email. Nothing happens without the code.</p>
</td></tr>
<tr><td style="padding:16px 32px 24px 32px;border-top:1px solid #e3e6f0;"><p style="font-size:12px;color:#7a83a3;margin:0;">Letterlock, letterlock.raltech.dev</p></td></tr>
</table></td></tr></table></body></html>`;
}

function otpText(code: string): string {
  return `Letterlock\n\nHi,\n\nUse the verification code below to sign in to your Letterlock account.\nThe code expires in 10 minutes and can only be used once.\n\nVerification code: ${code}\n\nIf you did not try to sign in, you can safely ignore this email. Nothing happens without the code.\n\nLetterlock\nletterlock.raltech.dev`;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  /** Dev mode (no RESEND_API_KEY): the last code per email, readable by tests. */
  private readonly devCodes = new Map<string, string>();

  constructor(private readonly mailer: MailerService) {}

  get devMode(): boolean {
    return !process.env.RESEND_API_KEY;
  }

  /** Test hook: only meaningful in dev mode. */
  lastDevCode(email: string): string | undefined {
    return this.devCodes.get(email.toLowerCase());
  }

  async sendOtp(email: string, code: string): Promise<void> {
    if (this.devMode) {
      this.devCodes.set(email.toLowerCase(), code);
      this.logger.warn(`[DEV] OTP for ${email}: ${code}`);
      return;
    }
    await this.mailer.sendMail({
      to: email,
      replyTo: process.env.MAIL_REPLY_TO || undefined,
      subject: `Your Letterlock verification code is ${code}`,
      text: otpText(code),
      html: otpHtml(code),
      headers: { 'X-Entity-Ref-ID': `letterlock-otp-${randomUUID()}` },
    });
    this.logger.log(`OTP email sent to ${email}`);
  }
}
