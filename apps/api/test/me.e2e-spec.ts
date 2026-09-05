import { Harness } from './harness';

describe('me + usernames', () => {
  const h = new Harness();
  beforeAll(() => h.start());
  afterAll(() => h.stop());

  it('claim, availability, profile shape', async () => {
    const s = await h.signIn('claim@example.com');
    await h.http().get('/me').set(h.auth(s)).expect(404);
    expect((await h.http().get('/users/username-available?name=Honey_Badger').expect(200)).body).toEqual({ available: true });
    expect((await h.http().get('/users/username-available?name=admin').expect(200)).body).toEqual({ available: false });
    expect((await h.http().get('/users/username-available?name=ab').expect(200)).body).toEqual({ available: false });

    const bad = await h.http().post('/me/username').set(h.auth(s)).send({ username: 'Bad Name!' }).expect(400);
    expect(bad.body.errors?.length).toBeGreaterThan(0);
    const reserved = await h.http().post('/me/username').set(h.auth(s)).send({ username: 'letterlock' }).expect(400);
    expect(reserved.body.code).toBe('reserved');

    const claimed = await h.http().post('/me/username').set(h.auth(s)).send({ username: 'Honey_Badger' }).expect(201);
    expect(claimed.body).toMatchObject({
      id: s.userId,
      username: 'honey_badger',
      role: 'player',
      level: 1,
      xp: 0,
      prestige: 0,
      total_xp: 0,
      full_access: false,
      ads_removed: false,
      banned_at: null,
      username_changed_at: null,
    });
    expect((await h.http().get('/users/username-available?name=honey_badger').expect(200)).body).toEqual({ available: false });

    // second claim is refused; another user cannot take the same name
    const again = await h.http().post('/me/username').set(h.auth(s)).send({ username: 'other_one' }).expect(409);
    expect(again.body.code).toBe('already_claimed');
    const s2 = await h.signIn('claim2@example.com');
    const taken = await h.http().post('/me/username').set(h.auth(s2)).send({ username: 'honey_badger' }).expect(409);
    expect(taken.body.code).toBe('taken');

    // /auth/me now carries the profile
    const me = await h.http().get('/auth/me').set(h.auth(s)).expect(200);
    expect(me.body.profile.username).toBe('honey_badger');

    // PATCH display name / avatar
    const patched = await h.http().patch('/me').set(h.auth(s)).send({ display_name: 'HB', avatar_url: 'https://x.test/a.png' }).expect(200);
    expect(patched.body.display_name).toBe('HB');
    expect(patched.body.avatar_url).toBe('https://x.test/a.png');
    // role is not writable through PATCH (whitelist)
    await h.http().patch('/me').set(h.auth(s)).send({ role: 'admin' }).expect(400);
  });

  it('username change: first free, then 30-day cooldown, reserved and taken handled', async () => {
    const s = await h.player('change@example.com', 'first_name');
    const other = await h.player('change2@example.com', 'someone_else');

    const unchanged = await h.http().put('/me/username').set(h.auth(s)).send({ username: 'first_name' }).expect(400);
    expect(unchanged.body.code).toBe('unchanged');
    const reserved = await h.http().put('/me/username').set(h.auth(s)).send({ username: 'moderator' }).expect(400);
    expect(reserved.body.code).toBe('reserved');
    const taken = await h.http().put('/me/username').set(h.auth(s)).send({ username: 'someone_else' }).expect(409);
    expect(taken.body.code).toBe('taken');

    const ok = await h.http().put('/me/username').set(h.auth(s)).send({ username: 'second_name' }).expect(200);
    expect(ok.body.ok).toBe(true);
    expect(ok.body.profile.username).toBe('second_name');
    expect(new Date(ok.body.next_allowed_at).getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);

    const soon = await h.http().put('/me/username').set(h.auth(s)).send({ username: 'third_name' }).expect(400);
    expect(soon.body.code).toBe('too_soon');
    expect(soon.body.next_allowed_at).toBeTruthy();

    // the trigger backstop holds even for a direct table update
    await expect(h.prisma.profile.update({ where: { id: s.userId }, data: { username: 'sneaky_one' } })).rejects.toThrow(/too_soon/);

    // leaderboard username cascade (0005) still fires on a legit change
    await h.http().post('/leaderboard').set(h.auth(other)).send({ packId: 'p', score: 1, moves: 3, durationMs: 100 }).expect(201);
    await h.http().put('/me/username').set(h.auth(other)).send({ username: 'renamed_else' }).expect(200);
    const row = await h.prisma.leaderboardRow.findFirst({ where: { userId: other.userId } });
    expect(row?.username).toBe('renamed_else');
  });
});
