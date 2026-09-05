import { io, type Socket } from 'socket.io-client';
import { Harness } from './harness';

const once = <T>(s: Socket, ev: string, ms = 5000) =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${ev}`)), ms);
    s.once(ev, (d: T) => {
      clearTimeout(t);
      resolve(d);
    });
  });
const emitAck = <T>(s: Socket, ev: string, body: unknown) => new Promise<T>((resolve) => s.emit(ev, body, resolve));

describe('realtime gateway', () => {
  const h = new Harness();
  const sockets: Socket[] = [];
  beforeAll(() => h.start(true));
  afterAll(async () => {
    for (const s of sockets) s.disconnect();
    await h.stop();
  });

  const connect = (token: string) => {
    const s = io(h.baseUrl, { path: '/socket.io', auth: { token }, transports: ['websocket'], reconnection: false });
    sockets.push(s);
    return s;
  };

  it('rejects a bad token', async () => {
    const s = connect('garbage');
    // Both packets arrive in one ws chunk, so register the disconnect listener first.
    const disconnected = once(s, 'disconnect');
    const reason = await once<{ code: string }>(s, 'connect_error_reason');
    expect(reason.code).toBe('TOKEN_INVALID');
    await disconnected;
  });

  it('host + guest player: join, presence, broadcast relay, host-only enforcement, host_left', async () => {
    const hostSession = await h.player('rt-host@example.com', 'rt_host');
    const guest = (await h.http().post('/auth/guest').send({ name: 'Phone' }).expect(200)).body as { guestToken: string; guestId: string };

    const host = connect(hostSession.accessToken);
    const ready = await once<{ id: string; kind: string; username: string }>(host, 'ready');
    expect(ready).toMatchObject({ id: hostSession.userId, kind: 'user', username: 'rt_host' });

    const player = connect(guest.guestToken);
    const pReady = await once<{ id: string; kind: string; username: string }>(player, 'ready');
    expect(pReady).toMatchObject({ id: guest.guestId, kind: 'guest', username: 'Phone' });

    // host joins first
    const hostMeta = { id: 'h_1', name: 'Host', team: null, role: 'host', joinedAt: 1000 };
    const j1 = await emitAck<{ ok: boolean; members: unknown[]; isHost: boolean }>(host, 'join_room', { code: 'abc234', meta: hostMeta });
    expect(j1.ok).toBe(true);
    expect(j1.isHost).toBe(true);
    expect(j1.members).toEqual([hostMeta]);

    // a second identity claiming host is refused
    const bogus = await emitAck<{ ok: boolean; error: string }>(player, 'join_room', { code: 'ABC234', meta: { ...hostMeta, id: 'h_2' } });
    expect(bogus).toEqual({ ok: false, error: 'host_taken' });

    // player joins; both get the presence roster
    const presenceAtHost = once<{ code: string; members: { id: string; role: string }[] }>(host, 'presence');
    const playerMeta = { id: 'p_1', name: 'Phone', team: null, role: 'player', joinedAt: 2000 };
    const j2 = await emitAck<{ ok: boolean; members: unknown[]; isHost: boolean }>(player, 'join_room', { code: 'ABC234', meta: playerMeta });
    expect(j2.ok).toBe(true);
    expect(j2.isHost).toBe(false);
    expect(j2.members).toEqual([hostMeta, playerMeta]);
    const pres = await presenceAtHost;
    expect(pres.code).toBe('ABC234');
    expect(pres.members.map((m) => m.id)).toEqual(['h_1', 'p_1']);

    // team assignment via update_presence reaches the host
    const presence2 = once<{ members: { id: string; team: string | null }[] }>(host, 'presence');
    await emitAck(player, 'update_presence', { code: 'ABC234', meta: { team: 'B' } });
    expect((await presence2).members.find((m) => m.id === 'p_1')?.team).toBe('B');

    // host broadcast -> player receives `lobby`, host does not echo to itself
    let hostGotEcho = false;
    host.once('lobby', () => (hostGotEcho = true));
    const atPlayer = once<{ code: string; event: string; payload: Record<string, unknown>; from: string }>(player, 'lobby');
    const b1 = await emitAck<{ ok: boolean }>(host, 'broadcast', { code: 'ABC234', payload: { type: 'question_served', cell: 3, letter: 'Q', prompt: 'A bird' } });
    expect(b1.ok).toBe(true);
    const got = await atPlayer;
    expect(got).toEqual({ code: 'ABC234', event: 'question_served', payload: { type: 'question_served', cell: 3, letter: 'Q', prompt: 'A bird' }, from: 'h_1' });
    expect(hostGotEcho).toBe(false);

    // player -> host answer relay (allowed), player cannot send host-only events
    const atHost = once<{ event: string; payload: { answer: string } }>(host, 'lobby');
    await emitAck(player, 'broadcast', { code: 'ABC234', payload: { type: 'answer_submitted', playerId: 'p_1', playerName: 'Phone', team: 'B', answer: 'Quail', cell: 3 } });
    expect((await atHost).payload.answer).toBe('Quail');
    const forbidden = await emitAck<{ ok: boolean; error: string }>(player, 'broadcast', { code: 'ABC234', payload: { type: 'game_over', winner: 'B' } });
    expect(forbidden).toEqual({ ok: false, error: 'forbidden' });
    const forbidden2 = await emitAck<{ ok: boolean; error: string }>(player, 'broadcast', { code: 'ABC234', event: 'match_started', payload: {} });
    expect(forbidden2).toEqual({ ok: false, error: 'forbidden' });
    const notIn = await emitAck<{ ok: boolean; error: string }>(player, 'broadcast', { code: 'ZZZ999', payload: { type: 'answer_submitted' } });
    expect(notIn).toEqual({ ok: false, error: 'not_in_room' });

    // REST host-only actions honour the live host: the player's guest token is refused
    await h.http().delete('/rooms/ABC234').set({ Authorization: `Bearer ${guest.guestToken}` }).expect(403);
    await h.http().post('/xp/room-award').set({ Authorization: `Bearer ${guest.guestToken}` }).send({ room: 'ABC234', winner: 'A', gameKey: 'g1' }).expect(403);
    await h.http().post('/xp/room-award').send({ room: 'ABC234', winner: 'A', gameKey: 'g1' }).expect(403);
    await h.http().delete('/rooms/ABC234').set(h.auth(hostSession)).expect(200);

    // host disconnect -> player gets host_left + updated presence
    const left = once<{ event: string }>(player, 'lobby');
    const presence3 = once<{ members: unknown[] }>(player, 'presence');
    host.disconnect();
    expect((await left).event).toBe('host_left');
    expect((await presence3).members).toEqual([{ ...playerMeta, team: 'B' }]);

    // leave_room cleans up
    const lv = await emitAck<{ ok: boolean }>(player, 'leave_room', { code: 'ABC234' });
    expect(lv.ok).toBe(true);
    const gone = await emitAck<{ ok: boolean; error: string }>(player, 'broadcast', { code: 'ABC234', payload: { type: 'answer_submitted' } });
    expect(gone.error).toBe('not_in_room');
  });

  it('presence:online + notify between two signed-in users; guests cannot notify', async () => {
    const a = await h.player('rt-a@example.com', 'rt_a');
    const b = await h.player('rt-b@example.com', 'rt_b');
    const sa = connect(a.accessToken);
    const readyA = await once<{ online: string[] }>(sa, 'ready');
    expect(readyA.online).toContain(a.userId);

    const onlineAtA = once<{ ids: string[] }>(sa, 'online');
    const sb = connect(b.accessToken);
    await once(sb, 'ready');
    expect((await onlineAtA).ids.sort()).toEqual([a.userId, b.userId].sort());

    // socket notify (room invite)
    const notif = once<Record<string, unknown>>(sb, 'notify');
    const ack = await emitAck<{ ok: boolean }>(sa, 'notify', { toUserId: b.userId, payload: { type: 'room_invite', code: 'ABC234' } });
    expect(ack.ok).toBe(true);
    expect(await notif).toEqual({ type: 'room_invite', code: 'ABC234', fromId: a.userId, fromName: 'rt_a' });

    // REST friend request emits friend_request to the target's user room
    const notif2 = once<Record<string, unknown>>(sb, 'notify');
    await h.http().post('/friends/request').set(h.auth(a)).send({ target: b.userId }).expect(200);
    expect(await notif2).toEqual({ type: 'friend_request', fromName: 'rt_a', fromId: a.userId });
    const notif3 = once<Record<string, unknown>>(sa, 'notify');
    await h.http().post('/friends/respond').set(h.auth(b)).send({ other: a.userId, accept: true }).expect(200);
    expect(await notif3).toEqual({ type: 'friend_accepted', fromName: 'rt_b', fromId: b.userId });

    // guests cannot notify
    const guest = (await h.http().post('/auth/guest').send({}).expect(200)).body as { guestToken: string };
    const sg = connect(guest.guestToken);
    await once(sg, 'ready');
    const denied = await emitAck<{ ok: boolean; error: string }>(sg, 'notify', { toUserId: b.userId, payload: { type: 'room_invite' } });
    expect(denied).toEqual({ ok: false, error: 'forbidden' });

    // b goes offline -> a sees the shrink
    const shrink = once<{ ids: string[] }>(sa, 'online');
    sb.disconnect();
    expect((await shrink).ids).toEqual([a.userId]);
  });
});
