import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PACKS } from '../content';
import { useModalDismiss } from '../lib/useModalDismiss';
import { api, getAccessToken, isApiConfigured, isNetworkApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { enqueue, registerRunner } from '../lib/offlineQueue';
import { isOnline } from '../lib/online';
import { RankBadge } from './RankBadge';

type ScoreRow = {
  user_id: string;
  username: string;
  score: number;
  moves: number;
  duration_ms: number;
  level: number;
  prestige: number;
};
type RankRow = { id: string; username: string; level: number; prestige: number; total_xp: number; rank: number };
type MyRank = { rank: number; total_xp: number; level: number; prestige: number };
const PAGE_SIZE = 25;

export function Leaderboard({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'scores' | 'ranks'>('scores');
  const meId = useAuth().user?.id ?? null;
  // Scores tab — deduped (best per player) + paginated.
  const [packId, setPackId] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  const [total, setTotal] = useState(0); // deduped players in this scope (for pagination)
  const [pickerOpen, setPickerOpen] = useState(false);
  // Ranks tab
  const [rankRows, setRankRows] = useState<RankRow[] | null>(null);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDismiss(dialogRef, onClose);

  // Reset to page 1 whenever the pack changes.
  useEffect(() => setPage(0), [packId]);

  // Scores tab data: deduped (best per player) + paginated, GET /leaderboard/:pack.
  useEffect(() => {
    if (tab !== 'scores' || !isApiConfigured()) return;
    let cancelled = false;
    setRows(null);
    setError(null);
    api<{ rows: ScoreRow[]; total: number }>(
      `/leaderboard/${encodeURIComponent(packId)}?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
      { auth: 'none' },
    ).then(
      (res) => {
        if (cancelled) return;
        setRows(res.rows ?? []);
        setTotal(res.total ?? 0);
      },
      (e: Error) => {
        if (!cancelled) setError(e.message);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [packId, tab, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Ranks tab data (global by total XP): GET /ranks + GET /ranks/me (signed in).
  useEffect(() => {
    if (tab !== 'ranks' || !isApiConfigured()) return;
    let cancelled = false;
    setRankRows(null);
    setError(null);
    api<RankRow[]>('/ranks?limit=100', { auth: 'none' }).then(
      (rows) => {
        if (!cancelled) setRankRows(rows ?? []);
      },
      (e: Error) => {
        if (!cancelled) setError(e.message);
      },
    );
    if (getAccessToken()) {
      api<MyRank>('/ranks/me', { auth: 'user' }).then(
        (r) => {
          if (!cancelled && r) setMyRank(r);
        },
        () => {}, // 404 no_profile / signed out: no pinned row
      );
    }
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const packLabel = useMemo(() => {
    if (packId === 'all') return 'All packs';
    return PACKS.find((p) => p.id === packId)?.name ?? packId;
  }, [packId]);

  // Is the current player already shown in the top-N ranks list?
  const meInList = !!(meId && rankRows?.some((r) => r.id === meId));

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
          aria-label="Leaderboard"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.95, y: 12, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
        >
          <div className="lb-head">
            <h2>🏆 Leaderboard</h2>
            <button className="icon-btn" aria-label="Close" onClick={onClose}>✕</button>
          </div>

          <div className="lb-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'scores'} className={tab === 'scores' ? 'active' : ''} data-testid="lb-tab-scores" onClick={() => setTab('scores')}>
              🏁 Match scores
            </button>
            <button role="tab" aria-selected={tab === 'ranks'} className={tab === 'ranks' ? 'active' : ''} data-testid="lb-tab-ranks" onClick={() => setTab('ranks')}>
              ⭐ Ranks (XP)
            </button>
          </div>

          {tab === 'scores' && (
            <div className="lb-filter">
              <button className="lb-pack" data-testid="lb-pack" aria-haspopup="listbox" aria-expanded={pickerOpen} onClick={() => setPickerOpen((o) => !o)}>
                <span className="lb-pack-label">{packLabel}</span>
                <span className="lb-pack-caret" aria-hidden="true">{pickerOpen ? '▴' : '▾'}</span>
              </button>
              {pickerOpen && (
                <>
                  <div className="lb-pack-backdrop" onClick={() => setPickerOpen(false)} />
                  <ul className="lb-pack-menu" role="listbox" data-testid="lb-pack-menu">
                    <li>
                      <button className={packId === 'all' ? 'active' : ''} role="option" aria-selected={packId === 'all'} onClick={() => { setPackId('all'); setPickerOpen(false); }}>🌐 All packs</button>
                    </li>
                    {PACKS.map((p) => (
                      <li key={p.id}>
                        <button className={packId === p.id ? 'active' : ''} role="option" aria-selected={packId === p.id} onClick={() => { setPackId(p.id); setPickerOpen(false); }}>
                          <span className="lb-pack-emoji">{p.emoji}</span> {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {tab === 'scores' && (
            <div className="lb-list" data-testid="lb-list" data-pack={packLabel}>
              {error && <p className="lb-error">{error}</p>}
              {!error && rows === null && <p className="go-sub">Loading…</p>}
              {!error && rows?.length === 0 && <p className="go-sub">No scores yet — be the first to set one! 🥇</p>}
              {rows && rows.length > 0 && (
                <>
                  {/* Podium only on the first page (overall top 3). */}
                  {page === 0 && (
                    <div className="lb-podium">
                      {rows.slice(0, 3).map((r, i) => (
                        <div key={r.user_id} className={`lb-podium-card rank-${i + 1} ${r.user_id === meId ? 'is-me' : ''}`}>
                          <div className="lb-medal" aria-hidden="true">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                          <div className="lb-podium-user">@{r.username}</div>
                          <RankBadge level={r.level} prestige={r.prestige} />
                          <div className="lb-podium-score">{r.score} 🏆</div>
                          <div className="lb-podium-sub">{r.moves} moves · {Math.round(r.duration_ms / 1000)}s</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <ol className="lb-rows" start={page === 0 ? 4 : page * PAGE_SIZE + 1}>
                    {(page === 0 ? rows.slice(3) : rows).map((r, i) => {
                      const rankNo = page === 0 ? i + 4 : page * PAGE_SIZE + i + 1;
                      return (
                        <li key={r.user_id} className={`lb-row ${r.user_id === meId ? 'is-me' : ''}`}>
                          <span className="lb-rank">{rankNo}</span>
                          <span className="lb-user">
                            @{r.username}{r.user_id === meId && <span className="lb-you">YOU</span>}
                            <RankBadge level={r.level} prestige={r.prestige} />
                          </span>
                          <span className="lb-meta">
                            <span title="Games won">{r.score}🏆</span>
                            <span title="Moves to win">{r.moves}🎯</span>
                            <span title="Duration">{Math.round(r.duration_ms / 1000)}s</span>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </>
              )}
            </div>
          )}

          {tab === 'scores' && total > PAGE_SIZE && (
            <div className="lb-pager" data-testid="lb-pager">
              <button className="btn btn-ghost sm" disabled={page === 0} onClick={() => setPage(0)} aria-label="First page">«</button>
              <button className="btn btn-ghost sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="Previous">‹</button>
              <span className="lb-pager-info">Page {page + 1} / {totalPages}</span>
              <button className="btn btn-ghost sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} aria-label="Next">›</button>
              <button className="btn btn-ghost sm" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} aria-label="Last page">»</button>
            </div>
          )}

          {tab === 'ranks' && (
            <div className="lb-list" data-testid="lb-ranks-list">
              {error && <p className="lb-error">{error}</p>}
              {!error && rankRows === null && <p className="go-sub">Loading…</p>}
              {!error && rankRows?.length === 0 && <p className="go-sub">No ranked players yet — play a game to get on the board! ⭐</p>}
              {rankRows && rankRows.length > 0 && (
                <ol className="lb-rows lb-rank-rows">
                  {rankRows.map((r) => (
                    <li key={r.id} className={`lb-row ${r.id === meId ? 'is-me' : ''}`} data-testid={r.id === meId ? 'lb-me-row' : undefined}>
                      <span className="lb-rank">{r.rank}</span>
                      <span className="lb-user">
                        @{r.username}{r.id === meId && <span className="lb-you">YOU</span>}
                        <RankBadge level={r.level} prestige={r.prestige} />
                      </span>
                      <span className="lb-meta"><span title="Lifetime XP">{r.total_xp.toLocaleString()} XP</span></span>
                    </li>
                  ))}
                </ol>
              )}
              {/* Always show the signed-in player's position, even if outside the top list. */}
              {myRank && !meInList && (
                <div className="lb-me-pinned" data-testid="lb-me-pinned">
                  <span className="lb-rank">{myRank.rank}</span>
                  <span className="lb-user">You <RankBadge level={myRank.level} prestige={myRank.prestige} /></span>
                  <span className="lb-meta">{myRank.total_xp.toLocaleString()} XP</span>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Submit a finished match's score to the global board (POST /leaderboard). No-ops
 * cleanly when the API isn't configured OR the user isn't signed in.
 */
export async function submitScore(args: {
  packId: string;
  score: number;
  moves: number;
  durationMs: number;
}): Promise<void> {
  if (!isApiConfigured() || !getAccessToken()) return;
  // Offline: queue the score and replay it on reconnect (offlineQueue.ts).
  if (!isOnline()) {
    enqueue('submit_score', args);
    return;
  }
  try {
    await submitScoreNow(args);
  } catch (err) {
    if (isNetworkApiError(err)) enqueue('submit_score', args);
  }
}

registerRunner('submit_score', async (payload) => {
  const args = payload as Parameters<typeof submitScoreNow>[0] | null;
  if (!args || typeof args.packId !== 'string') return;
  await submitScoreNow(args); // a network error re-queues it; 404 no_profile is dropped
});

async function submitScoreNow(args: {
  packId: string;
  score: number;
  moves: number;
  durationMs: number;
}): Promise<void> {
  if (!isApiConfigured() || !getAccessToken()) return;
  // The API derives the username server-side, blocks banned users, and bounds the
  // metrics so the board can't be forged.
  await api('/leaderboard', { method: 'POST', body: args, auth: 'user' });
}
