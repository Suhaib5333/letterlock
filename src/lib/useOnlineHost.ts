import { useCallback, useEffect, useRef, useState } from 'react';
import type { TeamId } from '../core/models';
import type { Served } from '../state/types';
import type { LobbyEvent, PlayerTeam } from './lobby';

/**
 * Host-side glue for Online Mode. Couch Mode renders the very same <Game/> with
 * no lobby open, so every path here no-ops cleanly when `window.__lobby` is
 * absent or the local role isn't host.
 *
 * Responsibilities:
 *   • Broadcast the live match to player phones — question_served (on every
 *     pick/skip/auto-skip), answer_revealed, adjudicated, game_over.
 *   • Collect players' typed answers (answer_submitted) bucketed per board cell,
 *     so the host can read them before tapping ✅A / ✅B / ⬜ No-one.
 *
 * The lobby channel persists across LobbyHost → Setup → Game via window.__lobby;
 * we patch in our answer listener with setHandlers (no re-subscribe).
 */

export interface Submission {
  playerId: string;
  playerName: string;
  team: PlayerTeam;
  answer: string;
}

interface OnlineHostState {
  online: boolean;
  /** Submissions for the currently-served cell, newest-per-player, in arrival order. */
  submissions: Submission[];
  /** Broadcast a host ruling + clear that cell's collected answers. */
  broadcastAdjudicated: (winner: TeamId | null, cell: number) => void;
}

export function useOnlineHost(args: {
  served: Served | null;
  answerRevealed: boolean;
  gameOver: boolean;
  winner: TeamId | null;
  hideLetters: boolean;
}): OnlineHostState {
  const { served, answerRevealed, gameOver, winner, hideLetters } = args;

  // Resolve the lobby once. It only ever exists on the host's device.
  const lobbyRef = useRef<typeof window.__lobby>(undefined);
  if (lobbyRef.current === undefined) lobbyRef.current = window.__lobby;
  const online = !!lobbyRef.current && lobbyRef.current.self.role === 'host';

  // cell -> (playerId -> Submission). A ref for accumulation; `version` forces render.
  const byCell = useRef<Map<number, Map<string, Submission>>>(new Map());
  const [, bump] = useState(0);

  // Live snapshot of what players should currently see — so we can RE-broadcast
  // it to a late joiner / reconnecting phone (Realtime is fire-and-forget with no
  // replay, so a phone that missed the original message would otherwise be stuck).
  const servedRef = useRef<Served | null>(served);
  const revealRef = useRef(false);
  const hideRef = useRef(hideLetters);
  servedRef.current = served;
  revealRef.current = answerRevealed;
  hideRef.current = hideLetters;
  const knownPlayers = useRef<Set<string>>(new Set());

  const reBroadcastCurrent = useCallback(() => {
    const lobby = lobbyRef.current;
    const s = servedRef.current;
    if (!lobby || !s) return;
    const q = s.question;
    lobby
      .broadcast({
        type: 'question_served',
        cell: s.cell,
        letter: s.letter,
        prompt: q.q,
        hideLetter: hideRef.current,
        audio: q.audio,
        video: q.video,
        image: q.image,
        youtube: q.youtube,
      })
      .catch(() => {});
    if (revealRef.current) {
      lobby.broadcast({ type: 'answer_revealed', answer: q.a }).catch(() => {});
    }
  }, []);

  // Attach the answer + roster listeners once, routed so they always see fresh refs.
  useEffect(() => {
    const lobby = lobbyRef.current;
    if (!lobby || lobby.self.role !== 'host') return;
    lobby.setHandlers({
      onEvent: (event: LobbyEvent) => {
        if (event.type !== 'answer_submitted') return;
        let bucket = byCell.current.get(event.cell);
        if (!bucket) {
          bucket = new Map();
          byCell.current.set(event.cell, bucket);
        }
        bucket.set(event.playerId, {
          playerId: event.playerId,
          playerName: event.playerName,
          team: event.team,
          answer: event.answer,
        });
        bump((v) => v + 1);
      },
      // When a NEW player appears (first join or a reconnect/resubscribe), push
      // the current question to them so nobody is ever stranded on "waiting".
      onRoster: (players) => {
        let isNew = false;
        for (const p of players) {
          if (p.role === 'player' && !knownPlayers.current.has(p.id)) {
            knownPlayers.current.add(p.id);
            isNew = true;
          }
        }
        if (isNew) reBroadcastCurrent();
      },
    });
  }, [online, reBroadcastCurrent]);

  // Broadcast a freshly served question (covers pick / skip / auto-skip uniformly).
  const lastServed = useRef<string | null>(null);
  useEffect(() => {
    const lobby = lobbyRef.current;
    if (!online || !lobby || !served) return;
    const key = `${served.cell}:${served.question.id}`;
    if (lastServed.current === key) return;
    lastServed.current = key;
    const q = served.question;
    lobby
      .broadcast({
        type: 'question_served',
        cell: served.cell,
        letter: served.letter,
        prompt: q.q,
        hideLetter: hideLetters,
        audio: q.audio,
        video: q.video,
        image: q.image,
        youtube: q.youtube,
      })
      .catch(() => {});
  }, [online, served, hideLetters]);

  // Broadcast the answer reveal once per served question.
  const revealedFor = useRef<string | null>(null);
  useEffect(() => {
    const lobby = lobbyRef.current;
    if (!online || !lobby || !served || !answerRevealed) return;
    const key = `${served.cell}:${served.question.id}`;
    if (revealedFor.current === key) return;
    revealedFor.current = key;
    lobby.broadcast({ type: 'answer_revealed', answer: served.question.a }).catch(() => {});
  }, [online, served, answerRevealed]);

  // Broadcast game over once.
  const sentGameOver = useRef(false);
  useEffect(() => {
    const lobby = lobbyRef.current;
    if (!online || !lobby) return;
    if (gameOver && !sentGameOver.current) {
      sentGameOver.current = true;
      lobby.broadcast({ type: 'game_over', winner: (winner as PlayerTeam | null) ?? null }).catch(() => {});
    }
    if (!gameOver) sentGameOver.current = false; // re-arm for the next game in a series
  }, [online, gameOver, winner]);

  const broadcastAdjudicated = useCallback(
    (w: TeamId | null, cell: number) => {
      const lobby = lobbyRef.current;
      byCell.current.delete(cell); // a ruled cell's answers are done
      bump((v) => v + 1);
      if (!online || !lobby) return;
      lobby.broadcast({ type: 'adjudicated', winner: (w as PlayerTeam | null) ?? null, cell }).catch(() => {});
    },
    [online],
  );

  const submissions = served ? [...(byCell.current.get(served.cell)?.values() ?? [])] : [];

  return { online, submissions, broadcastAdjudicated };
}
