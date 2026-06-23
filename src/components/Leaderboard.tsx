import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PACKS } from '../content';
import { useModalDismiss } from '../lib/useModalDismiss';
import { supabase, type LeaderboardRow } from '../lib/supabase';
import { RankBadge } from './RankBadge';

type Rank = { level: number; prestige: number };

export function Leaderboard({ onClose }: { onClose: () => void }) {
  // Pack scope — default to "all packs" but let the player drill in.
  const [packId, setPackId] = useState<string>('all');
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [ranks, setRanks] = useState<Record<string, Rank>>({});
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
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
    (packId === 'all' ? q : q.eq('pack_id', packId)).then(async ({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      const list = (data as LeaderboardRow[]) ?? [];
      setRows(list);
      // Overlay each player's rank (level/prestige) by id.
      const ids = [...new Set(list.map((r) => r.user_id))];
      if (ids.length && supabase) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, level, prestige')
          .in('id', ids);
        if (!cancelled && profs) {
          const map: Record<string, Rank> = {};
          for (const p of profs as { id: string; level: number; prestige: number }[]) {
            map[p.id] = { level: p.level ?? 1, prestige: p.prestige ?? 0 };
          }
          setRanks(map);
        }
      }
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

          {/* Custom pack filter — a styled, in-DOM dropdown (not a native <select>,
              which renders an OS popup with poor dark-theme contrast that also
              doesn't appear when screen-casting). */}
          <div className="lb-filter">
            <button
              className="lb-pack"
              data-testid="lb-pack"
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((o) => !o)}
            >
              <span className="lb-pack-label">{packLabel}</span>
              <span className="lb-pack-caret" aria-hidden="true">{pickerOpen ? '▴' : '▾'}</span>
            </button>
            {pickerOpen && (
              <>
                <div className="lb-pack-backdrop" onClick={() => setPickerOpen(false)} />
                <ul className="lb-pack-menu" role="listbox" data-testid="lb-pack-menu">
                  <li>
                    <button
                      className={packId === 'all' ? 'active' : ''}
                      role="option"
                      aria-selected={packId === 'all'}
                      onClick={() => {
                        setPackId('all');
                        setPickerOpen(false);
                      }}
                    >
                      🌐 All packs
                    </button>
                  </li>
                  {PACKS.map((p) => (
                    <li key={p.id}>
                      <button
                        className={packId === p.id ? 'active' : ''}
                        role="option"
                        aria-selected={packId === p.id}
                        onClick={() => {
                          setPackId(p.id);
                          setPickerOpen(false);
                        }}
                      >
                        <span className="lb-pack-emoji">{p.emoji}</span> {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="lb-list" data-testid="lb-list" data-pack={packLabel}>
            {error && <p className="lb-error">{error}</p>}
            {!error && rows === null && <p className="go-sub">Loading…</p>}
            {!error && rows?.length === 0 && (
              <p className="go-sub">No scores yet — be the first to set one! 🥇</p>
            )}
            {rows && rows.length > 0 && (
              <>
                {/* Podium for the top 3. */}
                <div className="lb-podium">
                  {rows.slice(0, 3).map((r, i) => (
                    <div key={r.id} className={`lb-podium-card rank-${i + 1}`}>
                      <div className="lb-medal" aria-hidden="true">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                      </div>
                      <div className="lb-podium-user">@{r.username}</div>
                      {ranks[r.user_id] && (
                        <RankBadge level={ranks[r.user_id].level} prestige={ranks[r.user_id].prestige} />
                      )}
                      <div className="lb-podium-score">{r.score} 🏆</div>
                      <div className="lb-podium-sub">
                        {r.moves} moves · {Math.round(r.duration_ms / 1000)}s
                      </div>
                    </div>
                  ))}
                </div>
                {/* Remaining ranks. */}
                {rows.length > 3 && (
                  <ol className="lb-rows" start={4}>
                    {rows.slice(3).map((r, i) => (
                      <li key={r.id} className="lb-row">
                        <span className="lb-rank">{i + 4}</span>
                        <span className="lb-user">
                          @{r.username}
                          {ranks[r.user_id] && (
                            <RankBadge level={ranks[r.user_id].level} prestige={ranks[r.user_id].prestige} />
                          )}
                        </span>
                        <span className="lb-meta">
                          <span title="Games won">{r.score}🏆</span>
                          <span title="Moves to win">{r.moves}🎯</span>
                          <span title="Duration">{Math.round(r.duration_ms / 1000)}s</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </>
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
