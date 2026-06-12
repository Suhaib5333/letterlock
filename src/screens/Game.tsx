import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Board } from '../components/Board';
import { HostPad } from '../components/HostPad';
import { QuestionCard } from '../components/QuestionCard';
import { Scoreboard } from '../components/Scoreboard';
import { Timer } from '../components/Timer';
import type { TeamId } from '../core/models';
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
  const lastPulse = useRef(0);
  const [blockToast, setBlockToast] = useState(false);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [pieDismissed, setPieDismissed] = useState(false);

  // Reset the dismiss flag once the swap window closes (so a new game can offer it).
  useEffect(() => {
    if (!canPieSwap) setPieDismissed(false);
  }, [canPieSwap]);

  // Hero-moment audio + haptics driven by the reducer's pulse counter.
  useEffect(() => {
    if (ui.pulse === lastPulse.current) return;
    lastPulse.current = ui.pulse;
    if (ui.gameOver && game.winner) {
      play('win');
      haptic(40);
      if (!reducedMotion) fireConfetti(game.winner, teams[game.winner].colorId);
      clearSavedGame();
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
        <Scoreboard teams={teams} game={game} series={series} mode={MODE_LABEL[opts.mode]} />
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
              <button
                className="switch-turn-btn"
                data-testid="switch-turn"
                aria-label="Switch turn to the other team"
                title="Manually switch whose turn it is (host intervention)"
                onClick={() => {
                  play('swap');
                  dispatch({ type: 'SWITCH_TURN' });
                }}
              >
                ⇄<span className="switch-label"> switch</span>
              </button>
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
                    active
                    pickerName={teams[picker].name}
                    otherName={teams[other].name}
                  />
                )}
                <QuestionCard
                  served={ui.served!}
                  answerRevealed={ui.answerRevealed}
                  picker={picker}
                  teams={teams}
                  hideLetter={hideLetters}
                  tts={state.settings.tts}
                  canSkip={ui.skipsUsed < 1}
                  repeated={ui.repeated}
                  onReveal={() => dispatch({ type: 'REVEAL_ANSWER' })}
                  onSkip={() => dispatch({ type: 'SKIP_QUESTION' })}
                />
                <HostPad
                  teams={teams}
                  picker={picker}
                  canSteal={state.settings.adjudicationStyle === 'structured'}
                  answerRevealed={ui.answerRevealed}
                  canUndo={canUndo}
                  onAward={(team) => {
                    const stolen = team !== picker;
                    play(stolen ? 'steal' : 'claim');
                    dispatch({ type: 'ADJUDICATE', team });
                  }}
                  onNoOne={() => {
                    play('pass');
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
                  className="btn btn-secondary"
                  data-testid="exit-cancel"
                  autoFocus
                  onClick={() => {
                    play('tap');
                    setConfirmingExit(false);
                  }}
                >
                  ‹ Keep playing
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
    </div>
  );
}
