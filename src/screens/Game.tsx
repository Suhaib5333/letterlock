import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Board } from '../components/Board';
import { HostPad } from '../components/HostPad';
import { LevelUpOverlay } from '../components/LevelUpOverlay';
import { QuestionCard } from '../components/QuestionCard';
import { Scoreboard } from '../components/Scoreboard';
import { Timer } from '../components/Timer';
import { submitScore } from '../components/Leaderboard';
import type { TeamId } from '../core/models';
import { isAnswerCorrect } from '../core/fuzzyMatch';
import { useAuth } from '../lib/auth';
import { devSeamsEnabled, hasDevSeam } from '../lib/devSeams';
import { awardXp } from '../lib/progressionClient';
import { hostXpForResult } from '../core/progression';
import { useOnlineHost } from '../lib/useOnlineHost';
import { haptic, play } from '../services/audio';
import { colorById } from '../state/palette';
import { clearSavedGame, useStore } from '../state/store';

const MODE_LABEL: Record<string, string> = {
  single: 'Single game',
  bo3: 'Best of 3',
  bo5: 'Best of 5',
};

function fireConfetti(team: TeamId, colorId: string) {
  const c = colorById(colorId);
  const colors = [c.light, c.glow, '#ffffff'];
  void team;
  confetti({ particleCount: 140, spread: 78, origin: { y: 0.4 }, colors, scalar: 1.1 });
  setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0 }, colors }), 180);
  setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1 }, colors }), 320);
}

