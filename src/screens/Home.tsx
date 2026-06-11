import { motion } from 'motion/react';
import { useState } from 'react';
import { PACKS } from '../content';
import { answerableLetters, totalQuestions } from '../core/packs';
import { Logo, Wordmark } from '../components/Logo';
import { SettingsModal } from '../components/SettingsModal';
import { play } from '../services/audio';
import { remaining } from '../state/progress';
import { resumeSavedGame, useStore } from '../state/store';

export function Home() {
  const { state, dispatch, hasSavedGame } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const selectedPack = state.setup.packId;

  return (
    <div className="home">
      <header className="home-top">
        <div className="brand">
          <Logo size={44} />
          <Wordmark />
        </div>
        <div className="home-top-actions">
          <button className="btn btn-ghost" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'tutorial' })}>
            How to play
          </button>
          <button className="icon-btn" aria-label="Settings" data-testid="open-settings" onClick={() => setShowSettings(true)}>
            ⚙
          </button>
        </div>
      </header>

      <section className="hero">
        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          Claim the letters.
          <br />
          <span className="grad-text">Connect your edges.</span>
        </motion.h1>
        <motion.p
          className="hero-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          A fair, gorgeous reinvention of <em>Blockbusters</em>. Two teams battle on a honeycomb —
          one races left&nbsp;↔&nbsp;right, the other top&nbsp;↔&nbsp;bottom. Block, build, and lock it in.
        </motion.p>

        <div className="hero-cta">
          {hasSavedGame && (
            <button
              className="btn btn-secondary"
              data-testid="resume-game"
              onClick={() => {
                play('pick');
                resumeSavedGame(dispatch);
              }}
            >
              ⏵ Resume game
            </button>
          )}
          <button
            className="btn btn-primary btn-lg"
            data-testid="play-button"
            onClick={() => {
              play('pick');
              dispatch({ type: 'SET_SCREEN', screen: 'setup' });
            }}
          >
            Play ▸
          </button>
        </div>
      </section>

      <section className="packs">
        <div className="section-head">
          <h2>Question packs</h2>
          <span className="muted">
            {PACKS.length} packs ·{' '}
            {PACKS.reduce(
              (sum, p) => sum + answerableLetters(p).reduce((n, l) => n + p.letters[l].length, 0),
              0,
            ).toLocaleString()}{' '}
            questions
          </span>
        </div>
        <div className="pack-grid" data-testid="pack-grid">
          {PACKS.map((pack, i) => {
            const active = pack.id === selectedPack;
            const total = totalQuestions(pack);
            const left = remaining(pack.id, total);
            const seenSome = left < total;
            return (
              <motion.button
                key={pack.id}
                className={`pack-card ${active ? 'active' : ''}`}
                data-testid={`pack-${pack.id}`}
                style={{ '--accent': pack.accent } as React.CSSProperties}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
                whileHover={{ y: -4 }}
                onClick={() => {
                  play('tap');
                  dispatch({ type: 'UPDATE_SETUP', patch: { packId: pack.id } });
                }}
              >
                <div className="pack-emoji">{pack.emoji}</div>
                <div className="pack-body">
                  <div className="pack-name">{pack.name}</div>
                  <div className="pack-desc">{pack.description}</div>
                  <div className="pack-meta">
                    <span className="chip">{pack.difficulty}</span>
                    <span className="chip ghost">{total} questions</span>
                    {seenSome && (
                      <span className="chip ghost" data-testid={`pack-left-${pack.id}`} title="Unique questions left before this pack repeats">
                        ↻ {left} unique left
                      </span>
                    )}
                  </div>
                </div>
                {active && <div className="pack-check" aria-label="Selected">✓</div>}
              </motion.button>
            );
          })}
        </div>
      </section>

      <footer className="home-foot">
        <span>Best on a TV or tablet · colorblind-safe · keyboard friendly</span>
      </footer>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
