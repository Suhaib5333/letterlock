import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { play } from '../services/audio';

/**
 * One-stop auth dialog:
 *  - Signed-out: shows the "Sign in with Google" CTA.
 *  - Signed in but no username yet: forces a username claim before the user
 *    can close the dialog (the global leaderboard keys scores by username,
 *    so we don't have a useful identity without one).
 *  - Signed in + has username: shows the profile + sign-out button.
 */
export function AuthModal({ onClose }: { onClose: () => void }) {
  const { user, profile, loading, signInWithGoogle, signOut, refreshProfile } = useAuth();
  const needsUsername = !!user && !profile;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-scrim"
        data-testid="auth-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={needsUsername ? undefined : onClose}
      >
        <motion.div
          className="modal auth-dialog"
          role="dialog"
          aria-label="Sign in"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.92, y: 18, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        >
          {loading ? (
            <p className="go-sub">Loading…</p>
          ) : !user ? (
            <SignInView onSignInGoogle={signInWithGoogle} onClose={onClose} />
          ) : needsUsername ? (
            <UsernameView userId={user.id} onClaimed={refreshProfile} />
          ) : (
            <ProfileView
              username={profile!.username}
              email={user.email}
              onSignOut={() => {
                signOut();
                onClose();
              }}
              onClose={onClose}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SignInView({
  onSignInGoogle,
  onClose,
}: {
  onSignInGoogle: () => Promise<void>;
  onClose: () => void;
}) {
  return (
    <>
      <h2>Sign in</h2>
      <p className="go-sub">
        Save your scores, get on the global leaderboard, and host online matches with phones as
        buzzers.
      </p>
      <div className="auth-actions">
        <button
          className="btn btn-primary btn-lg block google-signin"
          data-testid="signin-google"
          onClick={() => {
            play('pick');
            onSignInGoogle();
          }}
        >
          <span className="g-mark" aria-hidden="true">
            G
          </span>{' '}
          Continue with Google
        </button>
        <button className="btn btn-ghost" data-testid="auth-cancel" onClick={onClose}>
          Skip — play locally
        </button>
      </div>
    </>
  );
}

function UsernameView({ userId, onClaimed }: { userId: string; onClaimed: () => void }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'taken' | 'ok' | 'invalid'>('idle');
  const [busy, setBusy] = useState(false);
  const valid = /^[a-z0-9_]{3,20}$/.test(name);

  // Live availability check (debounced).
  useEffect(() => {
    if (!name) return setStatus('idle');
    if (!valid) return setStatus('invalid');
    setStatus('checking');
    const t = setTimeout(async () => {
      if (!supabase) return;
      const { data } = await supabase.rpc('username_available', { name });
      setStatus(data === true ? 'ok' : 'taken');
    }, 350);
    return () => clearTimeout(t);
  }, [name, valid]);

  const submit = async () => {
    if (!supabase || status !== 'ok' || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .insert({ id: userId, username: name });
    setBusy(false);
    if (!error) onClaimed();
  };

  return (
    <>
      <h2>Choose a username</h2>
      <p className="go-sub">
        3–20 characters, lowercase letters, digits, and underscores. This is how you'll appear on
        the leaderboard.
      </p>
      <input
        type="text"
        className="auth-input"
        data-testid="username-input"
        placeholder="e.g. honeybadger42"
        value={name}
        autoFocus
        maxLength={20}
        onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && status === 'ok') submit();
        }}
      />
      <div className="auth-hint" data-testid="username-status" data-status={status}>
        {status === 'idle' && <>Pick one to continue.</>}
        {status === 'checking' && <>Checking…</>}
        {status === 'invalid' && (
          <>Use 3–20 lowercase letters, digits, and underscores only.</>
        )}
        {status === 'taken' && <>That username is already taken.</>}
        {status === 'ok' && <>✓ Available</>}
      </div>
      <button
        className="btn btn-primary btn-lg block"
        data-testid="username-claim"
        disabled={status !== 'ok' || busy}
        onClick={submit}
      >
        {busy ? 'Claiming…' : 'Claim username'}
      </button>
    </>
  );
}

function ProfileView({
  username,
  email,
  onSignOut,
  onClose,
}: {
  username: string;
  email: string | undefined;
  onSignOut: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <h2>Signed in</h2>
      <p className="auth-username" data-testid="auth-username">
        @{username}
      </p>
      {email && <p className="go-sub">{email}</p>}
      <div className="auth-actions">
        <button className="btn btn-secondary" data-testid="signout" onClick={onSignOut}>
          Sign out
        </button>
        <button className="btn btn-primary" data-testid="auth-done" onClick={onClose}>
          Done
        </button>
      </div>
    </>
  );
}
