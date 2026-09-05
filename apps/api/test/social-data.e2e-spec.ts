import { Harness } from './harness';

describe('friends, saves, progress, custom packs (isolation)', () => {
  const h = new Harness();
  beforeAll(() => h.start());
  afterAll(() => h.stop());

  it('friends: request, respond, list, remove, block, find', async () => {
    const a = await h.player('fr-a@example.com', 'friend_a');
    const b = await h.player('fr-b@example.com', 'friend_b');
    const c = await h.player('fr-c@example.com', 'friend_c');

    expect((await h.http().get('/friends/find?q=FRIEND_B').set(h.auth(a)).expect(200)).body.user).toMatchObject({ id: b.userId, username: 'friend_b' });
    expect((await h.http().get('/friends/find?q=friend_a').set(h.auth(a)).expect(200)).body.user).toBeNull(); // never yourself
    expect((await h.http().get('/friends/find?q=nobody').set(h.auth(a)).expect(200)).body.user).toBeNull();

    await h.http().post('/friends/request').set(h.auth(a)).send({ target: a.userId }).expect(400);
    await h.http().post('/friends/request').set(h.auth(a)).send({ target: '00000000-0000-4000-8000-000000000000' }).expect(404);
    expect((await h.http().post('/friends/request').set(h.auth(a)).send({ target: b.userId }).expect(200)).body).toEqual({ status: 'pending' });
    expect((await h.http().post('/friends/request').set(h.auth(a)).send({ target: b.userId }).expect(200)).body).toEqual({ status: 'pending' });

    const bList = await h.http().get('/friends').set(h.auth(b)).expect(200);
    expect(bList.body).toEqual([{ other_id: a.userId, username: 'friend_a', level: 1, prestige: 0, status: 'pending', incoming: true }]);
    const aList = await h.http().get('/friends').set(h.auth(a)).expect(200);
    expect(aList.body[0]).toMatchObject({ other_id: b.userId, status: 'pending', incoming: false });
    // c sees nothing of a<->b
    expect((await h.http().get('/friends').set(h.auth(c)).expect(200)).body).toEqual([]);

    // c cannot respond to a request that is not theirs
    await h.http().post('/friends/respond').set(h.auth(c)).send({ other: a.userId, accept: true }).expect(404);
    expect((await h.http().post('/friends/respond').set(h.auth(b)).send({ other: a.userId, accept: true }).expect(200)).body).toEqual({ status: 'accepted' });
    expect((await h.http().get('/friends').set(h.auth(a)).expect(200)).body[0]).toMatchObject({ status: 'accepted', incoming: false });

    // reciprocal request auto-accepts
    await h.http().post('/friends/request').set(h.auth(b)).send({ target: c.userId }).expect(200);
    expect((await h.http().post('/friends/request').set(h.auth(c)).send({ target: b.userId }).expect(200)).body).toEqual({ status: 'accepted' });

    // decline deletes
    await h.http().post('/friends/request').set(h.auth(a)).send({ target: c.userId }).expect(200);
    expect((await h.http().post('/friends/respond').set(h.auth(c)).send({ other: a.userId, accept: false }).expect(200)).body).toEqual({ status: 'declined' });
    expect((await h.http().get('/friends').set(h.auth(a)).expect(200)).body).toHaveLength(1);

    // remove + block
    await h.http().delete(`/friends/${b.userId}`).set(h.auth(a)).expect(200);
    expect((await h.http().get('/friends').set(h.auth(a)).expect(200)).body).toEqual([]);
    await h.http().post('/friends/block').set(h.auth(a)).send({ other: b.userId }).expect(200);
    const blocked = await h.http().post('/friends/request').set(h.auth(b)).send({ target: a.userId }).expect(403);
    expect(blocked.body.code).toBe('blocked');
    // only the blocker can lift it
    await h.http().post('/friends/unblock').set(h.auth(b)).send({ other: a.userId }).expect(200);
    await h.http().post('/friends/request').set(h.auth(b)).send({ target: a.userId }).expect(403);
    await h.http().post('/friends/unblock').set(h.auth(a)).send({ other: b.userId }).expect(200);
    await h.http().post('/friends/request').set(h.auth(b)).send({ target: a.userId }).expect(200);
  });

  it('saves: one row per user, B cannot read A', async () => {
    const a = await h.player('sv-a@example.com', 'save_a');
    const b = await h.player('sv-b@example.com', 'save_b');
    expect((await h.http().get('/saves').set(h.auth(a)).expect(200)).body).toEqual({ state: null, updated_at: null });
    const state = { opts: { packId: 'gk' }, series: { wins: [1, 0] }, log: [{ t: 'HexClaimed', cell: 3 }] };
    await h.http().put('/saves').set(h.auth(a)).send({ state }).expect(200);
    await h.http().put('/saves').set(h.auth(a)).send({ state: { ...state, log: [] } }).expect(200);
    expect(await h.prisma.savedGame.count()).toBe(1);
    expect((await h.http().get('/saves').set(h.auth(a)).expect(200)).body.state).toEqual({ ...state, log: [] });
    expect((await h.http().get('/saves').set(h.auth(b)).expect(200)).body.state).toBeNull();
    await h.http().put('/saves').set(h.auth(a)).send({ state: 'nope' }).expect(400);
    await h.http().delete('/saves').set(h.auth(b)).expect(200); // b's delete never touches a
    expect((await h.http().get('/saves').set(h.auth(a)).expect(200)).body.state).not.toBeNull();
    await h.http().delete('/saves').set(h.auth(a)).expect(200);
    expect((await h.http().get('/saves').set(h.auth(a)).expect(200)).body.state).toBeNull();
  });

  it('progress: per (user, pack), isolated', async () => {
    const a = await h.player('pg-a@example.com', 'prog_a');
    const b = await h.player('pg-b@example.com', 'prog_b');
    await h.http().put('/progress/gk').set(h.auth(a)).send({ served: ['q1', 'q2'] }).expect(200);
    await h.http().put('/progress/flags').set(h.auth(a)).send({ served: ['f9'] }).expect(200);
    await h.http().put('/progress/gk').set(h.auth(a)).send({ served: ['q1', 'q2', 'q3'] }).expect(200);
    expect((await h.http().get('/progress').set(h.auth(a)).expect(200)).body).toEqual({ packs: { gk: ['q1', 'q2', 'q3'], flags: ['f9'] } });
    expect((await h.http().get('/progress').set(h.auth(b)).expect(200)).body).toEqual({ packs: {} });
    await h.http().delete('/progress/gk').set(h.auth(b)).expect(200);
    expect((await h.http().get('/progress').set(h.auth(a)).expect(200)).body.packs.gk).toHaveLength(3);
    await h.http().delete('/progress/gk').set(h.auth(a)).expect(200);
    expect((await h.http().get('/progress').set(h.auth(a)).expect(200)).body).toEqual({ packs: { flags: ['f9'] } });
  });

  it('custom packs: owner-only edits, staff publish, published visible to all', async () => {
    const owner = await h.player('cp-a@example.com', 'pack_owner');
    const other = await h.player('cp-b@example.com', 'pack_other');
    const mod = await h.player('cp-m@example.com', 'pack_mod');
    await h.prisma.profile.update({ where: { id: mod.userId }, data: { role: 'moderator' } });

    const body = { letters: { A: [{ q: 'Largest continent', a: 'Asia' }] } };
    const created = await h.http().post('/packs/custom').set(h.auth(owner)).send({ name: 'Geo', body, difficulty: 'easy' }).expect(201);
    expect(created.body).toMatchObject({ owner_id: owner.userId, name: 'Geo', emoji: '✨', difficulty: 'easy', published: false, body });
    await h.http().post('/packs/custom').set(h.auth(owner)).send({ name: 'X', body }).expect(400); // name too short
    await h.http().post('/packs/custom').set(h.auth(owner)).send({ name: 'Geo', body, difficulty: 'impossible' }).expect(400);
    const id = created.body.id;

    // lists
    expect((await h.http().get('/packs/custom').set(h.auth(owner)).expect(200)).body).toHaveLength(1);
    expect((await h.http().get('/packs/custom').set(h.auth(other)).expect(200)).body).toEqual([]);
    expect((await h.http().get('/packs/custom?scope=published').expect(200)).body).toEqual([]);
    await h.http().get('/packs/custom?scope=all').set(h.auth(other)).expect(403);
    expect((await h.http().get('/packs/custom?scope=all').set(h.auth(mod)).expect(200)).body).toHaveLength(1);
    await h.http().get('/packs/custom').expect(403); // signed-out "mine"

    // get: draft hidden from others
    await h.http().get(`/packs/custom/${id}`).set(h.auth(other)).expect(404);
    await h.http().get(`/packs/custom/${id}`).expect(404);
    await h.http().get(`/packs/custom/${id}`).set(h.auth(owner)).expect(200);

    // edits
    await h.http().patch(`/packs/custom/${id}`).set(h.auth(other)).send({ name: 'Hijack' }).expect(403);
    await h.http().patch(`/packs/custom/${id}`).set(h.auth(owner)).send({ published: true }).expect(403);
    expect((await h.http().patch(`/packs/custom/${id}`).set(h.auth(owner)).send({ name: 'Geo v2' }).expect(200)).body.name).toBe('Geo v2');
    const pub = await h.http().patch(`/packs/custom/${id}`).set(h.auth(mod)).send({ published: true }).expect(200);
    expect(pub.body.published).toBe(true);
    expect(pub.body.published_at).toBeTruthy();
    expect((await h.http().get('/packs/custom?scope=published').expect(200)).body).toHaveLength(1);
    await h.http().get(`/packs/custom/${id}`).set(h.auth(other)).expect(200);

    // delete
    await h.http().delete(`/packs/custom/${id}`).set(h.auth(other)).expect(403);
    await h.http().delete(`/packs/custom/${id}`).set(h.auth(owner)).expect(200);
    await h.http().get(`/packs/custom/${id}`).set(h.auth(owner)).expect(404);
  });
});
