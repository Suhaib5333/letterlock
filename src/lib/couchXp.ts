/**
 * Couch-Mode "link for XP" client helpers (see supabase/migrations/0012).
 *
 * A signed-in player records their room membership ONCE (linkRoomMember) when
 * they scan the QR and get a team — then they can close their phone. The host
 * credits every recorded member at game end (awardRoomXp), so XP lands on each
 * account whether or not the phone is still open. room_clear wipes the room when
 * the match ends. All calls no-op cleanly when Supabase is unconfigured / signed
 * out, so Couch Mode without accounts (or without a lobby) is unaffected.
 */
import type { TeamId } from '../core/models';
import { supabase } from './supabase';

/** Record (or move) the signed-in player's membership for this room + team.
 *  No-ops for guests (no session) — they simply earn no XP. */
export async function linkRoomMember(room: string, team: TeamId, name: string): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) return;
  await supabase
    .from('room_members')
    .upsert({ room_code: room, user_id: uid, team, name }, { onConflict: 'room_code,user_id' })
    .then(undefined, () => {});
}

/** Remove the signed-in player's own membership (on leave / kick). */
export async function unlinkRoomMember(room: string): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) return;
  await supabase
    .from('room_members')
    .delete()
    .eq('room_code', room)
    .eq('user_id', uid)
    .then(undefined, () => {});
}

/** Host: credit every recorded member of the room for a finished game. Idempotent
 *  per (room, gameKey) server-side. Returns the number credited (0 on dup/none). */
export async function awardRoomXp(room: string, winner: TeamId | null, gameKey: string): Promise<number> {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc('award_room_xp', {
    p_room: room,
    p_winner: winner,
    p_game_key: gameKey,
  });
  if (error) return 0;
  return typeof data === 'number' ? data : 0;
}

/** Host: wipe the room's membership + award log (match end / host exit). */
export async function clearRoom(room: string): Promise<void> {
  if (!supabase) return;
  await supabase.rpc('room_clear', { p_room: room }).then(undefined, () => {});
}