export function Game() {
  const { state, dispatch, canPieSwap } = useStore();
  const { game, opts, series, ui } = state;
  const teams = opts!.teams;
  const timer = state.setup.timer;
  const reducedMotion = state.settings.motion === 'reduced';
  // Gameplay style: 'party' = phones answer + auto-winner reveal; 'couch' = host
  // adjudicates on this screen (HostPad) and any linked phones are passive + earn
  // XP only. A lobby may be open in EITHER (party always; couch when the host
  // invited players for XP) — that's `online.online` below, distinct from this.
  const isParty = state.playMode === 'party';
  // Which team the host plays on in Couch Mode (drives the host's own XP); null =
  // "just hosting" (no host XP). Irrelevant in Party Mode.
  const hostTeam = state.setup.hostTeam;
  const { refreshProfile } = useAuth();
  const lastPulse = useRef(0);
  const matchStartedAt = useRef(Date.now());
  const submittedScore = useRef(false);
  const awardedGameOver = useRef(false);
  const [levelUp, setLevelUp] = useState<{ level: number; prestige: number } | null>(null);
  // Screenshot/QA seam: `?__leveluptest=1` previews the level-up celebration
  // (or `?__leveluptest=prestige` the prestige one). Optional `&lvl=N&prestige=P`
  // pick the exact tier/prestige to preview (used to capture every tier's art).
  // Gated to local dev/test hosts (devSeams.ts) — inert in production.
  const levelUpParams =
    devSeamsEnabled() && typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const levelUpTest = levelUpParams?.get('__leveluptest') ?? null;
  const levelUpTestLvl = Number(levelUpParams?.get('lvl')) || null;
  const levelUpTestPrestige = levelUpParams?.has('prestige') ? Number(levelUpParams.get('prestige')) || 0 : null;
  const [blockToast, setBlockToast] = useState(false);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [pieDismissed, setPieDismissed] = useState(false);
  const [clipPlayed, setClipPlayed] = useState(false);
  // Online: host gates the player-answers list behind a button (so the screen
  // doesn't reveal everyone's guesses until the host chooses to show them).
  const [showAnswers, setShowAnswers] = useState(false);

  // ── Party Mode answer flow ──────────────────────────────────────────────
  // The countdown runs in two windows: the PICKER answers first (main phase);
  // when their clock ends (timeout OR they lock in) the OTHER team's clock
  // starts (steal phase); when that ends a winner-reveal screen appears with a
  // 15s auto-continue. `timerPhase` mirrors the Timer; `endPhaseSignal` is
  // bumped to end a window early when a team locks their answer in.
  const [timerPhase, setTimerPhase] = useState<'main' | 'steal' | 'done'>('main');
  const [endPhaseSignal, setEndPhaseSignal] = useState(0);
  // The winner-reveal overlay (Party Mode only). `selection` is what will be
  // applied — pre-filled with the auto-detected winner, overridable by the host.
  const [reveal, setReveal] = useState<{ cell: number } | null>(null);
  const [revealSelection, setRevealSelection] = useState<TeamId | null>(null);
  const [revealCountdown, setRevealCountdown] = useState(15);
  const revealSelectionRef = useRef<TeamId | null>(null);
  revealSelectionRef.current = revealSelection;
  // Guard so each (cell, phase) bumps the early-end signal at most once.
  const phaseSignalRef = useRef<string>('');

  // Reset the dismiss flag once the swap window closes (so a new game can offer it).
  useEffect(() => {
    if (!canPieSwap) setPieDismissed(false);
  }, [canPieSwap]);

  // Re-arm the per-game XP award when a new game begins.
  useEffect(() => {
    if (!ui.gameOver) awardedGameOver.current = false;
  }, [ui.gameOver]);


  // Reset the "clip played" gate whenever a new question is served (so each
  // audio/video question waits for its own first play before the timer starts).
  const servedId = state.ui.served?.question.id;
  useEffect(() => {
    setClipPlayed(false);
    setShowAnswers(false); // re-hide player answers for each new question
    setTimerPhase('main'); // each new question starts in the picker's window
    setReveal(null); // close any leftover reveal overlay
  }, [servedId]);

  // Hero-moment audio + haptics driven by the reducer's pulse counter.
  useEffect(() => {
    if (ui.pulse === lastPulse.current) return;
    lastPulse.current = ui.pulse;
    if (ui.gameOver && game.winner) {
      play('win');
      haptic(40);
      if (!reducedMotion) fireConfetti(game.winner, teams[game.winner].colorId);
      clearSavedGame();
      // Push the match result to the global leaderboard. No-ops cleanly when
      // Supabase is unconfigured OR no user is signed in. Guard so a re-render
      // (StrictMode double-fire, pulse bump) doesn't double-submit.
      if (!submittedScore.current && opts) {
        submittedScore.current = true;
        submitScore({
          packId: opts.pack.id,
          score: (series[game.winner] ?? 0) + 1,
          moves: game.moveCount,
          durationMs: Date.now() - matchStartedAt.current,
        }).catch(() => {
          /* fail silent — never block the celebration */
        });
      }
      // Host XP — once per game-over (a best-of-N awards PER GAME, not per
      // re-render). In PARTY Mode this screen is the arbiter and earns nothing
      // (players score on their own phones). In COUCH Mode the host earns XP for
      // the team they chose to play on (full for a win, partial for a loss); a
      // "just hosting" host (hostTeam null) earns nothing. Any linked couch
      // players earn their own XP on their phones via the game_won broadcast.
      const hostAmount = isParty ? null : hostXpForResult(hostTeam, game.winner);
      if (!awardedGameOver.current && hostAmount !== null) {
        awardedGameOver.current = true;
        awardXp(hostAmount)
          .then((r) => {
            if (!r) return;
            void refreshProfile();
            if (r.leveled_up) setLevelUp({ level: r.level, prestige: r.prestige });
          })
          .catch(() => {});
      }
    } else if (ui.lastClaimCell !== null) {
      play(ui.blockHint ? 'block' : 'claim');
      haptic(ui.blockHint ? 22 : 12);
      if (ui.blockHint) {
        setBlockToast(true);
        const t = setTimeout(() => setBlockToast(false), 1200);
        return () => clearTimeout(t);
      }
    }
  }, [ui.pulse, ui.gameOver, ui.lastClaimCell, ui.blockHint, game.winner, reducedMotion]);

  if (!opts) return null;

  const picker = game.turn;
  const other: TeamId = picker === 'A' ? 'B' : 'A';
  const canUndo = state.log.length > 1;
  const inQuestion = ui.phase === 'question' && ui.served;
  const hideLetters = !!opts.pack.hideBoardLetters;

  // Online Mode: mirror the live match to player phones + collect their typed
  // answers. No-ops entirely in Couch Mode (no lobby channel open).
  // The match is over when the current game's win pushes a team to gamesNeeded
  // (the series score isn't incremented until "Continue", so add this game in).
  const matchOver = !!game.winner && ((series[game.winner] ?? 0) + 1) >= series.gamesNeeded;
  const online = useOnlineHost({
    served: ui.served,
    answerRevealed: ui.answerRevealed,
    gameOver: ui.gameOver,
    matchOver,
    winner: game.winner,
    hideLetters,
    teamNames: { A: teams.A.name, B: teams.B.name },
    teamColors: { A: colorById(teams.A.colorId).base, B: colorById(teams.B.colorId).base },
    picker,
    timerSeconds: timer,
    mode: state.playMode,
    board: { owners: game.owners, size: game.size, turn: game.turn },
  });
  // Test-only seam: `?__onlinepanel=1` force-renders the host answers panel with
  // sample submissions so the responsive/no-scroll checker can verify the ONLINE
  // in-game layout (which otherwise needs two live clients). Gated to local
  // dev/test hosts (devSeams.ts) — inert in production.
  const forceOnlinePanel = hasDevSeam('__onlinepanel');
  // The submitted-answers panel only applies in Party Mode (couch linked phones
  // never submit answers — they're passive XP earners).
  const showOnlineAnswers = (online.online && isParty) || forceOnlinePanel;
  const onlineSubs = online.online
    ? online.submissions
    : forceOnlinePanel
      ? [
          { playerId: 'm1', playerName: 'Alice', team: 'A' as const, answer: 'Quebec' },
          { playerId: 'm2', playerName: 'Mohammed', team: 'B' as const, answer: 'A long sample answer to test wrapping and clipping' },
          { playerId: 'm3', playerName: 'Sara', team: 'A' as const, answer: 'Copenhagen' },
        ]
      : [];
  // A media clip can fail to load (region/network); always allow Skip when the question
  // carries a clip so a broken clip can never strand the game.
  const q = ui.served?.question;
  const hasClip = !!(q && (q.image || q.audio || q.video || q.mapIso));
  // Media questions: the timer doesn't start until the asset is actually visible.
  // - Audio/video → first play (so watching/listening isn't on the clock).
  // - Image → first `onLoad` (so a slow/half-loaded image never burns the clock).
  //   If the image errors, the fallback shows AND the timer is allowed to start so the
  //   player isn't stranded with an indefinitely paused clock.
  const needsPlayToStart = !!(q && (q.audio || q.video || q.image || q.mapIso));
  const timerActive = !needsPlayToStart || clipPlayed;

  // ── Party Mode sequential answer + auto-winner reveal ───────────────────
  // Whose windows have produced an answer (the host buckets submissions/cell).
  // Party Mode only — Couch linked phones never submit answers.
  const pickerSubmitted = isParty && online.submissions.some((s) => s.team === picker);
  const otherSubmitted = isParty && online.submissions.some((s) => s.team === other);

  // Lock-in ends the current window early: picker locks → jump to the other
  // team's window; other locks → jump to "Time!" (the reveal). Each (cell,phase)
  // bumps once (ref-guarded).
  useEffect(() => {
    if (!isParty || !inQuestion || ui.selectedCell === null) return;
    const base = `${ui.selectedCell}`;
    if (timerPhase === 'main' && pickerSubmitted && phaseSignalRef.current !== `${base}:main`) {
      phaseSignalRef.current = `${base}:main`;
      setEndPhaseSignal((n) => n + 1);
    } else if (timerPhase === 'steal' && otherSubmitted && phaseSignalRef.current !== `${base}:steal`) {
      phaseSignalRef.current = `${base}:steal`;
      setEndPhaseSignal((n) => n + 1);
    }
  }, [isParty, inQuestion, ui.selectedCell, timerPhase, pickerSubmitted, otherSubmitted]);

  // The auto-detected winner = the first team (in arrival order) whose submitted
  // answer fuzzy-matches the real answer; null when nobody got it.
  const computeAutoWinner = (): TeamId | null => {
    if (!q) return null;
    for (const s of online.submissions) {
      if (isAnswerCorrect(s.answer, q.a)) return s.team as TeamId;
    }
    return null;
  };

  // When the second window ends ("Time!"), open the winner-reveal overlay:
  // reveal the answer to everyone + pre-select the auto-winner + start the 15s
  // auto-continue. Party Mode only — Couch Mode keeps the manual host pad.
  useEffect(() => {
    if (!isParty || timerPhase !== 'done' || reveal || !inQuestion || ui.selectedCell === null) return;
    dispatch({ type: 'REVEAL_ANSWER' });
    setRevealSelection(computeAutoWinner());
    setRevealCountdown(15);
    setReveal({ cell: ui.selectedCell });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isParty, timerPhase, reveal, inQuestion, ui.selectedCell]);

  // Apply the reveal's current selection (award the team, or "no one") and close.
  const applyReveal = (team: TeamId | null) => {
    const cell = reveal?.cell ?? ui.selectedCell;
    if (cell === null) return;
    if (team) {
      play('claim');
      if (!reducedMotion) fireConfetti(team, teams[team].colorId);
      online.broadcastAdjudicated(team, cell);
      dispatch({ type: 'ADJUDICATE', team });
    } else {
      play('pass');
      online.broadcastAdjudicated(null, cell);
      dispatch({ type: 'ADJUDICATE', team: null });
    }
    setReveal(null);
  };

  // The 15s auto-continue countdown — applies the current selection at zero.
  useEffect(() => {
    if (!reveal) return;
    if (revealCountdown <= 0) {
      applyReveal(revealSelectionRef.current);
      return;
    }
    const id = setTimeout(() => setRevealCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal, revealCountdown]);

  return (
    <div className="game" data-testid="game-screen">
      <header className="game-head">
        <button
          className="btn btn-ghost exit-btn"
          data-testid="exit-btn"
          aria-label="Exit match"
          onClick={() => {
            play('tap');
            setConfirmingExit(true);
          }}
        >
          ‹<span className="exit-label"> Exit</span>
        </button>
        <Scoreboard
          teams={teams}
          game={game}
          series={series}
          mode={MODE_LABEL[opts.mode]}
          pack={{ name: opts.pack.name, emoji: opts.pack.emoji }}
          canSwitch={game.status === 'playing' && ui.phase === 'pick'}
          onSwitchTurn={() => {
            play('swap');
            dispatch({ type: 'SWITCH_TURN' });
          }}
        />
        <div className="game-head-spacer" />
      </header>

      <div className="game-main">
        <div className="board-wrap" data-testid="board-wrap">
          <AnimatePresence>
            {blockToast && (
              <motion.div
                className="block-toast"
                data-testid="block-toast"
                initial={{ opacity: 0, scale: 0.6, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
              >
                🛡 BLOCK!
              </motion.div>
            )}
          </AnimatePresence>
          {/* Pie-rule prompt is an OVERLAY popup — it floats over the board and
              never reflows/shrinks it. Dismissable with ✕ (declines the swap). */}
          <AnimatePresence>
            {canPieSwap && ui.phase === 'pick' && !pieDismissed && (
              <motion.div
                className="pie-pop"
                data-testid="pie-banner"
                role="dialog"
                aria-label="Swap sides"
                initial={{ opacity: 0, y: -14, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 340, damping: 24 }}
              >
                <button
                  className="pie-pop-close"
                  data-testid="pie-dismiss"
                  aria-label="Keep my side"
                  onClick={() => {
                    play('tap');
                    setPieDismissed(true);
                  }}
                >
                  ✕
                </button>
                <div className="pie-pop-icon">⇄</div>
                <div className="pie-pop-body">
                  <strong>Swap sides?</strong>
                  <span>{teams[picker].name}, take over the opening hex instead of playing — neutralises the first-move advantage.</span>
                </div>
                <button
                  className="btn btn-primary sm"
                  data-testid="pie-swap"
                  onClick={() => {
                    play('steal');
                    dispatch({ type: 'PIE_SWAP' });
                  }}
                >
                  Swap sides
                </button>
              </motion.div>
            )}
          </AnimatePresence>


          <div className="board-stage">
            <Board
              game={game}
              selectedCell={ui.selectedCell}
              lastClaimCell={ui.lastClaimCell}
              hideLetters={hideLetters}
              pickable={game.status === 'playing' && ui.phase === 'pick'}
              onPick={(cell) => {
                play('pick');
                haptic(8);
                dispatch({ type: 'PICK_CELL', cell });
              }}
            />
          </div>

          {ui.phase === 'pick' && game.status === 'playing' && (
            <div className={`turn-banner team-${picker}`} data-testid="turn-banner">
              <span className="dot" />
              <span className="turn-label">
                <strong>{teams[picker].name}</strong> — pick a hex
              </span>
              <span className="turn-dir">
                connect {game.directions[picker] === 'horizontal' ? 'left ↔ right' : 'top ↕ bottom'}
              </span>
            </div>
          )}
        </div>

        <aside className="game-side">
          <AnimatePresence mode="wait">
            {inQuestion ? (
              <motion.div
                className="question-zone"
                key="q"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {timer > 0 && (
                  <Timer
                    seconds={timer}
                    // Stable across a skip (selectedCell + pulse don't change on
                    // skip) so the countdown CONTINUES; resets only on a new pick.
                    resetKey={`${ui.selectedCell}-${ui.pulse}`}
                    // For audio/video questions, hold the countdown until the clip is
                    // first played (so watching/listening isn't on the clock).
                    active={timerActive}
                    pickerName={teams[picker].name}
                    otherName={teams[other].name}
                    pickerColorId={teams[picker].colorId}
                    otherColorId={teams[other].colorId}
                    // Bumped by the lock-in effect to end a window the instant a
                    // team submits (Party Mode).
                    endPhaseSignal={endPhaseSignal}
                    // Mirror the phase locally (drives the colour + the reveal),
                    // and in Party Mode open the other team's window on the phones.
                    onPhase={(p) => {
                      setTimerPhase(p);
                      if (p === 'steal' && isParty) online.broadcastStealOpen();
                    }}
                  />
                )}
                <div className="qcard-scroll">
                  <QuestionCard
                    served={ui.served!}
                    answerRevealed={ui.answerRevealed}
                    picker={picker}
                    teams={teams}
                    hideLetter={hideLetters}
                    tts={state.settings.tts}
                    canSkip={ui.skipsUsed < 1 || hasClip}
                    canAutoSkip={ui.autoSkips < 12}
                    repeated={ui.repeated}
                    onReveal={() => dispatch({ type: 'REVEAL_ANSWER' })}
                    onSkip={() => dispatch({ type: 'SKIP_QUESTION' })}
                    onAutoSkip={() => dispatch({ type: 'AUTO_SKIP' })}
                    onMediaPlay={() => setClipPlayed(true)}
                  />
                </div>
                {showOnlineAnswers && (
                  <div className="online-answers" data-testid="online-answers">
                    <header className="online-answers-head">
                      <span>📱 Player answers</span>
                      <span className="online-answers-count">{onlineSubs.length}</span>
                    </header>
                    {onlineSubs.length === 0 ? (
                      <p className="online-answers-empty">Waiting for players to submit…</p>
                    ) : !showAnswers ? (
                      // Keep guesses hidden until the host chooses to reveal them.
                      <button
                        className="btn btn-secondary block online-answers-reveal"
                        data-testid="online-show-answers"
                        onClick={() => {
                          play('tap');
                          setShowAnswers(true);
                        }}
                      >
                        👁 Show {onlineSubs.length} answer{onlineSubs.length === 1 ? '' : 's'}
                      </button>
                    ) : (
                      <ul>
                        {onlineSubs.map((s, i) => {
                          // Auto-grade hint: mark each answer correct/wrong vs the
                          // real answer so the host can confirm at a glance, then
                          // tap the winning team to award + continue.
                          const correct = !!q && isAnswerCorrect(s.answer, q.a);
                          return (
                            <li
                              key={s.playerId}
                              data-testid={`online-answer-${s.playerId}`}
                              data-correct={correct ? 'yes' : 'no'}
                            >
                              <span className="online-answer-rank" aria-hidden="true">
                                {i === 0 ? '⚡' : i + 1}
                              </span>
                              <span className="online-answer-dot" data-team={s.team} aria-hidden="true" />
                              <span className="online-answer-name">{s.playerName}</span>
                              <span className="online-answer-text">{s.answer}</span>
                              <span className={`online-answer-grade ${correct ? 'ok' : 'no'}`} aria-hidden="true">
                                {correct ? '✓' : '✕'}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
                {/* Couch Mode (incl. couch with linked players): the host taps
                    the winner manually. Party Mode replaces this with the
                    auto-winner reveal overlay below. */}
                {!isParty && (
                <HostPad
                  teams={teams}
                  picker={picker}
                  canSteal={state.settings.adjudicationStyle === 'structured'}
                  answerRevealed={ui.answerRevealed}
                  canUndo={canUndo}
                  onAward={(team) => {
                    const stolen = team !== picker;
                    play(stolen ? 'steal' : 'claim');
                    if (!reducedMotion) fireConfetti(team, teams[team].colorId);
                    if (ui.selectedCell !== null) online.broadcastAdjudicated(team, ui.selectedCell);
                    dispatch({ type: 'ADJUDICATE', team });
                  }}
                  onNoOne={() => {
                    play('pass');
                    if (ui.selectedCell !== null) online.broadcastAdjudicated(null, ui.selectedCell);
                    dispatch({ type: 'ADJUDICATE', team: null });
                  }}
                  onUndo={() => {
                    play('tap');
                    dispatch({ type: 'UNDO' });
                  }}
                />
                )}
              </motion.div>
            ) : (
              <motion.div
                className="pick-help"
                key="help"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="pick-help-icon">⬡</div>
                <h3>Choose your hex</h3>
                <p>
                  Tap any unclaimed hex on the board. Advance your chain — or block your opponent.
                  A question for that letter appears here.
                </p>
                {canUndo && (
                  <button className="btn btn-ghost" data-testid="undo-pick" onClick={() => dispatch({ type: 'UNDO' })}>
                    ↩ Undo last move
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>

      <AnimatePresence>
        {confirmingExit && (
          <motion.div
            className="modal-scrim"
            data-testid="exit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmingExit(false)}
          >
            <motion.div
              className="modal exit-dialog"
              role="dialog"
              aria-label="Exit match"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            >
              <h2>Exit match?</h2>
              <p className="go-sub">Your progress is saved — you can resume from the home screen anytime.</p>
              <div className="exit-actions">
                <button
                  className="btn btn-secondary exit-keep"
                  data-testid="exit-cancel"
                  autoFocus
                  onClick={() => {
                    play('tap');
                    setConfirmingExit(false);
                  }}
                >
                  <span className="exit-keep-arrow" aria-hidden="true">‹</span>
                  <span>Keep playing</span>
                </button>
                <button
                  className="btn btn-primary"
                  data-testid="exit-confirm"
                  onClick={() => {
                    play('pass');
                    dispatch({ type: 'EXIT_HOME' });
                  }}
                >
                  Exit to home
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Party Mode winner reveal ──────────────────────────────────────
          When both teams' answer windows have closed, this shows the real
          answer + the auto-detected winner, with a 15-second auto-continue.
          The host can override the pick or hit Continue to apply it now. */}
      <AnimatePresence>
        {reveal && q && (
          <motion.div
            className="reveal-scrim"
            data-testid="party-reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="reveal-card"
              role="dialog"
              aria-label="Round result"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <div className="reveal-head">Time's up!</div>
              <div className="reveal-answer">
                <span className="reveal-answer-label">Answer</span>
                <strong data-testid="reveal-answer">{q.artist ? `${q.a} (by ${q.artist})` : q.a}</strong>
              </div>

              <div className="reveal-subs">
                {(['A', 'B'] as TeamId[]).map((t) => {
                  const sub = online.submissions.find((s) => s.team === t);
                  const correct = !!sub && isAnswerCorrect(sub.answer, q.a);
                  return (
                    <div className={`reveal-sub team-${t}`} key={t} data-testid={`reveal-sub-${t}`}>
                      <span className="reveal-sub-team">{teams[t].name}</span>
                      <span className="reveal-sub-answer">{sub ? sub.answer : '— no answer —'}</span>
                      <span className={`reveal-sub-grade ${correct ? 'ok' : 'no'}`} aria-hidden="true">
                        {sub ? (correct ? '✓' : '✕') : '·'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="reveal-winner" data-testid="reveal-winner">
                {revealSelection ? (
                  <>
                    <span className={`reveal-winner-dot team-${revealSelection}`} aria-hidden="true" />
                    <strong>{teams[revealSelection].name}</strong> takes this hex
                  </>
                ) : (
                  <>No winner — the hex stays open</>
                )}
              </div>

              <div className="reveal-pick">
                {(['A', 'B'] as TeamId[]).map((t) => (
                  <button
                    key={t}
                    className={`award team-${t} ${revealSelection === t ? 'selected' : ''}`}
                    data-testid={`reveal-pick-${t}`}
                    onClick={() => {
                      play('tap');
                      setRevealSelection(t);
                    }}
                  >
                    ✅ {teams[t].name}
                  </button>
                ))}
                <button
                  className={`award none ${revealSelection === null ? 'selected' : ''}`}
                  data-testid="reveal-pick-none"
                  onClick={() => {
                    play('tap');
                    setRevealSelection(null);
                  }}
                >
                  ⬜ No one
                </button>
              </div>

              <div className="reveal-countdown" data-testid="reveal-countdown">
                <div className="reveal-countdown-bar" style={{ transform: `scaleX(${revealCountdown / 15})` }} />
                <span>Auto-continues in {revealCountdown}s</span>
              </div>

              <button
                className="btn btn-primary btn-lg block"
                data-testid="reveal-continue"
                onClick={() => applyReveal(revealSelection)}
              >
                Continue ▸
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ui.gameOver && (
          <motion.div
            className="gameover-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            data-testid="game-over"
          >
            <motion.div
              className="gameover-card"
              initial={{ scale: 0.85, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ delay: 1.2, type: 'spring', stiffness: 260, damping: 22 }}
            >
              {game.winner ? (
                <>
                  <div className={`go-badge team-${game.winner}`}>{teams[game.winner].name}</div>
                  <h2>connects {game.directions[game.winner] === 'horizontal' ? 'left ↔ right' : 'top ↕ bottom'}!</h2>
                  <p className="go-sub">
                    In {game.moveCount} claims · {game.stats[game.winner].blocks} blocks
                  </p>
                </>
              ) : (
                <>
                  <h2>Drawn board</h2>
                  <p className="go-sub">Neither side connected — replay the game.</p>
                </>
              )}
              <button
                className="btn btn-primary btn-lg block"
                data-testid="continue-after-game"
                onClick={() => {
                  play('pick');
                  dispatch({ type: 'CONTINUE_AFTER_GAME' });
                }}
              >
                {series[game.winner ?? 'A'] + (game.winner ? 1 : 0) >= series.gamesNeeded
                  ? 'See result ▸'
                  : 'Next game ▸'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rank-up celebration (real level-ups; the ?__leveluptest seam previews it). */}
      {(levelUp || levelUpTest) && (
        <LevelUpOverlay
          kind={levelUpTest === 'prestige' ? 'prestige' : 'level'}
          level={levelUp?.level ?? levelUpTestLvl ?? 5}
          prestige={levelUp?.prestige ?? levelUpTestPrestige ?? (levelUpTest === 'prestige' ? 1 : 0)}
          reducedMotion={reducedMotion}
          onDone={() => setLevelUp(null)}
        />
      )}
    </div>
  );
}
