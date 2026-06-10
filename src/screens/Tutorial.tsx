import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Board } from '../components/Board';
import { createGame, reduce } from '../core/engine';
import type { GameEvent } from '../core/events';
import type { GameState } from '../core/models';
import { cellAt } from '../core/topology';
import { play } from '../services/audio';
import { useStore } from '../state/store';

const DEMO_SIZE = 4;
const DEMO_LETTERS = 'WORDPLAYGAMEHEXA'.split('');

function freshDemo(): GameState {
  return createGame({
    type: 'GameStarted',
    size: DEMO_SIZE,
    topology: 'hex',
    letters: DEMO_LETTERS,
    directions: { A: 'horizontal', B: 'vertical' },
    firstPicker: 'A',
    pieRuleEnabled: false,
  } as Extract<GameEvent, { type: 'GameStarted' }>);
}

const STEPS = [
  {
    title: 'Tap a hex to claim it',
    body: 'Each hex holds a letter. Answer a trivia question whose answer starts with that letter and the hex floods your colour. Try tapping one below.',
  },
  {
    title: 'Build a chain across the board',
    body: 'Blue connects LEFT ↔ RIGHT. Amber connects TOP ↕ BOTTOM. The board is a perfectly fair rhombus — both directions cross the same number of hexes.',
  },
  {
    title: 'Block to win',
    body: 'Because a hex belongs to only one team, claiming a hex on your opponent’s path cuts them off. Build your chain and break theirs. First to connect wins — a board can never draw.',
  },
];

export function Tutorial() {
  const { dispatch } = useStore();
  const [step, setStep] = useState(0);
  const [demo, setDemo] = useState<GameState>(() => freshDemo());

  // For step 2/3, pre-fill an illustrative near-winning blue chain.
  const display = useMemo<GameState>(() => {
    if (step === 0) return demo;
    let g = freshDemo();
    const blue = [cellAt(1, 0, DEMO_SIZE), cellAt(1, 1, DEMO_SIZE), cellAt(1, 2, DEMO_SIZE)];
    for (const c of blue) g = reduce(g, { type: 'HexClaimed', cell: c, team: 'A', stolen: false });
    if (step === 2) {
      g = reduce(g, { type: 'HexClaimed', cell: cellAt(0, 2, DEMO_SIZE), team: 'B', stolen: false });
      g = reduce(g, { type: 'HexClaimed', cell: cellAt(2, 1, DEMO_SIZE), team: 'B', stolen: false });
    }
    return g;
  }, [step, demo]);

  return (
    <div className="tutorial" data-testid="tutorial-screen">
      <header className="sub-head">
        <button className="btn btn-ghost" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}>
          ‹ Back
        </button>
        <h1>How to play</h1>
        <div />
      </header>

      <div className="tut-body">
        <div className="tut-board">
          <Board
            game={display}
            selectedCell={null}
            lastClaimCell={null}
            pickable={step === 0 && display.status === 'playing'}
            onPick={(cell) => {
              play('claim');
              setDemo((g) => reduce(g, { type: 'HexClaimed', cell, team: 'A', stolen: false }));
            }}
          />
        </div>

        <motion.div className="tut-text" key={step} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}>
          <div className="tut-step">
            {STEPS.map((_, i) => (
              <span key={i} className={`tut-dot ${i === step ? 'on' : ''}`} />
            ))}
          </div>
          <h2>{STEPS[step].title}</h2>
          <p>{STEPS[step].body}</p>
          <div className="tut-nav">
            {step > 0 && (
              <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
                ‹ Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                className="btn btn-primary"
                data-testid="tut-next"
                onClick={() => {
                  play('tap');
                  setStep((s) => s + 1);
                }}
              >
                Next ›
              </button>
            ) : (
              <button
                className="btn btn-primary"
                data-testid="tut-play"
                onClick={() => {
                  play('pick');
                  dispatch({ type: 'SET_SCREEN', screen: 'setup' });
                }}
              >
                Let’s play ▸
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
