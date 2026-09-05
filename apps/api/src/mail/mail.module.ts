import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';

// Resend over SMTP, the palmandplate way: host smtp.resend.com, user "resend",
// password = RESEND_API_KEY. An empty key means dev mode: codes are logged.
@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: { user: 'resend', pass: process.env.RESEND_API_KEY || 'dev' },
      },
      defaults: {
        from: process.env.MAIL_FROM || 'Letterlock <reminders@mail.raltech.dev>',
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
