import { Harness } from './harness';

describe('leaderboard, ranks, xp', () => {
  const h = new Harness();
  beforeAll(() => h.start());
  afterAll(() => h.stop());

  it('submit with bounds; paging returns one row per player (their best) + total', async () => {
    const a = await h.player('lb-a@example.com', 'alpha');
    const b = await h.player('lb-b@example.com', 'bravo');
    const c = await h.player('lb-c@example.com', 'charlie');
    const noProfile = await h.signIn('lb-none@example.com');

    await h.http().post('/leaderboard').set(h.auth(noProfile)).send({ packId: 'gk', score: 1, moves: 1, durationMs: 1 }).expect(404);
    await h.http().post('/leaderboard').set(h.auth(a)).send({ packId: 'gk', score: 101, moves: 1, durationMs: 1 }).expect(400);
    await h.http().post('/leaderboard').set(h.auth(a)).send({ packId: 'gk', score: 1, moves: -1, durationMs: 1 }).expect(400);
    await h.http().post('/leaderboard').send({ packId: 'gk', score: 1, moves: 1, durationMs: 1 }).expect(401);

    // a plays three times: best is 3 wins / 9 moves
    for (const [score, moves] of [[1, 12], [3, 9], [3, 15]]) {
      await h.http().post('/leaderboard').set(h.auth(a)).send({ packId: 'gk', score, moves, durationMs: 5000 }).expect(201);
    }
    await h.http().post('/leaderboard').set(h.auth(b)).send({ packId: 'gk', score: 2, moves: 8, durationMs: 4000 }).expect(201);
    await h.http().post('/leaderboard').set(h.auth(c)).send({ packId: 'other', score: 5, moves: 20, durationMs: 9000 }).expect(201);

    const gk = await h.http().get('/leaderboard/gk').expect(200);
    expect(gk.body.total).toBe(2);
    expect(gk.body.rows.map((r: { username: string }) => r.username)).toEqual(['alpha', 'bravo']);
    expect(gk.body.rows[0]).toMatchObject({ user_id: a.userId, score: 3, moves: 9, duration_ms: 5000, level: 1, prestige: 0 });
    // the username is derived server-side, never from the body
    expect(await h.prisma.leaderboardRow.count({ where: { userId: a.userId, username: 'alpha' } })).toBe(3);

    const all = await h.http().get('/leaderboard/all?limit=2&offset=0').expect(200);
    expect(all.body.total).toBe(3);
    expect(all.body.rows.length).toBe(2);
    expect(all.body.rows[0].username).toBe('charlie');
    const page2 = await h.http().get('/leaderboard/all?limit=2&offset=2').expect(200);
    expect(page2.body.rows.length).toBe(1);
    expect(page2.body.total).toBe(3);
    const empty = await h.http().get('/leaderboard/all?limit=2&offset=10').expect(200);
    expect(empty.body.rows).toEqual([]);
    expect(empty.body.total).toBe(3);

    // banned players cannot post
    await h.prisma.profile.update({ where: { id: b.userId }, data: { bannedAt: new Date() } });
    const banned = await h.http().post('/leaderboard').set(h.auth(b)).send({ packId: 'gk', score: 1, moves: 1, durationMs: 1 }).expect(403);
    expect(banned.body.code).toBe('banned');
  });

  it('xp award clamps to [0,200], levels up, ranks and prestige', async () => {
    const p = await h.player('xp@example.com', 'xp_player');
    const noProfile = await h.signIn('xp-none@example.com');
    await h.http().post('/xp/award').set(h.auth(noProfile)).send({ amount: 100 }).expect(404);

    const r1 = await h.http().post('/xp/award').set(h.auth(p)).send({ amount: 5000 }).expect(200);
    expect(r1.body).toEqual({ xp: 200, level: 2, prestige: 0, total_xp: 200, leveled_up: true });
    const r2 = await h.http().post('/xp/award').set(h.auth(p)).send({ amount: -50 }).expect(200);
    expect(r2.body).toMatchObject({ xp: 200, total_xp: 200, leveled_up: false });
    const r3 = await h.http().post('/xp/award').set(h.auth(p)).send({ amount: 100 }).expect(200);
    expect(r3.body).toMatchObject({ xp: 300, level: 2, total_xp: 300 });

    const notYet = await h.http().post('/xp/prestige').set(h.auth(p)).expect(400);
    expect(notYet.body.code).toBe('not_eligible');

    // ranks: p is #1 with 300 lifetime xp; a second player below
    const q = await h.player('xp2@example.com', 'xp_second');
    await h.http().post('/xp/award').set(h.auth(q)).send({ amount: 50 }).expect(200);
    const ranks = await h.http().get('/ranks?limit=10').expect(200);
    expect(ranks.body[0]).toMatchObject({ id: p.userId, username: 'xp_player', total_xp: 300, rank: 1 });
    expect(ranks.body[1]).toMatchObject({ id: q.userId, total_xp: 50, rank: 2 });
    const mine = await h.http().get('/ranks/me').set(h.auth(q)).expect(200);
    expect(mine.body).toEqual({ rank: 2, total_xp: 50, level: 1, prestige: 0 });

    // push to level 10 via the admin function then prestige
    await h.prisma.$executeRaw`select admin_grant_xp(${p.userId}::uuid, 9000)`;
    const lvl = await h.prisma.profile.findUniqueOrThrow({ where: { id: p.userId } });
    expect(lvl.level).toBe(10);
    expect(lvl.xp).toBe(8500); // capped
    expect(Number(lvl.totalXp)).toBe(9300);
    const pr = await h.http().post('/xp/prestige').set(h.auth(p)).expect(200);
    expect(pr.body).toEqual({ level: 1, prestige: 1 });
    // total_xp never resets so the rank order is unchanged
    const ranks2 = await h.http().get('/ranks').expect(200);
    expect(ranks2.body[0]).toMatchObject({ id: p.userId, total_xp: 9300, prestige: 1, level: 1 });
  });

  it('room award credits linked members once per game key', async () => {
    const host = await h.player('room-host@example.com', 'room_host');
    const m1 = await h.player('room-m1@example.com', 'room_m1');
    const m2 = await h.player('room-m2@example.com', 'room_m2');
    await h.http().put('/rooms/QZ2345/members').set(h.auth(m1)).send({ team: 'A', name: 'M1' }).expect(200);
    await h.http().put('/rooms/QZ2345/members').set(h.auth(m2)).send({ team: 'B' }).expect(200);
    // m1 sees only their own row
    const mine = await h.http().get('/rooms/QZ2345/members').set(h.auth(m1)).expect(200);
    expect(mine.body.members).toHaveLength(1);
    expect(mine.body.members[0]).toMatchObject({ room_code: 'QZ2345', user_id: m1.userId, team: 'A', name: 'M1' });

    const first = await h.http().post('/xp/room-award').set(h.auth(host)).send({ room: 'QZ2345', winner: 'A', gameKey: 'g1' }).expect(200);
    expect(first.body).toEqual({ credited: 2 });
    const dup = await h.http().post('/xp/room-award').set(h.auth(host)).send({ room: 'QZ2345', winner: 'A', gameKey: 'g1' }).expect(200);
    expect(dup.body).toEqual({ credited: 0 });
    expect((await h.prisma.profile.findUniqueOrThrow({ where: { id: m1.userId } })).xp).toBe(100);
    expect((await h.prisma.profile.findUniqueOrThrow({ where: { id: m2.userId } })).xp).toBe(50);
    await h.http().post('/xp/room-award').send({ room: 'QZ2345', winner: 'C', gameKey: 'g2' }).expect(400);

    // unlink + clear
    await h.http().delete('/rooms/QZ2345/members').set(h.auth(m1)).expect(200);
    expect(await h.prisma.roomMember.count({ where: { roomCode: 'QZ2345' } })).toBe(1);
    await h.http().delete('/rooms/QZ2345').set(h.auth(host)).expect(200);
    expect(await h.prisma.roomMember.count({ where: { roomCode: 'QZ2345' } })).toBe(0);
    expect(await h.prisma.roomAward.count({ where: { roomCode: 'QZ2345' } })).toBe(0);
  });
});
