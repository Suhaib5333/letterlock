/**
 * Friends + social presence/notifications over Supabase (RPCs from migration 0007
 * + Realtime). See PROGRESSION_SOCIAL.md §4.
 *
 *  - RPC wrappers: list / add / respond / remove / block / unblock / find.
 *  - Presence: a global `presence:online` channel → the live set of online user
 *    ids (so friends show an online dot).
 *  - Notifications: a per-user channel `user:<id>` receives friend_request /
 *    room_invite broadcasts → an in-app popup.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

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

export async function listFriends(): Promise<FriendRow[]> {
  if (!supabase) return [];
  const { data } = await supabase.rpc('friends_list');
  return (data as FriendRow[]) ?? [];
}
export async function findUser(name: string): Promise<FoundUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.rpc('find_user', { name: name.trim().toLowerCase() });
  const row = Array.isArray(data) ? data[0] : data;
  return (row as FoundUser) ?? null;
}
export async function sendFriendRequest(target: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('send_friend_request', { target });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}
export async function respondFriendRequest(other: string, accept: boolean): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('respond_friend_request', { other, accept });
  if (error) throw new Error(error.message);
}
export async function removeFriend(other: string): Promise<void> {
  if (!supabase) return;
  await supabase.rpc('remove_friend', { other });
}
export async function blockUser(other: string): Promise<void> {
  if (!supabase) return;
  await supabase.rpc('block_user', { other });
}

// ── Presence + notifications ────────────────────────────────────────────────

let presenceCh: RealtimeChannel | null = null;
let notifyCh: RealtimeChannel | null = null;
let onlineIds = new Set<string>();
const onlineSubs = new Set<(ids: Set<string>) => void>();
let notifyCb: ((n: Notification) => void) | null = null;

/** Subscribe to the live online-id set. Returns an unsub. */
export function subscribeOnline(cb: (ids: Set<string>) => void): () => void {
  onlineSubs.add(cb);
  cb(onlineIds);
  return () => onlineSubs.delete(cb);
}
export function isOnline(id: string): boolean {
  return onlineIds.has(id);
}

// ── Pending incoming friend-request count ───────────────────────────────────
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
  if (!supabase) {
    pendingCount = 0;
  } else {
    const list = await listFriends();
    pendingCount = list.filter((f) => f.status === 'pending' && f.incoming).length;
  }
  for (const cb of pendingSubs) cb(pendingCount);
}

/** Start presence + the per-user notification channel for the signed-in user. */
export async function startSocial(userId: string, username: string, onNotify: (n: Notification) => void): Promise<void> {
  if (!supabase) return;
  notifyCb = onNotify;
  // Global presence — everyone online tracks themselves here.
  if (!presenceCh) {
    presenceCh = supabase.channel('presence:online', { config: { presence: { key: userId } } });
    presenceCh.on('presence', { event: 'sync' }, () => {
      const state = presenceCh!.presenceState() as Record<string, unknown[]>;
      onlineIds = new Set(Object.keys(state));
      for (const cb of onlineSubs) cb(onlineIds);
    });
    await new Promise<void>((resolve) => {
      presenceCh!.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceCh!.track({ id: userId, username });
          resolve();
        }
      });
    });
  }
  // Per-user notification inbox.
  if (!notifyCh) {
    notifyCh = supabase.channel(`user:${userId}`, { config: { broadcast: { self: false } } });
    notifyCh.on('broadcast', { event: 'notify' }, (msg) => {
      const n = msg.payload as Notification;
      notifyCb?.(n);
      // Keep the Home badge in sync as requests arrive / are accepted live.
      if (n.type === 'friend_request' || n.type === 'friend_accepted') {
        void refreshPendingRequests();
      }
    });
    await new Promise<void>((resolve) => {
      notifyCh!.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
  }
  // Seed the pending-request badge with whatever arrived while we were away.
  void refreshPendingRequests();
}

/** Tear down presence + notifications (on sign-out). */
export async function stopSocial(): Promise<void> {
  if (!supabase) return;
  if (presenceCh) {
    await supabase.removeChannel(presenceCh);
    presenceCh = null;
  }
  if (notifyCh) {
    await supabase.removeChannel(notifyCh);
    notifyCh = null;
  }
  onlineIds = new Set();
  for (const cb of onlineSubs) cb(onlineIds);
  pendingCount = 0;
  for (const cb of pendingSubs) cb(0);
}

/** Send a notification to another user's inbox channel (fire-and-forget). */
export async function notifyUser(toUserId: string, payload: Notification): Promise<void> {
  if (!supabase) return;
  const ch = supabase.channel(`user:${toUserId}`);
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve();
    });
  });
  await ch.send({ type: 'broadcast', event: 'notify', payload });
  await supabase.removeChannel(ch);
}
