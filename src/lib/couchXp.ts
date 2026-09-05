/**
 * Couch-Mode "link for XP" client helpers (API: /rooms/:code/members, /xp/room-award).
 *
 * A signed-in player records their room membership ONCE (linkRoomMember) when
 * they scan the QR and get a team, then they can close their phone. The host
 * credits every recorded member at game end (awardRoomXp), so XP lands on each
 * account whether or not the phone is still open. clearRoom wipes the room when
 * the match ends. All calls no-op cleanly when the API is unconfigured / the
 * player is signed out, so Couch Mode without accounts (or without a lobby) is
 * unaffected.
 */
import type { TeamId } from '../core/models';
import { api, getAccessToken, isApiConfigured } from './api';

const signedIn = () => isApiConfigured() && !!getAccessToken();

/** Record (or move) the signed-in player's membership for this room + team.
 *  No-ops for guests (no account): they simply earn no XP. */
export async function linkRoomMember(room: string, team: TeamId, name: string): Promise<void> {
  if (!signedIn()) return;
  await api(`/rooms/${room}/members`, { method: 'PUT', body: { team, name }, auth: 'user' }).catch(() => {});
}

/** Remove the signed-in player's own membership (on leave / kick). */
export async function unlinkRoomMember(room: string): Promise<void> {
  if (!signedIn()) return;
  await api(`/rooms/${room}/members`, { method: 'DELETE', auth: 'user' }).catch(() => {});
}

/** Host: credit every recorded member of the room for a finished game. Idempotent
 *  per (room, gameKey) server-side. Returns the number credited (0 on dup/none).
 *  The host may be a guest: the room's live host token (user or guest) is accepted. */
export async function awardRoomXp(room: string, winner: TeamId | null, gameKey: string): Promise<number> {
  if (!isApiConfigured()) return 0;
  try {
    const res = await api<{ credited: number }>('/xp/room-award', { method: 'POST', body: { room, winner, gameKey } });
    return res.credited ?? 0;
  } catch {
    return 0;
  }
}

/** Host: wipe the room's membership + award log (match end / host exit). */
export async function clearRoom(room: string): Promise<void> {
  if (!isApiConfigured()) return;
  await api(`/rooms/${room}`, { method: 'DELETE' }).catch(() => {});
}
