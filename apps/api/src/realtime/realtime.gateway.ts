import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { corsOrigins } from '../app.setup';
import type { TokenPayload } from '../common/auth-user';

/** Mirrors PresencePlayer in src/lib/lobby.ts. */
export interface PresenceMeta {
  id: string;
  name: string;
  team: 'A' | 'B' | null;
  role: 'host' | 'player';
  joinedAt: number;
}

interface SocketData {
  sub: string;
  kind: 'user' | 'guest';
  username: string | null;
}

interface RoomState {
  members: Map<string, PresenceMeta>; // socket.id -> meta
  hostSub: string | null; // auth sub of the host identity
  hostSocketId: string | null;
}

/** Lobby events only the host may broadcast (from LobbyEvent in src/lib/lobby.ts). */
export const HOST_ONLY_EVENTS = new Set([
  'question_served',
  'answer_revealed',
  'adjudicated',
  'game_won',
  'game_over',
  'team_assigned',
  'team_labels',
  'board_state',
  'steal_open',
  'match_started',
  'kicked',
  'host_left',
]);

type Ack = (res: unknown) => void;
const ROOM_CODE_RE = /^[A-Z0-9]{4,8}$/;

/**
 * Socket.IO gateway replacing Supabase Realtime (LAUNCH_PLAN 2.6). Protocol in
 * apps/api/REALTIME.md. Token verified on the handshake; rooms assigned
 * server-side (`room:<CODE>`, `user:<id>`, `presence:online`).
 */
