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
  /** Open the steal window — the non-picking team may now answer. */
  broadcastStealOpen: () => void;
}

export function useOnlineHost(args: {
  served: Served | null;
  answerRevealed: boolean;
  gameOver: boolean;
  matchOver: boolean;
  winner: TeamId | null;
  hideLetters: boolean;
  teamNames: { A: string; B: string };
  teamColors: { A: string; B: string };
  picker: TeamId;
  timerSeconds: number;
  board: { owners: (TeamId | null)[]; size: number; turn: TeamId | null };
}): OnlineHostState {
  const { served, answerRevealed, gameOver, matchOver, winner, hideLetters, teamNames, teamColors, picker, timerSeconds, board } =
    args;

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

  const namesRef = useRef(teamNames);
  namesRef.current = teamNames;
  const colorsRef = useRef(teamColors);
  colorsRef.current = teamColors;
  const pickerRef = useRef(picker);
  pickerRef.current = picker;
  const timerRef = useRef(timerSeconds);
  timerRef.current = timerSeconds;
  const boardRef = useRef(board);
  boardRef.current = board;
  // Cells where the host has opened the steal window — re-sent on reconnect.
  const stealOpenCells = useRef<Set<number>>(new Set());
  // Absolute host-clock deadlines (epoch ms) for the active question + steal
  // window, so a reconnecting phone resumes the SAME countdown instead of
  // restarting from the full duration. Cleared when the question changes.
  const deadlineRef = useRef<number | null>(null);
  const stealDeadlineRef = useRef<number | null>(null);
  // True once the match engine is live (Game is mounted) → re-announced to any
  // (re)connecting phone so it always leaves the lobby into the game.
  const startedRef = useRef(false);

  const sendLabels = () => {
    lobbyRef.current
      ?.broadcast({
        type: 'team_labels',
        A: namesRef.current.A,
        B: namesRef.current.B,
        aColor: colorsRef.current.A,
        bColor: colorsRef.current.B,
      })
      .catch(() => {});
  };
  const sendBoard = () => {
    const b = boardRef.current;
    lobbyRef.current
      ?.broadcast({
        type: 'board_state',
        owners: b.owners as (PlayerTeam | null)[],
        size: b.size,
        turn: b.turn as PlayerTeam | null,
        winner: (winnerRef.current as PlayerTeam | null) ?? null,
      })
      .catch(() => {});
  };
  const winnerRef = useRef(winner);
  winnerRef.current = winner;
  // Match/game completion, mirrored to refs so a reconnect after the match ends
  // lands on the final result screen instead of a stale question.
  const gameOverRef = useRef(gameOver);
  gameOverRef.current = gameOver;
  const matchOverRef = useRef(matchOver);
  matchOverRef.current = matchOver;

  const reBroadcastCurrent = useCallback(() => {
    const lobby = lobbyRef.current;
    if (!lobby) return;
    // Match already finished → send the board + final result so a reconnecting
    // phone goes straight to the "game over" screen, not back into a question.
    if (gameOverRef.current && matchOverRef.current) {
      sendBoard();
      lobby
        .broadcast({ type: 'game_over', winner: (winnerRef.current as PlayerTeam | null) ?? null })
        .catch(() => {});
      return;
    }
    // A (re)connecting phone must always leave the lobby into the live game — even
    // if it missed the original match_started (fire-and-forget, no replay).
    if (startedRef.current) lobby.broadcast({ type: 'match_started' }).catch(() => {});
    // Always (re)send the team labels + live board so a late/reconnecting phone
    // shows the right colours and mirrors the current board.
    sendLabels();
    sendBoard();
    const s = servedRef.current;
    if (!s) return;
    const q = s.question;
    lobby
      .broadcast({
        type: 'question_served',
        cell: s.cell,
        letter: s.letter,
        picker: pickerRef.current as PlayerTeam,
        timerSeconds: timerRef.current,
        // Re-send the SAME stored deadline so the phone resumes mid-countdown;
        // a fresh hostNow keeps the clock-offset estimate accurate.
        deadline: deadlineRef.current ?? undefined,
        hostNow: Date.now(),
        prompt: q.q,
        hideLetter: hideRef.current,
        audio: q.audio,
        video: q.video,
        image: q.image,
        youtube: q.youtube,
      })
      .catch(() => {});
    if (stealOpenCells.current.has(s.cell)) {
      lobby
        .broadcast({
          type: 'steal_open',
          cell: s.cell,
          stealSeconds: Math.ceil(timerRef.current / 2),
          deadline: stealDeadlineRef.current ?? undefined,
          hostNow: Date.now(),
        })
        .catch(() => {});
    }
    if (revealRef.current) {
      lobby.broadcast({ type: 'answer_revealed', answer: q.artist ? `${q.a} (by ${q.artist})` : q.a }).catch(() => {});
    }
  }, []);

  // Attach the answer + roster listeners once, routed so they always see fresh refs.
  useEffect(() => {
    const lobby = lobbyRef.current;
    if (!lobby || lobby.self.role !== 'host') return;
    lobby.setHandlers({
      onEvent: (event: LobbyEvent) => {
        // A reconnecting phone (back from a backgrounded tab) asks for state.
        if (event.type === 'request_state') {
          reBroadcastCurrent();
          return;
        }
        if (event.type !== 'answer_submitted') return;
        let bucket = byCell.current.get(event.cell);
        if (!bucket) {
          bucket = new Map();
          byCell.current.set(event.cell, bucket);
        }
        // Keep only the FIRST submission per player; Map preserves arrival order
        // so the host can see who answered first.
        if (!bucket.has(event.playerId)) {
          bucket.set(event.playerId, {
            playerId: event.playerId,
            playerName: event.playerName,
            team: event.team,
            answer: event.answer,
          });
          bump((v) => v + 1);
        }
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
    // Push the colour labels + board to anyone already connected on mount.
    sendLabels();
    sendBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, reBroadcastCurrent]);

  // Mirror the live board to phones whenever ownership / turn / winner changes.
  const boardKey = `${board.owners.join('')}|${board.turn}|${winner}`;
  useEffect(() => {
    if (!online) return;
    sendBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, boardKey]);

  // Broadcast a freshly served question (covers pick / skip / auto-skip uniformly).
  const lastServed = useRef<string | null>(null);
  useEffect(() => {
    const lobby = lobbyRef.current;
    if (!online || !lobby || !served) return;
    startedRef.current = true; // the match engine is live
    const key = `${served.cell}:${served.question.id}`;
    if (lastServed.current === key) return;
    lastServed.current = key;
    stealOpenCells.current.clear(); // a fresh question closes any prior steal window
    stealDeadlineRef.current = null;
    // The synced countdown's absolute end instant (host clock). Phones derive
    // their remaining time from this + the clock offset, so all devices agree.
    deadlineRef.current = timerSeconds > 0 ? Date.now() + timerSeconds * 1000 : null;
    const q = served.question;
    lobby
      .broadcast({
        type: 'question_served',
        cell: served.cell,
        letter: served.letter,
        picker: picker as PlayerTeam,
        timerSeconds,
        deadline: deadlineRef.current ?? undefined,
        hostNow: Date.now(),
        prompt: q.q,
        hideLetter: hideLetters,
        audio: q.audio,
        video: q.video,
        image: q.image,
        youtube: q.youtube,
      })
      .catch(() => {});
  }, [online, served, hideLetters, picker, timerSeconds]);

  // Broadcast the answer reveal once per served question.
  const revealedFor = useRef<string | null>(null);
  useEffect(() => {
    const lobby = lobbyRef.current;
    if (!online || !lobby || !served || !answerRevealed) return;
    const key = `${served.cell}:${served.question.id}`;
    if (revealedFor.current === key) return;
    revealedFor.current = key;
    const ans = served.question.artist
      ? `${served.question.a} (by ${served.question.artist})`
      : served.question.a;
    lobby.broadcast({ type: 'answer_revealed', answer: ans }).catch(() => {});
  }, [online, served, answerRevealed]);

  // Broadcast game results. Each finished GAME fires `game_won` (players award XP
  // per game in a best-of-N series); the MATCH end additionally fires `game_over`
  // (→ the players' final result screen). In a single-game match both fire.
  const sentGameOver = useRef(false);
  useEffect(() => {
    const lobby = lobbyRef.current;
    if (!online || !lobby) return;
    if (gameOver && !sentGameOver.current) {
      sentGameOver.current = true;
      deadlineRef.current = null; // stop the synced countdown on the phones
      lobby
        .broadcast({ type: 'game_won', winner: (winner as PlayerTeam | null) ?? null, matchOver })
        .catch(() => {});
      if (matchOver) {
        lobby.broadcast({ type: 'game_over', winner: (winner as PlayerTeam | null) ?? null }).catch(() => {});
      }
    }
    if (!gameOver) sentGameOver.current = false; // re-arm for the next game in a series
  }, [online, gameOver, matchOver, winner]);

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

  const broadcastStealOpen = useCallback(() => {
    const lobby = lobbyRef.current;
    const s = servedRef.current;
    if (!s) return;
    stealOpenCells.current.add(s.cell);
    const stealSeconds = Math.ceil(timerRef.current / 2);
    stealDeadlineRef.current = stealSeconds > 0 ? Date.now() + stealSeconds * 1000 : null;
    if (!online || !lobby) return;
    lobby
      .broadcast({
        type: 'steal_open',
        cell: s.cell,
        stealSeconds,
        deadline: stealDeadlineRef.current ?? undefined,
        hostNow: Date.now(),
      })
      .catch(() => {});
  }, [online]);

  const submissions = served ? [...(byCell.current.get(served.cell)?.values() ?? [])] : [];

  return { online, submissions, broadcastAdjudicated, broadcastStealOpen };
}
