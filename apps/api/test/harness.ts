import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { MailService } from '../src/mail/mail.service';

export interface Session {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

export class Harness {
  app!: INestApplication;
  prisma!: PrismaService;
  mail!: MailService;
  baseUrl = '';

  async start(listen = false): Promise<this> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    this.app = moduleRef.createNestApplication();
    configureApp(this.app);
    await this.app.init();
    if (listen) {
      await this.app.listen(0);
      const addr = this.app.getHttpServer().address() as { port: number };
      this.baseUrl = `http://127.0.0.1:${addr.port}`;
    }
    this.prisma = this.app.get(PrismaService);
    this.mail = this.app.get(MailService);
    await this.resetDb();
    return this;
  }

  async stop(): Promise<void> {
    await this.app?.close();
  }

  /** Wipe every table (FKs cascade from users) and restore the singleton config row. */
  async resetDb(): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      'truncate table users, otp_codes, guest_tokens, room_awards, app_config restart identity cascade',
    );
    await this.prisma.$executeRawUnsafe('insert into app_config (id) values (1)');
  }

  http() {
    return request(this.app.getHttpServer());
  }

  /** Full email-OTP sign-in through the real endpoints (code read from the dev hook). */
  async signIn(email: string): Promise<Session> {
    await this.http().post('/auth/otp/request').send({ email }).expect(200);
    const code = this.mail.lastDevCode(email);
    if (!code) throw new Error('no dev OTP captured');
    const res = await this.http().post('/auth/otp/verify').send({ email, code }).expect(200);
    return { accessToken: res.body.accessToken, refreshToken: res.body.refreshToken, userId: res.body.user.id, email };
  }

  async claim(s: Session, username: string): Promise<void> {
    await this.http().post('/me/username').set(this.auth(s)).send({ username }).expect(201);
  }

  /** Sign in + claim in one go. */
  async player(email: string, username: string): Promise<Session> {
    const s = await this.signIn(email);
    await this.claim(s, username);
    return s;
  }

  async makeAdmin(s: Session): Promise<void> {
    await this.prisma.profile.update({ where: { id: s.userId }, data: { role: 'admin' } });
  }

  auth(s: Session | { accessToken: string }): { Authorization: string } {
    return { Authorization: `Bearer ${s.accessToken}` };
  }
}
