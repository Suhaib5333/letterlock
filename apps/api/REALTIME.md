# Letterlock realtime protocol (Socket.IO gateway)

Source: `src/realtime/realtime.gateway.ts`. Client: `src/lib/lobby.ts` (rooms),
`src/lib/friends.ts` (presence + notifications). Replaces Supabase Realtime
(LAUNCH_PLAN Phase 2.6). One Socket.IO namespace, path `/socket.io`, same origin
and CORS list as the REST API.

## 1. Handshake

```js
io(API_URL, { path: '/socket.io', auth: { token } })
```

`token` is a **user access token** (15-minute JWT from `/auth/otp/verify`,
`/auth/refresh`, ...) or a **guest token** (`POST /auth/guest`, 24 h) for phones
without an account. The client passes `auth` as a function so every reconnect
attempt presents a fresh token.

| Server emits | Payload | When |
|---|---|---|
| `ready` | `{ id, kind: 'user' \| 'guest', username, online: string[] }` | Token verified. `online` is the current set of online user ids. |
| `connect_error_reason` | `{ code: 'TOKEN_INVALID' }` | Bad or expired token. The server then disconnects the socket (`io server disconnect`). Socket.IO does **not** auto-reconnect after that: the client refreshes the token (or mints a new guest token) and calls `socket.connect()` itself, at most 3 times. |

Signed-in sockets are put in `user:<id>` and `presence:online` on connect.
Guest sockets join nothing until `join_room`.

## 2. Rooms (lobby + live match)

All room messages are `socket.emit(event, body, ack)`. The ack is always
`{ ok: true, ... }` or `{ ok: false, error }`. Room codes are 4-8 chars
`[A-Z0-9]`, upper-cased server-side. A room exists while it has members and is
deleted when the last socket leaves.

`PresenceMeta` (mirrors `PresencePlayer` in `src/lib/lobby.ts`):
`{ id, name, team: 'A' | 'B' | null, role: 'host' | 'player', joinedAt }`.
`id` is the client-generated stable player id (`p_...`), not the auth sub.

| Client emits | Body | Ack / effect |
|---|---|---|
| `join_room` | `{ code, meta }` | `{ ok, code, members, isHost }`. Joins `room:<CODE>`. A rejoin with the same `meta.id` replaces the stale socket's entry (so a refresh never duplicates a player). The first `role: 'host'` becomes the room host; a **different identity** claiming host while the host socket is live gets `{ ok: false, error: 'host_taken' }` (the same identity reconnecting is allowed). Errors: `bad_request`. |
| `update_presence` | `{ code, meta: { name?, team? } }` | `{ ok, members }`. Patches my own entry (team assignment / team pick). Error `not_in_room`. |
| `broadcast` | `{ code, event?, payload }` | `{ ok }`. Relays `payload` to every **other** socket in the room (sender never echoes). `event` defaults to `payload.type`. Host-only events (below) are refused with `forbidden` unless the socket is the room host. Errors: `not_in_room`, `bad_request`. |
| `leave_room` | `{ code }` | `{ ok }`. |

| Server emits (room) | Payload | When |
|---|---|---|
| `presence` | `{ code, members: PresenceMeta[] }` (sorted by `joinedAt`) | After every join / update_presence / leave / disconnect. |
| `lobby` | `{ code, event, payload: LobbyEvent, from: playerId }` | A relayed `broadcast`. `payload.type === event`. |
| `lobby` with `event: 'host_left'` | `{ code, event: 'host_left', payload: { type: 'host_left' }, from }` | Emitted **by the gateway** when the host's socket leaves the room (explicit `leave_room`, tab closed, or connection dropped). Clients do not send `host_left` themselves. |

### LobbyEvent payloads

Exactly the `LobbyEvent` union in `src/lib/lobby.ts`. Host-only (refused from a
non-host socket): `question_served`, `answer_revealed`, `adjudicated`,
`game_won`, `game_over`, `team_assigned`, `team_labels`, `board_state`,
`steal_open`, `match_started`, `kicked`, `host_left`. Anyone in the room may send
`answer_submitted` and `request_state`.

Behaviours the client keeps (all unchanged from the Supabase version, the
gateway is a dumb relay):

- **Host re-broadcast on (re)connect**: the host re-sends `match_started`,
  `team_labels`, `board_state`, the live `question_served` (with the SAME stored
  `deadline` so phones resume mid-countdown), any `steal_open`, and
  `answer_revealed` / `game_over`, whenever a new player id appears in the roster
  or a phone sends `request_state` (`src/lib/useOnlineHost.ts`).
- **Synced deadlines**: `question_served.deadline` / `steal_open.deadline` are
  host-clock epoch ms + `hostNow`; phones derive their clock offset.
- **Atomic team colours**: `team_assigned` carries `aColor/bColor/aName/bName`.
- **One answer per player per question**: the phone persists the answered cell;
  a re-sent `question_served` for that cell keeps it locked.
- **Reconnect**: `socket.io` reconnects automatically after a network drop; the
  client re-emits `join_room` on every `connect` and a player then sends
  `request_state`.

## 3. Friends: presence + notifications (signed-in sockets only)

| Direction | Event | Payload |
|---|---|---|
| server -> `presence:online` | `online` | `{ ids: string[] }` after any signed-in socket connects / disconnects (a user with two tabs stays online until the last one drops). |
| client -> server | `notify` | `{ toUserId, payload }`, ack `{ ok }`. Guests get `forbidden`. The server adds `fromId` and `fromName` (the sender's username) and delivers to `user:<toUserId>`. Used for `room_invite`. |
| server -> `user:<id>` | `notify` | `{ type: 'friend_request' \| 'friend_accepted' \| 'room_invite', fromName, fromId, code? }`. `friend_request` / `friend_accepted` are emitted **server-side** by `POST /friends/request` and `POST /friends/respond`; clients must not send them too. |

## 4. REST routes that consult the gateway

`POST /xp/room-award` and `DELETE /rooms/:code` are public routes: if the room is
known to the gateway and has a **live** host socket, the caller's identity (user
id or guest id from the bearer token) must be that host's identity, else 403
`not_host`. A room with no live host passes (host already gone, or couch mode
without a lobby).

## 5. Limits and notes

- Single instance, rooms in memory. Redis adapter only if a second instance ever runs.
- Room code regex `^[A-Z0-9]{4,8}$`; `meta.name` capped at 40 chars, `meta.id` at 64; event names at 64.
- The server never persists lobby traffic. Scores / XP go through REST (`POST /leaderboard`, `POST /xp/award`, `POST /xp/room-award`).
- Tested end to end in `test/realtime.e2e-spec.ts` (jest) and, through the real UI, by `tests-e2e/reconnect-matrix.spec.ts`, `party-mode.spec.ts`, `couch-link.spec.ts`, `controller-reconnect.spec.ts` (Playwright against a local API instance, see `playwright.config.ts`).
