import { Harness } from './harness';

describe('admin, app-config, revenuecat webhook', () => {
  const h = new Harness();
  beforeAll(() => h.start());
  afterAll(() => h.stop());

  it('admin guard rejects non-admins and banned admins; admin actions work', async () => {
    const admin = await h.player('adm@example.com', 'the_admin');
    const user = await h.player('usr@example.com', 'plain_user');
    const noProfile = await h.signIn('nop@example.com');

    await h.http().get('/admin/users').set(h.auth(user)).expect(403);
    await h.http().get('/admin/users').set(h.auth(noProfile)).expect(403);
    await h.http().get('/admin/users').expect(401);
    await h.http().patch('/app-config').set(h.auth(user)).send({ maintenance: true }).expect(403);

    await h.makeAdmin(admin);
    const list = await h.http().get('/admin/users').set(h.auth(admin)).expect(200);
    expect(list.body).toHaveLength(2);
    expect(list.body.find((r: { id: string }) => r.id === user.userId)).toMatchObject({
      username: 'plain_user',
      email: 'usr@example.com',
      role: 'player',
      banned_at: null,
      level: 1,
      total_xp: 0,
      full_access: false,
    });

    await h.http().patch(`/admin/users/${admin.userId}/role`).set(h.auth(admin)).send({ role: 'player' }).expect(400); // self-demote
    await h.http().patch(`/admin/users/${admin.userId}/banned`).set(h.auth(admin)).send({ banned: true }).expect(400); // self-ban
    await h.http().patch(`/admin/users/${user.userId}/role`).set(h.auth(admin)).send({ role: 'moderator' }).expect(200);
    await h.http().post(`/admin/users/${user.userId}/grant-xp`).set(h.auth(admin)).send({ amount: 700 }).expect(200);
    await h.http().patch(`/admin/users/${user.userId}/full-access`).set(h.auth(admin)).send({ value: true }).expect(200);
    let p = await h.prisma.profile.findUniqueOrThrow({ where: { id: user.userId } });
    expect(p).toMatchObject({ role: 'moderator', xp: 700, level: 3, fullAccess: true });
    expect(Number(p.totalXp)).toBe(700);
    await h.http().post(`/admin/users/${user.userId}/reset-progression`).set(h.auth(admin)).expect(200);
    p = await h.prisma.profile.findUniqueOrThrow({ where: { id: user.userId } });
    expect(p).toMatchObject({ xp: 0, level: 1, prestige: 0 });
    // moderator can delete a leaderboard row, player cannot
    await h.http().post('/leaderboard').set(h.auth(user)).send({ packId: 'p', score: 1, moves: 1, durationMs: 1 }).expect(201);
    const row = await h.prisma.leaderboardRow.findFirstOrThrow();
    await h.http().delete(`/admin/leaderboard/${row.id}`).set(h.auth(user)).expect(200);
    await h.http().patch(`/admin/users/${user.userId}/role`).set(h.auth(admin)).send({ role: 'player' }).expect(200);
    await h.http().delete(`/admin/leaderboard/${row.id}`).set(h.auth(user)).expect(403);

    // banning the admin's target then the admin themself losing rights
    await h.http().patch(`/admin/users/${user.userId}/banned`).set(h.auth(admin)).send({ banned: true }).expect(200);
    await h.prisma.profile.update({ where: { id: admin.userId }, data: { bannedAt: new Date() } });
    await h.http().get('/admin/users').set(h.auth(admin)).expect(403);
  });

  it('QA cleanup: DELETE /admin/users/:target by username or email with the QA token', async () => {
    await h.resetDb(); // the count below assumes an empty users table
    const a = await h.player('qa-a@example.com', 'qa_user_a');
    const b = await h.player('qa-b@example.com', 'qa_user_b');
    const stranger = await h.player('qa-c@example.com', 'qa_user_c');
    await h.http().delete('/admin/users/qa_user_a').expect(403);
    await h.http().delete('/admin/users/qa_user_a').set('x-qa-token', 'wrong').expect(403);
    await h.http().delete('/admin/users/qa_user_a').set(h.auth(stranger)).expect(403);
    const r1 = await h.http().delete('/admin/users/qa_user_a').set('x-qa-token', 'qa-e2e-token').expect(200);
    expect(r1.body).toMatchObject({ ok: true, id: a.userId, email: 'qa-a@example.com', username: 'qa_user_a' });
    const r2 = await h.http().delete('/admin/users/QA-B@example.com').set('x-qa-token', 'qa-e2e-token').expect(200);
    expect(r2.body.id).toBe(b.userId);
    await h.http().delete('/admin/users/qa_user_a').set('x-qa-token', 'qa-e2e-token').expect(404);
    expect(await h.prisma.user.count()).toBe(1);
    // an admin token works too
    await h.makeAdmin(stranger);
    const d = await h.player('qa-d@example.com', 'qa_user_d');
    await h.http().delete('/admin/users/qa_user_d').set(h.auth(stranger)).expect(200);
    expect(await h.prisma.user.findUnique({ where: { id: d.userId } })).toBeNull();
  });

  it('app-config: public read, admin patch, cache invalidated', async () => {
    const admin = await h.player('cfg@example.com', 'cfg_admin');
    await h.makeAdmin(admin);
    const before = await h.http().get('/app-config').expect(200);
    expect(before.body).toMatchObject({ minNative: '0.0.0', maintenance: false, storeLinks: {}, latestBundle: null });
    expect(before.headers['cache-control']).toContain('max-age=60');
    await h.http().patch('/app-config').set(h.auth(admin)).send({ minNative: 'abc' }).expect(400);
    const patched = await h
      .http()
      .patch('/app-config')
      .set(h.auth(admin))
      .send({
        minNative: '1.2.0',
        maintenance: true,
        message: 'Back soon',
        storeLinks: { ios: 'https://apps.apple.com/x', android: 'https://play.google.com/x' },
        latestBundle: { version: '1.4.3', url: 'https://api.letterlock.raltech.dev/bundles/1.4.3.zip', sha256: 'abc', minNative: '1.2.0' },
      })
      .expect(200);
    expect(patched.body).toMatchObject({ minNative: '1.2.0', maintenance: true, message: 'Back soon' });
    expect(patched.body.latestBundle.version).toBe('1.4.3');
    const after = await h.http().get('/app-config').expect(200);
    expect(after.body.maintenance).toBe(true);
    const cleared = await h.http().patch('/app-config').set(h.auth(admin)).send({ latestBundle: null, maintenance: false }).expect(200);
    expect(cleared.body.latestBundle).toBeNull();
  });

  it('bundles are served statically from BUNDLES_DIR', async () => {
    const { mkdirSync, writeFileSync } = await import('node:fs');
    mkdirSync('./test/.bundles', { recursive: true });
    writeFileSync('./test/.bundles/1.0.0.zip', 'PK-fake');
    const res = await h.http().get('/bundles/1.0.0.zip').expect(200);
    expect(res.text ?? res.body.toString()).toContain('PK-fake');
    await h.http().get('/bundles/missing.zip').expect(404);
  });

  it('revenuecat webhook sets and clears ads_removed, rejects a bad secret', async () => {
    const buyer = await h.player('buy@example.com', 'buyer_one');
    const hdr = { Authorization: 'Bearer rc-e2e-secret' };
    const ev = (type: string, extra: Record<string, unknown> = {}) => ({
      event: { type, app_user_id: buyer.userId, entitlement_ids: ['no_ads'], product_id: 'remove_ads', store: 'APP_STORE', event_timestamp_ms: 1_700_000_000_000, ...extra },
    });

    await h.http().post('/webhooks/revenuecat').send(ev('INITIAL_PURCHASE')).expect(401);
    await h.http().post('/webhooks/revenuecat').set({ Authorization: 'Bearer nope' }).send(ev('INITIAL_PURCHASE')).expect(401);

    const r1 = await h.http().post('/webhooks/revenuecat').set(hdr).send(ev('INITIAL_PURCHASE')).expect(200);
    expect(r1.body.applied).toEqual([`+${buyer.userId}`]);
    let p = await h.prisma.profile.findUniqueOrThrow({ where: { id: buyer.userId } });
    expect(p).toMatchObject({ adsRemoved: true, adsRemovedSource: 'apple', rcAppUserId: buyer.userId });
    expect(p.adsRemovedAt?.getTime()).toBe(1_700_000_000_000);
    expect((await h.http().get('/me').set(h.auth(buyer)).expect(200)).body.ads_removed).toBe(true);

    // other entitlements are ignored
    const other = await h.http().post('/webhooks/revenuecat').set(hdr).send(ev('INITIAL_PURCHASE', { entitlement_ids: ['pro'] })).expect(200);
    expect(other.body.applied).toEqual([]);

    const r2 = await h.http().post('/webhooks/revenuecat').set(hdr).send(ev('REFUND', { store: 'PLAY_STORE' })).expect(200);
    expect(r2.body.applied).toEqual([`-${buyer.userId}`]);
    p = await h.prisma.profile.findUniqueOrThrow({ where: { id: buyer.userId } });
    expect(p.adsRemoved).toBe(false);
    expect(p.adsRemovedSource).toBe('google:refund');

    // transfer: from -> to
    const second = await h.player('buy2@example.com', 'buyer_two');
    await h.http().post('/webhooks/revenuecat').set(hdr).send(ev('NON_RENEWING_PURCHASE')).expect(200);
    const tr = await h
      .http()
      .post('/webhooks/revenuecat')
      .set(hdr)
      .send({ event: { type: 'TRANSFER', store: 'APP_STORE', transferred_from: [buyer.userId], transferred_to: [second.userId] } })
      .expect(200);
    expect(tr.body.applied).toEqual([`-${buyer.userId}`, `+${second.userId}`]);
    expect((await h.prisma.profile.findUniqueOrThrow({ where: { id: buyer.userId } })).adsRemoved).toBe(false);
    expect((await h.prisma.profile.findUniqueOrThrow({ where: { id: second.userId } })).adsRemoved).toBe(true);

    // anonymous RevenueCat ids never match a profile: 200, nothing applied
    const anon = await h.http().post('/webhooks/revenuecat').set(hdr).send(ev('INITIAL_PURCHASE', { app_user_id: '$RCAnonymousID:abc' })).expect(200);
    expect(anon.body.applied).toEqual([]);
  });
});
