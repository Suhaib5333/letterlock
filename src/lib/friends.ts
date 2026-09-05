/**
 * Friends + social presence/notifications over our API + Socket.IO gateway.
 * See PROGRESSION_SOCIAL.md section 4 and apps/api/REALTIME.md.
 *
 *  - REST: /friends (list), /friends/find, /friends/request, /friends/respond,
 *    DELETE /friends/:id, /friends/block, /friends/unblock.
 *  - Presence: the gateway puts every signed-in socket in `presence:online` and
 *    pushes the live set of online user ids (`ready.online`, then `online.ids`).
 *  - Notifications: the gateway delivers `notify` to `user:<id>`. friend_request /
 *    friend_accepted are emitted SERVER-SIDE by the REST handlers; room_invite is
 *    sent by the inviting client (`notifyUser`).
 */
import type { Socket } from 'socket.io-client';
import { api, ensureFreshToken, getAccessToken, isApiConfigured } from './api';
import { connectSocket } from './lobby';

export interface FriendRow {
  other_id: string;
  username: string;
  level: number;
  prestige: number;
  status: 'pending' | 'accepted';
  incoming: boolean; // pending + the other person sent it (you can accept)
}

export interface FoundUser {
  id: string;
  username: string;
  level: number;
  prestige: number;
}

export type Notification =
  | { type: 'friend_request'; fromName: string }
  | { type: 'friend_accepted'; fromName: string }
  | { type: 'room_invite'; fromName: string; code: string };

const signedIn = () => isApiConfigured() && !!getAccessToken();

export async function listFriends(): Promise<FriendRow[]> {
  if (!signedIn()) return [];
  return api<FriendRow[]>('/friends', { auth: 'user' }).catch(() => []);
}
export async function findUser(name: string): Promise<FoundUser | null> {
  if (!signedIn()) return null;
  const res = await api<{ user: FoundUser | null }>(`/friends/find?q=${encodeURIComponent(name.trim().toLowerCase())}`, { auth: 'user' }).catch(
    () => ({ user: null }),
  );
  return res.user;
}
/** Resolves 'pending' or 'accepted' (a reciprocal request auto-accepts). */
export async function sendFriendRequest(target: string): Promise<string | null> {
  if (!signedIn()) return null;
  const res = await api<{ status: 'pending' | 'accepted' }>('/friends/request', { method: 'POST', body: { target }, auth: 'user' });
  return res.status;
}
export async function respondFriendRequest(other: string, accept: boolean): Promise<void> {
  if (!signedIn()) return;
  await api('/friends/respond', { method: 'POST', body: { other, accept }, auth: 'user' });
}
export async function removeFriend(other: string): Promise<void> {
  if (!signedIn()) return;
  await api(`/friends/${other}`, { method: 'DELETE', auth: 'user' }).catch(() => {});
}
export async function blockUser(other: string): Promise<void> {
  if (!signedIn()) return;
  await api('/friends/block', { method: 'POST', body: { other }, auth: 'user' }).catch(() => {});
}

// -- Presence + notifications -------------------------------------------------

let social: Socket | null = null;
let onlineIds = new Set<string>();
const onlineSubs = new Set<(ids: Set<string>) => void>();
let notifyCb: ((n: Notification) => void) | null = null;

function setOnline(ids: string[]): void {
  onlineIds = new Set(ids);
  for (const cb of onlineSubs) cb(onlineIds);
}

/** Subscribe to the live online-id set. Returns an unsub. */
export function subscribeOnline(cb: (ids: Set<string>) => void): () => void {
  onlineSubs.add(cb);
  cb(onlineIds);
  return () => onlineSubs.delete(cb);
}
export function isOnline(id: string): boolean {
  return onlineIds.has(id);
}

// -- Pending incoming friend-request count --------------------------------------
// Surfaced as a badge on the Home "Friends" button so requests that arrived
// while you were away are visible on the MAIN screen, not just inside the modal.
let pendingCount = 0;
const pendingSubs = new Set<(n: number) => void>();

/** Subscribe to the count of incoming friend requests awaiting your response. */
export function subscribePendingRequests(cb: (n: number) => void): () => void {
  pendingSubs.add(cb);
  cb(pendingCount);
  return () => pendingSubs.delete(cb);
}

/** Re-fetch the pending-incoming count from the friends list and notify subs. */
export async function refreshPendingRequests(): Promise<void> {
  if (!signedIn()) {
    pendingCount = 0;
  } else {
    const list = await listFriends();
    pendingCount = list.filter((f) => f.status === 'pending' && f.incoming).length;
  }
  for (const cb of pendingSubs) cb(pendingCount);
}

/** Start presence + the notification inbox for the signed-in user. */
export async function startSocial(_userId: string, _username: string, onNotify: (n: Notification) => void): Promise<void> {
  if (!signedIn()) return;
  notifyCb = onNotify;
  if (!social) {
    social = connectSocket(async () => (await ensureFreshToken()) ?? '');
    social.on('ready', (r: { online?: string[] }) => setOnline(r.online ?? []));
    social.on('online', (r: { ids?: string[] }) => setOnline(r.ids ?? []));
    social.on('notify', (n: Notification) => {
      notifyCb?.(n);
      // Keep the Home badge in sync as requests arrive / are accepted live.
      if (n.type === 'friend_request' || n.type === 'friend_accepted') void refreshPendingRequests();
    });
    social.connect();
  }
  // Seed the pending-request badge with whatever arrived while we were away.
  void refreshPendingRequests();
}

/** Tear down presence + notifications (on sign-out). */
export async function stopSocial(): Promise<void> {
  if (social) {
    social.disconnect();
    social = null;
  }
  setOnline([]);
  pendingCount = 0;
  for (const cb of pendingSubs) cb(0);
}

/** Send a notification to another user's inbox (fire-and-forget; room invites). */
export async function notifyUser(toUserId: string, payload: Notification): Promise<void> {
  if (!social?.connected) return;
  social.emit('notify', { toUserId, payload });
}