@Injectable()
@WebSocketGateway({
  path: '/socket.io',
  cors: { origin: corsOrigins().length ? corsOrigins() : true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly rooms = new Map<string, RoomState>();
  /** userId -> live socket count (presence:online). */
  private readonly online = new Map<string, number>();

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // ------------------------------------------------------------ lifecycle

  async handleConnection(socket: Socket) {
    const token = (socket.handshake.auth?.token as string | undefined) ?? (socket.handshake.query?.token as string | undefined) ?? '';
    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token, { secret: process.env.JWT_SECRET });
    } catch {
      socket.emit('connect_error_reason', { code: 'TOKEN_INVALID' });
      socket.disconnect(true);
      return;
    }
    const data: SocketData = { sub: payload.sub, kind: payload.typ === 'guest' ? 'guest' : 'user', username: null };
    if (data.kind === 'guest') data.username = (payload as { name?: string }).name ?? null;
    else {
      const p = await this.prisma.profile.findUnique({ where: { id: payload.sub }, select: { username: true } });
      data.username = p?.username ?? null;
    }
    socket.data = data;

    if (data.kind === 'user') {
      void socket.join(`user:${data.sub}`);
      void socket.join('presence:online');
      this.online.set(data.sub, (this.online.get(data.sub) ?? 0) + 1);
      this.emitOnline();
    }
    socket.emit('ready', { id: data.sub, kind: data.kind, username: data.username, online: this.onlineIds() });
  }

  handleDisconnect(socket: Socket) {
    const data = socket.data as SocketData | undefined;
    for (const [code, room] of this.rooms) {
      if (room.members.has(socket.id)) this.leave(socket, code, room);
    }
    if (data?.kind === 'user') {
      const n = (this.online.get(data.sub) ?? 1) - 1;
      if (n <= 0) this.online.delete(data.sub);
      else this.online.set(data.sub, n);
      this.emitOnline();
    }
  }

  // ------------------------------------------------------------ lobby rooms

  @SubscribeMessage('join_room')
  onJoin(@ConnectedSocket() socket: Socket, @MessageBody() body: { code?: string; meta?: PresenceMeta }, ack?: Ack) {
    const code = String(body?.code ?? '').toUpperCase();
    const meta = body?.meta;
    if (!ROOM_CODE_RE.test(code) || !meta || typeof meta.id !== 'string' || (meta.role !== 'host' && meta.role !== 'player')) {
      return this.reply(ack, { ok: false, error: 'bad_request' });
    }
    const data = socket.data as SocketData;
    let room = this.rooms.get(code);
    if (!room) {
      room = { members: new Map(), hostSub: null, hostSocketId: null };
      this.rooms.set(code, room);
    }
    if (meta.role === 'host') {
      const liveHost = room.hostSocketId ? this.server.sockets.sockets.get(room.hostSocketId) : undefined;
      if (liveHost && liveHost.id !== socket.id && room.hostSub !== data.sub) {
        return this.reply(ack, { ok: false, error: 'host_taken' });
      }
      room.hostSub = data.sub;
      room.hostSocketId = socket.id;
    }
    const clean: PresenceMeta = {
      id: meta.id.slice(0, 64),
      name: String(meta.name ?? data.username ?? 'Player').slice(0, 40),
      team: meta.team === 'A' || meta.team === 'B' ? meta.team : null,
      role: meta.role,
      joinedAt: typeof meta.joinedAt === 'number' ? meta.joinedAt : Date.now(),
    };
    // A rejoin with the same player id replaces the stale socket's entry.
    for (const [sid, m] of room.members) if (m.id === clean.id && sid !== socket.id) room.members.delete(sid);
    room.members.set(socket.id, clean);
    void socket.join(`room:${code}`);
    const members = this.roster(room);
    this.server.to(`room:${code}`).emit('presence', { code, members });
    return this.reply(ack, { ok: true, code, members, isHost: room.hostSocketId === socket.id });
  }

  @SubscribeMessage('update_presence')
  onUpdatePresence(@ConnectedSocket() socket: Socket, @MessageBody() body: { code?: string; meta?: Partial<PresenceMeta> }, ack?: Ack) {
    const code = String(body?.code ?? '').toUpperCase();
    const room = this.rooms.get(code);
    const cur = room?.members.get(socket.id);
    if (!room || !cur) return this.reply(ack, { ok: false, error: 'not_in_room' });
    const patch = body?.meta ?? {};
    if (typeof patch.name === 'string') cur.name = patch.name.slice(0, 40);
    if (patch.team === 'A' || patch.team === 'B' || patch.team === null) cur.team = patch.team;
    const members = this.roster(room);
    this.server.to(`room:${code}`).emit('presence', { code, members });
    return this.reply(ack, { ok: true, members });
  }

  @SubscribeMessage('broadcast')
  onBroadcast(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { code?: string; event?: string; payload?: Record<string, unknown> },
    ack?: Ack,
  ) {
    const code = String(body?.code ?? '').toUpperCase();
    const room = this.rooms.get(code);
    const me = room?.members.get(socket.id);
    if (!room || !me) return this.reply(ack, { ok: false, error: 'not_in_room' });
    const payload = body?.payload ?? {};
    const event = String(body?.event ?? (payload as { type?: string }).type ?? '');
    if (!event || event.length > 64) return this.reply(ack, { ok: false, error: 'bad_request' });
    if (HOST_ONLY_EVENTS.has(event) && room.hostSocketId !== socket.id) {
      return this.reply(ack, { ok: false, error: 'forbidden' });
    }
    // self:false like the old channel: the sender never receives its own echo.
    socket.to(`room:${code}`).emit('lobby', { code, event, payload: { ...payload, type: event }, from: me.id });
    return this.reply(ack, { ok: true });
  }

  @SubscribeMessage('leave_room')
  onLeave(@ConnectedSocket() socket: Socket, @MessageBody() body: { code?: string }, ack?: Ack) {
    const code = String(body?.code ?? '').toUpperCase();
    const room = this.rooms.get(code);
    if (room && room.members.has(socket.id)) this.leave(socket, code, room);
    return this.reply(ack, { ok: true });
  }

  // ------------------------------------------------------- friends / notify

  @SubscribeMessage('notify')
  onNotify(@ConnectedSocket() socket: Socket, @MessageBody() body: { toUserId?: string; payload?: Record<string, unknown> }, ack?: Ack) {
    const data = socket.data as SocketData;
    if (data.kind !== 'user') return this.reply(ack, { ok: false, error: 'forbidden' });
    const to = String(body?.toUserId ?? '');
    const payload = body?.payload;
    if (!to || !payload || typeof payload !== 'object') return this.reply(ack, { ok: false, error: 'bad_request' });
    this.notifyUser(to, { ...payload, fromId: data.sub, fromName: (payload as { fromName?: string }).fromName ?? data.username ?? 'Someone' });
    return this.reply(ack, { ok: true });
  }

  /** Server-side notification (friend request/accept from REST, room invites). */
  notifyUser(userId: string, payload: Record<string, unknown>): void {
    this.server?.to(`user:${userId}`).emit('notify', payload);
  }

  // ------------------------------------------------------------- REST hooks

  /**
   * Host-only REST actions (room award / clear). If the gateway knows the room
   * and it has a live host, the caller must be that host's identity; a room
   * with no live host (host already left, or couch mode with no lobby) passes.
   */
  assertHostOrUntracked(code: string, callerSub: string | null): void {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || !room.hostSocketId) return;
    const live = this.server?.sockets.sockets.get(room.hostSocketId);
    if (!live) return;
    if (!callerSub || room.hostSub !== callerSub) {
      throw new ForbiddenException({ message: 'Only the room host may do this', code: 'not_host' });
    }
  }

  // ---------------------------------------------------------------- helpers

  private leave(socket: Socket, code: string, room: RoomState) {
    const me = room.members.get(socket.id);
    room.members.delete(socket.id);
    void socket.leave(`room:${code}`);
    if (room.hostSocketId === socket.id) {
      room.hostSocketId = null;
      // The host's tab closed/refreshed: tell the phones, exactly like beforeunload did.
      this.server.to(`room:${code}`).emit('lobby', { code, event: 'host_left', payload: { type: 'host_left' }, from: me?.id ?? null });
    }
    if (room.members.size === 0) this.rooms.delete(code);
    else this.server.to(`room:${code}`).emit('presence', { code, members: this.roster(room) });
  }

  private roster(room: RoomState): PresenceMeta[] {
    return [...room.members.values()].sort((a, b) => a.joinedAt - b.joinedAt);
  }

  private onlineIds(): string[] {
    return [...this.online.keys()];
  }

  private emitOnline() {
    this.server?.to('presence:online').emit('online', { ids: this.onlineIds() });
  }

  private reply(ack: Ack | undefined, res: unknown) {
    if (typeof ack === 'function') ack(res);
    return res;
  }
}
