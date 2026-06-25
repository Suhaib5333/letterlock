import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { PACKS, packById } from '../content';
import { totalQuestions } from '../core/packs';
import { AdminPanel } from '../components/AdminPanel';
import { AuthModal } from '../components/AuthModal';
import { CategoryMenu } from '../components/CategoryMenu';
import { FriendsModal } from '../components/FriendsModal';
import { Leaderboard } from '../components/Leaderboard';
import { Logo, Wordmark } from '../components/Logo';
import { PackEditor } from '../components/PackEditor';
import { RankBar } from '../components/RankBadge';
import { SettingsModal } from '../components/SettingsModal';
import { useAuth } from '../lib/auth';
import { hasDevSeam } from '../lib/devSeams';
import { subscribePendingRequests } from '../lib/friends';
import { isSupabaseConfigured } from '../lib/supabase';
import { play } from '../services/audio';
import { remaining, subscribeProgress } from '../state/progress';
import { resumeSavedGame, useStore } from '../state/store';

// Regional packs use a real (bundled) flag image — flag EMOJIS (🇧🇭) render as
// "BH"/"SA"/"AE" letter placeholders on Windows/many browsers.
const PACK_FLAG: Record<string, string> = { bahrain: 'bh', 'saudi-arabia': 'sa', uae: 'ae' };

const TOTAL_QUESTIONS = PACKS.reduce((sum, p) => sum + totalQuestions(p), 0);

export function Home() {
  const { state, dispatch, hasSavedGame } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPackEditor, setShowPackEditor] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const { user, profile, profileLoading, loading: authLoading, isAdmin } = useAuth();
  // First-time login (Google OR email) must ALWAYS land on the username claim —
  // even after a Google redirect lands here with the auth modal closed. Once the
  // profile fetch settles and there's still no profile, force the dialog open
  // (AuthModal then shows the mandatory "Choose a username" step).
  const needsUsername = !!user && !profile && !profileLoading && !authLoading;
  // Dev/QA seam: `?__devscreens=1` surfaces the admin + pack-editor buttons even
  // when signed-out so their responsive layout can be checked. Gated to local
  // dev/test hosts (devSeams.ts) — inert in production. (Admin RPCs enforce role
  // server-side regardless, so this never grants real admin power.)
  const devScreens = hasDevSeam('__devscreens');
  // Re-render when question progress changes (e.g. async DB hydration on sign-in,
  // or a guest reset) so the "N unique left" badge stays accurate.
  const [, setProgressTick] = useState(0);
  useEffect(() => subscribeProgress(() => setProgressTick((t) => t + 1)), []);
  // Force the username claim open for a brand-new account.
  useEffect(() => {
    if (needsUsername) setShowAuth(true);
  }, [needsUsername]);
  // Incoming friend-request count → a badge on the Friends button so requests
  // that arrived while away are visible right on the home screen.
  const [pendingReq, setPendingReq] = useState(0);
  useEffect(() => subscribePendingRequests(setPendingReq), []);
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
          {isSupabaseConfigured() && (
            <>
              <button
                className="btn btn-ghost"
                data-chip-label
                aria-label="Leaderboard"
                data-testid="open-leaderboard"
                onClick={() => setShowLeaderboard(true)}
              >
                🏆<span className="chip-text"> Leaderboard</span>
              </button>
              {(profile || devScreens) && (
                <button
                  className="btn btn-ghost has-badge"
                  data-chip-label
                  aria-label={pendingReq > 0 ? `Friends — ${pendingReq} pending request${pendingReq === 1 ? '' : 's'}` : 'Friends'}
                  data-testid="open-friends"
                  onClick={() => setShowFriends(true)}
                >
                  👥<span className="chip-text"> Friends</span>
                  {pendingReq > 0 && (
                    <span className="notif-badge" data-testid="friends-badge" aria-hidden="true">
                      {pendingReq > 9 ? '9+' : pendingReq}
                    </span>
                  )}
                </button>
              )}
              {(profile || devScreens) && (
                <button
                  className="btn btn-ghost"
                  data-chip-label
                  aria-label="My packs"
                  data-testid="open-pack-editor"
                  onClick={() => setShowPackEditor(true)}
                  title="Author your own question pack"
                >
                  📦<span className="chip-text"> My packs</span>
                </button>
              )}
              {(isAdmin || devScreens) && (
                <button
                  className="btn btn-ghost"
                  data-chip-label
                  aria-label="Admin dashboard"
                  data-testid="open-admin"
                  onClick={() => setShowAdmin(true)}
                >
                  🛠<span className="chip-text"> Admin</span>
                </button>
              )}
              <button
                className="btn btn-ghost"
                data-chip-label
                aria-label={profile ? `Account: ${profile.username}` : 'Sign in'}
                data-testid="open-auth"
                onClick={() => setShowAuth(true)}
              >
                👤<span className="chip-text"> {profile ? `@${profile.username}` : 'Sign in'}</span>
              </button>
            </>
          )}
          <button
            className="btn btn-ghost"
            data-chip-label
            aria-label="How to play"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'tutorial' })}
          >
            ❓<span className="chip-text"> How to play</span>
          </button>
          <button className="icon-btn" aria-label="Settings" data-testid="open-settings" onClick={() => setShowSettings(true)}>
            ⚙
          </button>
        </div>
      </header>

      {profile && (
        <div className="home-rank" data-testid="home-rank">
          <RankBar xp={profile.xp ?? 0} level={profile.level ?? 1} prestige={profile.prestige ?? 0} />
        </div>
      )}

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
              // Go through the mode picker so Couch vs Online is an explicit
              // choice — even when Supabase isn't configured the card is shown
              // (disabled) so people know the feature exists.
              dispatch({ type: 'SET_SCREEN', screen: 'mode-select' });
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
          {/* Sign-in CTA on the hero — the top-right button is easy to miss
              (especially on mobile where the row wraps onto two lines).
              Repeated here below Play so anyone landing on Home sees it
              immediately. Hidden once the user is signed in. */}
          {isSupabaseConfigured() && !profile && (
            <button
              className="btn btn-secondary"
              data-testid="hero-signin"
              onClick={() => {
                play('pick');
                setShowAuth(true);
              }}
            >
              🔐 Sign in with Google
            </button>
          )}
          {isSupabaseConfigured() && profile && (
            <span className="hero-signed" data-testid="hero-signed">
              ✓ Signed in as <strong>@{profile.username}</strong>
            </span>
          )}
        </div>
      </section>

      <footer className="home-foot">
        <span>Best on a TV or tablet · colorblind-safe · keyboard friendly</span>
      </footer>

      {/* Loud, dismiss-not-allowed warning on Home when the Supabase env vars
          are missing in the live build. Without this the auth/leaderboard
          features silently disappear — that's how a Cloudflare deploy that
          didn't carry over the env vars looked totally fine on localhost and
          totally broken on prod. Now there's a visible breadcrumb. */}
      {!isSupabaseConfigured() && (
        <div className="env-warning" data-testid="env-warning" role="alert">
          <strong>⚠ Online features disabled</strong>
          <span>
            VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set in this build.
            On Cloudflare Pages → Settings → Environment variables.
          </span>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showPackEditor && <PackEditor onClose={() => setShowPackEditor(false)} />}
      {showFriends && (
        <FriendsModal
          myName={profile?.username ?? 'player'}
          initialTab={pendingReq > 0 ? 'requests' : 'friends'}
          onClose={() => setShowFriends(false)}
        />
      )}
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
