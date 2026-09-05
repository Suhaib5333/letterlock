import { Harness } from './harness';

describe('health + auth', () => {
  const h = new Harness();
  beforeAll(() => h.start());
  afterAll(() => h.stop());

  it('GET /healthz reports db:true', async () => {
    const res = await h.http().get('/healthz').expect(200);
    expect(res.body).toEqual({ ok: true, db: true });
  });

  it('errors are RFC 7807 problem+json', async () => {
    const res = await h.http().get('/me').expect(401);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body).toMatchObject({ type: 'about:blank', title: 'Unauthorized', status: 401, code: 'unauthenticated', instance: '/me' });
  });

  it('OTP request + verify issues tokens and profile null', async () => {
    const email = 'otp1@example.com';
    await h.http().post('/auth/otp/request').send({ email }).expect(200);
    const code = h.mail.lastDevCode(email)!;
    expect(code).toMatch(/^\d{6}$/);
    // wrong code first: counts an attempt but does not burn the code
    await h.http().post('/auth/otp/verify').send({ email, code: code === '000000' ? '000001' : '000000' }).expect(401);
    const res = await h.http().post('/auth/otp/verify').send({ email, code }).expect(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user.email).toBe(email);
    expect(res.body.profile).toBeNull();
    // a code is single use
    await h.http().post('/auth/otp/verify').send({ email, code }).expect(401);
    // /auth/me works with the access token
    const me = await h.http().get('/auth/me').set(h.auth(res.body)).expect(200);
    expect(me.body.user.id).toBe(res.body.user.id);
    expect(me.body.profile).toBeNull();
  });

  it('OTP resend lock (60 s) and per-email window (3 / 5 min)', async () => {
    const email = 'otp2@example.com';
    await h.http().post('/auth/otp/request').send({ email }).expect(200);
    const second = await h.http().post('/auth/otp/request').send({ email }).expect(429);
    expect(second.body.code).toBe('otp_resend_lock');
    // age the rows past the resend lock but keep them inside the 5-minute window
    await h.prisma.otpCode.updateMany({ where: { email }, data: { createdAt: new Date(Date.now() - 90_000) } });
    await h.http().post('/auth/otp/request').send({ email }).expect(200);
    await h.prisma.otpCode.updateMany({ where: { email }, data: { createdAt: new Date(Date.now() - 90_000) } });
    await h.http().post('/auth/otp/request').send({ email }).expect(200);
    await h.prisma.otpCode.updateMany({ where: { email }, data: { createdAt: new Date(Date.now() - 90_000) } });
    const fourth = await h.http().post('/auth/otp/request').send({ email }).expect(429);
    expect(fourth.body.code).toBe('otp_rate_limited');
    expect(fourth.body.retryAfter).toBeGreaterThan(0);
  });

  it('OTP locks after 5 wrong attempts', async () => {
    const email = 'otp3@example.com';
    await h.http().post('/auth/otp/request').send({ email }).expect(200);
    const code = h.mail.lastDevCode(email)!;
    const wrong = code === '111111' ? '222222' : '111111';
    for (let i = 0; i < 5; i++) await h.http().post('/auth/otp/verify').send({ email, code: wrong }).expect(401);
    const res = await h.http().post('/auth/otp/verify').send({ email, code }).expect(401);
    expect(res.body.code).toBe('otp_attempts');
  });

  it('refresh rotates, replay of the old token is rejected, logout revokes', async () => {
    const s = await h.signIn('refresh@example.com');
    const r1 = await h.http().post('/auth/refresh').send({ refreshToken: s.refreshToken }).expect(200);
    expect(r1.body.refreshToken).not.toBe(s.refreshToken);
    expect(r1.body.accessToken).toBeTruthy();
    // replay the consumed token
    const replay = await h.http().post('/auth/refresh').send({ refreshToken: s.refreshToken }).expect(401);
    expect(replay.body.code).toBe('refresh_invalid');
    // the new one still works, then logout kills it
    const r2 = await h.http().post('/auth/refresh').send({ refreshToken: r1.body.refreshToken }).expect(200);
    await h.http().post('/auth/logout').send({ refreshToken: r2.body.refreshToken }).expect(200);
    await h.http().post('/auth/refresh').send({ refreshToken: r2.body.refreshToken }).expect(401);
    // expired tokens are refused too
    await h.prisma.refreshToken.updateMany({ where: { userId: s.userId }, data: { expiresAt: new Date(Date.now() - 1000) } });
  });

  it('guest token is issued and refused on account endpoints', async () => {
    const g = await h.http().post('/auth/guest').send({ name: 'Phone 1' }).expect(200);
    expect(g.body.guestToken).toBeTruthy();
    expect(g.body.guestId).toBeTruthy();
    const res = await h.http().get('/me').set({ Authorization: `Bearer ${g.body.guestToken}` }).expect(403);
    expect(res.body.code).toBe('guest_forbidden');
  });

  it('google / apple are reported unconfigured when env is missing', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.APPLE_CLIENT_ID;
    await h.http().get('/auth/google').expect(400);
    await h.http().post('/auth/apple').send({ identityToken: 'x'.repeat(40) }).expect(400);
    await h.http().post('/auth/exchange').send({ code: 'definitely-not-a-real-code-1234' }).expect(401);
  });

  it('DELETE /auth/me cascades every owned row', async () => {
    const a = await h.player('del-a@example.com', 'del_a');
    const b = await h.player('del-b@example.com', 'del_b');
    await h.http().post('/leaderboard').set(h.auth(a)).send({ packId: 'p1', score: 2, moves: 10, durationMs: 1000 }).expect(201);
    await h.http().put('/saves').set(h.auth(a)).send({ state: { opts: { packId: 'p1' }, series: {}, log: [] } }).expect(200);
    await h.http().put('/progress/p1').set(h.auth(a)).send({ served: ['q1'] }).expect(200);
    await h.http().post('/packs/custom').set(h.auth(a)).send({ name: 'Mine', body: { letters: {} } }).expect(201);
    await h.http().put('/rooms/ABC234/members').set(h.auth(a)).send({ team: 'A' }).expect(200);
    await h.http().post('/friends/request').set(h.auth(a)).send({ target: b.userId }).expect(200);

    await h.http().delete('/auth/me').set(h.auth(a)).expect(200);

    expect(await h.prisma.user.findUnique({ where: { id: a.userId } })).toBeNull();
    expect(await h.prisma.profile.count({ where: { id: a.userId } })).toBe(0);
    expect(await h.prisma.leaderboardRow.count({ where: { userId: a.userId } })).toBe(0);
    expect(await h.prisma.savedGame.count({ where: { userId: a.userId } })).toBe(0);
    expect(await h.prisma.questionProgress.count({ where: { userId: a.userId } })).toBe(0);
    expect(await h.prisma.customPack.count({ where: { ownerId: a.userId } })).toBe(0);
    expect(await h.prisma.roomMember.count({ where: { userId: a.userId } })).toBe(0);
    expect(await h.prisma.friendship.count({ where: { OR: [{ userLow: a.userId }, { userHigh: a.userId }] } })).toBe(0);
    expect(await h.prisma.refreshToken.count({ where: { userId: a.userId } })).toBe(0);
    // the token is now dead
    const res = await h.http().get('/auth/me').set(h.auth(a)).expect(401);
    expect(res.body.code).toBe('user_gone');
    // b is untouched and sees no pending request
    const friends = await h.http().get('/friends').set(h.auth(b)).expect(200);
    expect(friends.body).toEqual([]);
  });
});
