import { motion } from 'motion/react';
import { useState } from 'react';
import { PACKS, packById } from '../content';
import { totalQuestions } from '../core/packs';
import { CategoryMenu } from '../components/CategoryMenu';
import { Logo, Wordmark } from '../components/Logo';
import { SettingsModal } from '../components/SettingsModal';
import { play } from '../services/audio';
import { remaining } from '../state/progress';
import { resumeSavedGame, useStore } from '../state/store';

// Regional packs use a real (bundled) flag image — flag EMOJIS (🇧🇭) render as
// "BH"/"SA"/"AE" letter placeholders on Windows/many browsers.
const PACK_FLAG: Record<string, string> = { bahrain: 'bh', 'saudi-arabia': 'sa', uae: 'ae' };

const TOTAL_QUESTIONS = PACKS.reduce((sum, p) => sum + totalQuestions(p), 0);

export function Home() {
  const { state, dispatch, hasSavedGame } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const selectedPack = packById(state.setup.packId);
  const total = totalQuestions(selectedPack);
  const left = remaining(selectedPack.id, total);

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
          one races left&nbsp;↔&nbsp;right, the other top&nbsp;↕&nbsp;bottom. Block, build, and lock it in.
        </motion.p>

        {/* Category picker: a single button that opens the full searchable menu. */}
        <div className="cat-picker">
          <span className="cat-picker-label">Category</span>
          <button
            className="cat-picker-btn"
            data-testid="open-categories"
            onClick={() => {
              play('tap');
              setShowCategories(true);
            }}
          >
            {PACK_FLAG[selectedPack.id] ? (
              <img className="cat-picker-flag" src={`/flags/${PACK_FLAG[selectedPack.id]}.svg`} alt="" aria-hidden="true" draggable={false} />
            ) : (
              <span className="cat-picker-emoji">{selectedPack.emoji}</span>
            )}
            <span className="cat-picker-text">
              <span className="cat-picker-name">{selectedPack.name}</span>
              <span className="cat-picker-meta">
                {selectedPack.difficulty} · {total} questions{left < total ? ` · ↻ ${left} left` : ''}
              </span>
            </span>
            <span className="cat-picker-chev" aria-hidden="true">⌄</span>
          </button>
          <span className="cat-picker-hint">{PACKS.length} categories · {TOTAL_QUESTIONS.toLocaleString()} questions — tap to browse &amp; search</span>
        </div>

        <div className="hero-cta">
          {/* Play is the primary forward action — kept on top so the most
              important CTA is the most prominent on every screen size. The
              Resume affordance sits underneath as a secondary "↻ Continue"
              option when a saved game exists. (Earlier the order was
              flipped and Resume used a `⏵` glyph that read as a back arrow
              on some devices — confusing.) */}
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
          {hasSavedGame && (
            <button
              className="btn btn-secondary"
              data-testid="resume-game"
              onClick={() => {
                play('pick');
                resumeSavedGame(dispatch);
              }}
            >
              ↻ Resume saved game
            </button>
          )}
        </div>
      </section>

      <footer className="home-foot">
        <span>Best on a TV or tablet · colorblind-safe · keyboard friendly</span>
      </footer>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showCategories && (
        <CategoryMenu
          selectedPack={selectedPack.id}
          onSelect={(id) => dispatch({ type: 'UPDATE_SETUP', patch: { packId: id } })}
          onClose={() => setShowCategories(false)}
        />
      )}
    </div>
  );
}
