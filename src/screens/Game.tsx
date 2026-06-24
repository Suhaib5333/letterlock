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
import { awardXp } from '../lib/progressionClient';
import { XP } from '../core/progression';
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
  const { refreshProfile } = useAuth();
  const lastPulse = useRef(0);
  const matchStartedAt = useRef(Date.now());
  const submittedScore = useRef(false);
  const awardedGameOver = useRef(false);
  const [levelUp, setLevelUp] = useState<{ level: number; prestige: number } | null>(null);
  // Screenshot/QA seam: `?__leveluptest=1` previews the level-up celebration
  // (or `?__leveluptest=prestige` the prestige one). Optional `&lvl=N&prestige=P`
  // pick the exact tier/prestige to preview (used to capture every tier's art).
  // Inert in normal use.
  const levelUpParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
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
  // Online auto-grade: a "{Colour} 3-2-1" countdown before auto-awarding a
  // fuzzily-correct answer. null = no countdown running.
  const [autoAward, setAutoAward] = useState<{ team: TeamId; name: string; n: number } | null>(null);
  const autoAwardedKeys = useRef<Set<string>>(new Set());

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
    setAutoAward(null); // cancel any pending auto-award countdown
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
      // Award XP for winning a game (signed-in user only; no-ops for guests).
      // Once per game-over so a best-of-N awards PER GAME, not per re-render.
      // BUT: in Online Mode this screen is the HOST/arbiter, not a player — the
      // host must not earn XP for hosting. Players earn XP on their own phones
      // (PlayerController, per game). So skip the award when we're the host.
      const hostingOnline = !!window.__lobby && window.__lobby.self.role === 'host';
      if (!awardedGameOver.current && !hostingOnline) {
        awardedGameOver.current = true;
        awardXp(XP.WIN)
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
    board: { owners: game.owners, size: game.size, turn: game.turn },
  });
  // Test-only seam: `?__onlinepanel=1` force-renders the host answers panel with
  // sample submissions so the responsive/no-scroll checker can verify the ONLINE
  // in-game layout (which otherwise needs two live clients). Inert in normal use.
  const forceOnlinePanel =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('__onlinepanel');
  const showOnlineAnswers = online.online || forceOnlinePanel;
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

  // ── Online auto-grade: when a player's typed answer fuzzily matches the correct
  // one, start a "{Colour} 3-2-1" countdown, then auto-award with confetti. Fires
  // at most once per question (key-guarded) so a half-question undo lets the host
  // re-judge manually instead of instantly re-awarding the same answer.
  useEffect(() => {
    if (!online.online || !ui.served || !q || autoAward) return;
    const key = `${ui.served.cell}:${ui.served.question.id}`;
    if (autoAwardedKeys.current.has(key)) return;
    const hit = online.submissions.find((s) => isAnswerCorrect(s.answer, q.a));
    if (hit) {
      autoAwardedKeys.current.add(key);
      setAutoAward({ team: hit.team, name: teams[hit.team].name, n: 3 });
    }
  }, [online.online, online.submissions, q, ui.served, autoAward, teams]);

  // Countdown runner: 3 → 2 → 1 → award (+ confetti + broadcast).
  useEffect(() => {
    if (!autoAward) return;
    if (autoAward.n <= 0) {
      const team = autoAward.team;
      const cell = ui.selectedCell;
      setAutoAward(null);
      if (cell !== null) {
        play('claim');
        haptic(16);
        if (!reducedMotion) fireConfetti(team, teams[team].colorId);
        online.broadcastAdjudicated(team, cell);
        dispatch({ type: 'ADJUDICATE', team });
      }
      return;
    }
    const t = setTimeout(() => setAutoAward((a) => (a ? { ...a, n: a.n - 1 } : a)), 850);
    return () => clearTimeout(t);
  }, [autoAward, ui.selectedCell, teams, reducedMotion, online, dispatch]);

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

          {/* Online auto-grade countdown: "{Colour} … 3-2-1" before auto-awarding a
              correct answer. The host can cancel to judge manually instead. */}
          <AnimatePresence>
            {autoAward && (
              <motion.div
                className="auto-award"
                data-testid="auto-award"
                data-team={autoAward.team}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="auto-award-name" style={{ color: `var(--t${autoAward.team === 'A' ? 'a' : 'b'})` }}>
                  {autoAward.name} got it!
                </div>
                <div className="auto-award-count" key={autoAward.n}>{autoAward.n}</div>
                <button
                  className="btn btn-ghost sm"
                  data-testid="auto-award-cancel"
                  onClick={() => {
                    play('tap');
                    setAutoAward(null);
                  }}
                >
                  ✕ Cancel — I'll judge
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
                    // Online: when the picker's time runs out, open the steal
                    // window so the OTHER team's phones can answer.
                    onPhase={(p) => {
                      if (p === 'steal' && online.online) online.broadcastStealOpen();
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
                        {onlineSubs.map((s, i) => (
                          <li key={s.playerId} data-testid={`online-answer-${s.playerId}`}>
                            <span className="online-answer-rank" aria-hidden="true">
                              {i === 0 ? '⚡' : i + 1}
                            </span>
                            <span className="online-answer-dot" data-team={s.team} aria-hidden="true" />
                            <span className="online-answer-name">{s.playerName}</span>
                            <span className="online-answer-text">{s.answer}</span>
                            {i === 0 && <span className="online-answer-first">1st</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
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
