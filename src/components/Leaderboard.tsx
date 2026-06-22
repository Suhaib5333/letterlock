import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PACKS } from '../content';
import { useModalDismiss } from '../lib/useModalDismiss';
import { supabase, type LeaderboardRow } from '../lib/supabase';

export function Leaderboard({ onClose }: { onClose: () => void }) {
  // Pack scope — default to "all packs" but let the player drill in.
  const [packId, setPackId] = useState<string>('all');
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDismiss(dialogRef, onClose);

  useEffect(() => {
    if (!supabase) {
      setError('Online features need a Supabase connection — set VITE_SUPABASE_URL.');
      return;
    }
    let cancelled = false;
    setRows(null);
    setError(null);
    const q = supabase
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .order('moves', { ascending: true })
      .order('duration_ms', { ascending: true })
      .limit(50);
    (packId === 'all' ? q : q.eq('pack_id', packId)).then(({ data, error }) => {
      if (cancelled) return;
      if (error) setError(error.message);
      else setRows((data as LeaderboardRow[]) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [packId]);

  const packLabel = useMemo(() => {
    if (packId === 'all') return 'All packs';
    return PACKS.find((p) => p.id === packId)?.name ?? packId;
  }, [packId]);

  return (
    <AnimatePresence>
      <motion.div
        className="modal-scrim"
        data-testid="leaderboard-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          className="modal leaderboard"
          role="dialog"
          aria-label="Global leaderboard"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.95, y: 12, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
        >
          <div className="lb-head">
            <h2>🏆 Leaderboard</h2>
            <button className="icon-btn" aria-label="Close" onClick={onClose}>
              ✕
            </button>
          </div>
          <select
            className="lb-pack"
            data-testid="lb-pack"
            value={packId}
            onChange={(e) => setPackId(e.target.value)}
            aria-label="Filter by pack"
          >
            <option value="all">All packs</option>
            {PACKS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="lb-list" data-testid="lb-list" data-pack={packLabel}>
            {error && <p className="lb-error">{error}</p>}
            {!error && rows === null && <p className="go-sub">Loading…</p>}
            {!error && rows?.length === 0 && (
              <p className="go-sub">No scores yet — be the first to set one!</p>
            )}
            {rows && rows.length > 0 && (
              <ol className="lb-rows">
                {rows.map((r, i) => (
                  <li key={r.id} className="lb-row">
                    <span className="lb-rank">{i + 1}</span>
                    <span className="lb-user">@{r.username}</span>
                    <span className="lb-meta">
                      <span title="Games won">{r.score}🏆</span>
                      <span title="Moves to win">{r.moves}🎯</span>
                      <span title="Duration">{Math.round(r.duration_ms / 1000)}s</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Submit a finished match's score to the global board. No-ops cleanly when
 * Supabase isn't configured OR the user isn't signed in.
 */
export async function submitScore(args: {
  packId: string;
  score: number;
  moves: number;
  durationMs: number;
}): Promise<void> {
  if (!supabase) return;
  const { data: session } = await supabase.auth.getSession();
  const user = session.session?.user;
  if (!user) return;
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.username) return;
  // Preferred path: the SECURITY DEFINER RPC (migration 0004) — derives the
  // username server-side, blocks banned users, and bounds the metrics so the
  // board can't be forged. Falls back to the legacy direct insert only if the
  // RPC isn't deployed yet (PGRST202 = function not found).
  const { error } = await supabase.rpc('submit_score', {
    p_pack_id: args.packId,
    p_score: args.score,
    p_moves: args.moves,
    p_duration_ms: args.durationMs,
  });
  if (error && (error.code === 'PGRST202' || /could not find the function/i.test(error.message))) {
    await supabase.from('leaderboard').insert({
      user_id: user.id,
      username: profile.username,
      pack_id: args.packId,
      score: args.score,
      moves: args.moves,
      duration_ms: args.durationMs,
    });
  }
}
