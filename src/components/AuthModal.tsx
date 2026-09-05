import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { appleWebEnabled, useAuth } from '../lib/auth';
import { api, ApiError } from '../lib/api';
import { useModalDismiss } from '../lib/useModalDismiss';
import { play } from '../services/audio';
import { RankBar } from './RankBadge';
import { canPrestige } from '../core/progression';
import { prestigeUp } from '../lib/progressionClient';

// Names nobody may take. Mirrors RESERVED_USERNAMES in the API (me.service.ts);
// the server is the source of truth, this is just for instant client feedback.
const RESERVED = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'moderator', 'mod',
  'staff', 'official', 'letterlock', 'null', 'undefined', 'everyone', 'anonymous',
]);
const isReserved = (name: string) => RESERVED.has(name.toLowerCase());

/** GET /users/username-available?name= (public). Errors count as "taken" (safe default). */
async function usernameAvailable(name: string): Promise<boolean> {
  try {
    const r = await api<{ available: boolean }>(`/users/username-available?name=${encodeURIComponent(name)}`, { auth: 'none' });
    return r.available === true;
  } catch {
    return false;
  }
}

type Result = { ok: boolean; error?: string };

/**
 * One-stop auth dialog:
 *  - Signed-out: Google (+ Apple when configured) and the email-code flow.
 *  - Signed in but no username yet: forces a username claim before the user
 *    can close the dialog (the global leaderboard keys scores by username,
 *    so we don't have a useful identity without one).
 *  - Signed in + has username: profile, sign-out, and account deletion.
 */
export function AuthModal({ onClose }: { onClose: () => void }) {
  const {
    user,
    profile,
    loading,
    profileLoading,
    profileChecked,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    verifyEmailOtp,
    signOut,
    deleteAccount,
    refreshProfile,
    authRedirectError,
    clearAuthRedirectError,
  } = useAuth();
  // Show a failed OAuth round-trip's error once: seed the sign-in view with it,
  // then clear it from context so reopening the dialog later starts clean.
  const [redirectError] = useState(authRedirectError);
  useEffect(() => {
    if (authRedirectError) clearAuthRedirectError();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- consume once on mount
  }, []);
  // Only gate on the username AFTER the profile is known, otherwise an existing
  // user briefly sees the "choose a username" view on every sign-in.
  const needsUsername = !!user && profileChecked && !profile;
  const dialogRef = useRef<HTMLDivElement>(null);
  // The username-claim gate is mandatory: don't let Escape dismiss it.
  useModalDismiss(dialogRef, onClose, { closeOnEscape: !needsUsername });

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
          ref={dialogRef}
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
            <SignInView
              onSignInGoogle={signInWithGoogle}
              onSignInApple={signInWithApple}
              onSignInEmail={signInWithEmail}
              onVerifyOtp={verifyEmailOtp}
              onClose={onClose}
              initialError={redirectError}
            />
          ) : !profile && (profileLoading || !profileChecked) ? (
            // Covers BOTH an in-flight fetch and a not-yet-checked render, so this
            // never falls through to ProfileView with a null profile.
            <p className="go-sub">Loading your profile…</p>
          ) : needsUsername ? (
            <UsernameView onClaimed={refreshProfile} />
          ) : (
            <ProfileView
              username={profile!.username}
              usernameChangedAt={profile!.username_changed_at ?? null}
              email={user.email ?? undefined}
              level={profile!.level ?? 1}
              prestige={profile!.prestige ?? 0}
              xp={profile!.xp ?? 0}
              onUpdated={refreshProfile}
              onSignOut={() => {
                void signOut();
                onClose();
              }}
              onDelete={deleteAccount}
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
  onSignInApple,
  onSignInEmail,
  onVerifyOtp,
  onClose,
  initialError,
}: {
  onSignInGoogle: () => Promise<Result>;
  onSignInApple: () => Promise<Result>;
  onSignInEmail: (email: string) => Promise<Result>;
  onVerifyOtp: (email: string, code: string) => Promise<Result>;
  onClose: () => void;
  initialError?: string | null;
}) {
  // Two-step: email, then the 6-digit code.
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'google' | 'apple' | 'email' | 'verify' | 'resend' | null>(null);
  const [error, setError] = useState<string | null>(
    initialError ? `Google sign-in failed: ${initialError}` : null,
  );
  const [cooldown, setCooldown] = useState(0);

  // Resend cooldown: 60 s after every send (the API enforces the same lock).
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleGoogle = async () => {
    play('pick');
    setError(null);
    setBusy('google');
    const res = await onSignInGoogle();
    if (!res.ok) {
      setBusy(null);
      setError(res.error ?? 'Google sign-in failed.');
    }
    // On success the page navigates to the API's Google redirect.
  };

  const handleApple = async () => {
    play('pick');
    setError(null);
    setBusy('apple');
    const res = await onSignInApple();
    setBusy(null);
    if (!res.ok) setError(res.error ?? 'Apple sign-in failed.');
  };

  const sendEmail = async (kind: 'email' | 'resend') => {
    play('pick');
    setError(null);
    setBusy(kind);
    const res = await onSignInEmail(email);
    setBusy(null);
    if (res.ok) {
      setStep('code');
      setCooldown(60);
    } else {
      setError(res.error ?? 'Could not send the sign-in code.');
    }
  };

  const codeReady = /^\d{6}$/.test(code);

  const handleVerify = async () => {
    if (!codeReady) return;
    play('pick');
    setError(null);
    setBusy('verify');
    const res = await onVerifyOtp(email, code);
    setBusy(null);
    if (!res.ok) setError(res.error ?? 'That code is wrong or expired.');
    // On success the AuthProvider state updates and the modal re-renders to the
    // username-claim view (or the profile) automatically.
  };

  return (
    <>
      <h2>{step === 'email' ? 'Sign in' : 'Enter the code'}</h2>
      <p className="go-sub">
        {step === 'email' ? (
          <>
            Save your scores, get on the global leaderboard, and host party matches with phones as
            buzzers.
          </>
        ) : (
          <>
            We sent a 6-digit code to <strong>{email}</strong>. It's good for 10 minutes.
          </>
        )}
      </p>

      <div className="auth-actions">
        {step === 'email' ? (
          <>
            <button
              className="btn btn-primary btn-lg block google-signin"
              data-testid="signin-google"
              disabled={busy !== null}
              onClick={handleGoogle}
            >
              <span className="g-mark" aria-hidden="true">G</span>{' '}
              {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
            </button>

            {appleWebEnabled() && (
              <button
                className="btn btn-secondary btn-lg block apple-signin"
                data-testid="signin-apple"
                disabled={busy !== null}
                onClick={handleApple}
              >
                <span aria-hidden="true"></span> {busy === 'apple' ? 'Opening Apple…' : 'Sign in with Apple'}
              </button>
            )}

            <div className="auth-divider"><span>or sign in with email</span></div>

            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                className="auth-input"
                data-testid="signin-email-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email.trim()) sendEmail('email');
                }}
                autoComplete="email"
                autoFocus
                disabled={busy !== null}
              />
            </label>
            <button
              className="btn btn-secondary btn-lg block"
              data-testid="signin-email"
              disabled={!email.trim() || busy !== null}
              onClick={() => sendEmail('email')}
            >
              {busy === 'email' ? 'Sending…' : '✉ Send sign-in code'}
            </button>
          </>
        ) : (
          <>
            <label className="auth-field">
              <span>Code from email</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="auth-input auth-otp"
                data-testid="signin-otp-input"
                placeholder="6-digit code"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && codeReady) handleVerify();
                }}
                autoFocus
                disabled={busy === 'verify'}
              />
            </label>
            <button
              className="btn btn-primary btn-lg block"
              data-testid="signin-otp-verify"
              disabled={!codeReady || busy === 'verify'}
              onClick={handleVerify}
            >
              {busy === 'verify' ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <div className="auth-resend">
              <button
                type="button"
                className="auth-link"
                data-testid="signin-otp-resend"
                disabled={cooldown > 0 || busy !== null}
                onClick={() => sendEmail('resend')}
              >
                {busy === 'resend'
                  ? 'Sending…'
                  : cooldown > 0
                    ? `Resend code in ${cooldown}s`
                    : 'Didn’t get it? Resend code'}
              </button>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              data-testid="signin-otp-back"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            >
              ‹ Use a different email
            </button>
          </>
        )}

        {error && (
          <p className="auth-error" data-testid="auth-error" role="alert">{error}</p>
        )}

        {step === 'email' && (
          <button className="btn btn-ghost" data-testid="auth-cancel" onClick={onClose}>
            Skip, play locally
          </button>
        )}
      </div>
    </>
  );
}

function UsernameView({ onClaimed }: { onClaimed: () => void }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'taken' | 'ok' | 'invalid'>('idle');
  const [busy, setBusy] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const valid = /^[a-z0-9_]{3,20}$/.test(name);

  // Live availability check (debounced).
  useEffect(() => {
    if (!name) return setStatus('idle');
    if (!valid) return setStatus('invalid');
    if (isReserved(name)) return setStatus('taken');
    setStatus('checking');
    let cancelled = false;
    const t = setTimeout(async () => {
      const ok = await usernameAvailable(name);
      if (!cancelled) setStatus(ok ? 'ok' : 'taken');
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [name, valid]);

  const submit = async () => {
    if (status !== 'ok' || busy) return;
    setBusy(true);
    setClaimError(null);
    try {
      await api('/me/username', { method: 'POST', body: { username: name }, auth: 'user' });
      setBusy(false);
      onClaimed();
    } catch (e) {
      setBusy(false);
      // 409 taken = someone claimed it between the availability check and now.
      if (e instanceof ApiError && e.code === 'taken') {
        setStatus('taken');
        setClaimError('That username was just taken, pick another.');
      } else if (e instanceof ApiError && e.code === 'already_claimed') {
        onClaimed(); // a stale view: the profile already exists
      } else {
        setClaimError(e instanceof Error ? e.message : 'Could not claim that username. Try again.');
      }
    }
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
        onChange={(e) => {
          setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
          setClaimError(null);
        }}
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
      {claimError && (
        <p className="auth-error" data-testid="username-error" role="alert">
          {claimError}
        </p>
      )}
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

// Usernames may be changed at most once every 30 days (the API enforces it; this
// only drives the proactive UI).
const USERNAME_CHANGE_DAYS = 30;
function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function ProfileView({
  username,
  usernameChangedAt,
  email,
  level,
  prestige,
  xp,
  onUpdated,
  onSignOut,
  onDelete,
  onClose,
}: {
  username: string;
  usernameChangedAt: string | null;
  email: string | undefined;
  level: number;
  prestige: number;
  xp: number;
  onUpdated: () => void;
  onSignOut: () => void;
  onDelete: () => Promise<Result>;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [prestiging, setPrestiging] = useState(false);
  const [name, setName] = useState(username);
  const [status, setStatus] = useState<'idle' | 'checking' | 'taken' | 'ok' | 'invalid'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Account deletion: a two-step confirm inside the dialog (Apple 5.1.1(v), Play policy).
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const valid = /^[a-z0-9_]{3,20}$/.test(name);
  const unchanged = name === username;

  // When (if ever) the next change is allowed. The first change after claiming is
  // always free (usernameChangedAt is null until the first edit).
  const nextChangeAt = usernameChangedAt
    ? new Date(new Date(usernameChangedAt).getTime() + USERNAME_CHANGE_DAYS * 86400_000)
    : null;
  const inCooldown = !!nextChangeAt && nextChangeAt.getTime() > Date.now();

  // Live availability check (debounced), skipping the user's own current name.
  useEffect(() => {
    if (!editing) return;
    if (unchanged) return setStatus('idle');
    if (!valid) return setStatus('invalid');
    if (isReserved(name)) return setStatus('taken');
    setStatus('checking');
    let cancelled = false;
    const t = setTimeout(async () => {
      const ok = await usernameAvailable(name);
      if (!cancelled) setStatus(ok ? 'ok' : 'taken');
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [name, valid, editing, unchanged]);

  const save = async () => {
    if (status !== 'ok' || busy) return;
    setBusy(true);
    setError(null);
    // PUT /me/username enforces the once-per-30-days limit + uniqueness + format
    // server-side and cascades the new name to this user's leaderboard rows.
    try {
      await api('/me/username', { method: 'PUT', body: { username: name }, auth: 'user' });
      setBusy(false);
      setEditing(false);
      onUpdated();
    } catch (e) {
      setBusy(false);
      const code = e instanceof ApiError ? e.code : '';
      const next = e instanceof ApiError ? (e.body?.next_allowed_at as string | null | undefined) : null;
      if (code === 'taken') {
        setStatus('taken');
        setError('That username was just taken, pick another.');
      } else if (code === 'too_soon') {
        const when = next ? formatDate(new Date(next)) : 'later';
        setError(`You can only change your username once a month. Next change available on ${when}.`);
      } else if (code === 'reserved') {
        setError('That username is reserved, pick another.');
      } else if (code === 'invalid') {
        setError('Use 3–20 lowercase letters, digits, and underscores.');
      } else {
        setError(e instanceof Error ? e.message : 'Could not update username. Try again.');
      }
    }
  };

  if (editing) {
    return (
      <>
        <h2>Edit username</h2>
        <p className="go-sub">
          3–20 chars, lowercase letters/digits/underscores. You can change it{' '}
          <strong>once a month</strong>. Your leaderboard scores update automatically.
        </p>
        <input
          type="text"
          className="auth-input"
          data-testid="username-edit-input"
          value={name}
          autoFocus
          maxLength={20}
          onChange={(e) => {
            setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && status === 'ok') save();
          }}
        />
        <div className="auth-hint" data-testid="username-edit-status" data-status={status}>
          {unchanged && <>This is already your username.</>}
          {!unchanged && status === 'invalid' && <>Use 3–20 lowercase letters, digits, underscores.</>}
          {!unchanged && status === 'checking' && <>Checking…</>}
          {!unchanged && status === 'taken' && <>That username is already taken.</>}
          {!unchanged && status === 'ok' && <>✓ Available</>}
        </div>
        {error && (
          <p className="auth-error" data-testid="username-edit-error" role="alert">{error}</p>
        )}
        <div className="auth-actions">
          <button
            className="btn btn-primary btn-lg block"
            data-testid="username-save"
            disabled={status !== 'ok' || busy}
            onClick={save}
          >
            {busy ? 'Saving…' : 'Save username'}
          </button>
          <button
            className="btn btn-ghost"
            data-testid="username-edit-cancel"
            onClick={() => {
              setEditing(false);
              setName(username);
              setError(null);
              setStatus('idle');
            }}
          >
            Cancel
          </button>
        </div>
      </>
    );
  }

  if (confirmDelete) {
    return (
      <>
        <h2>Delete your account?</h2>
        <p className="go-sub">
          This permanently removes <strong>@{username}</strong>: your XP, level, friends, saved game,
          leaderboard scores and custom packs. It cannot be undone.
        </p>
        {error && (
          <p className="auth-error" data-testid="account-delete-error" role="alert">{error}</p>
        )}
        <div className="auth-actions">
          <button
            className="btn btn-primary btn-lg block btn-danger"
            data-testid="account-delete-confirm"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              setError(null);
              const r = await onDelete();
              setDeleting(false);
              if (r.ok) onClose();
              else setError(r.error ?? 'Could not delete the account. Try again.');
            }}
          >
            {deleting ? 'Deleting…' : 'Yes, delete my account'}
          </button>
          <button
            className="btn btn-ghost"
            data-testid="account-delete-cancel"
            disabled={deleting}
            onClick={() => {
              setConfirmDelete(false);
              setError(null);
            }}
          >
            Keep my account
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h2>Signed in</h2>
      <p className="auth-username" data-testid="auth-username">
        @{username}
      </p>
      {email && <p className="go-sub">{email}</p>}
      <RankBar xp={xp} level={level} prestige={prestige} />
      {canPrestige(prestige, level) && (
        <button
          className="btn btn-primary block"
          data-testid="prestige-btn"
          disabled={prestiging}
          onClick={async () => {
            play('win');
            setPrestiging(true);
            const r = await prestigeUp();
            setPrestiging(false);
            if (r) onUpdated();
          }}
        >
          {prestiging ? 'Prestiging…' : '⭐ Prestige: reset to Level 1, gain a star'}
        </button>
      )}
      {inCooldown && nextChangeAt && (
        <p className="go-sub" data-testid="username-cooldown">
          🔒 Username locked until <strong>{formatDate(nextChangeAt)}</strong> (one change per month).
        </p>
      )}
      <div className="auth-actions">
        <button
          className="btn btn-secondary"
          data-testid="username-edit"
          disabled={inCooldown}
          title={inCooldown && nextChangeAt ? `You can change it again on ${formatDate(nextChangeAt)}` : undefined}
          onClick={() => {
            if (inCooldown) return;
            play('pick');
            setName(username);
            setEditing(true);
          }}
        >
          ✎ Edit username
        </button>
        <button className="btn btn-secondary" data-testid="signout" onClick={onSignOut}>
          Sign out
        </button>
        <button className="btn btn-primary" data-testid="auth-done" onClick={onClose}>
          Done
        </button>
        <button
          type="button"
          className="auth-link auth-danger-link"
          data-testid="account-delete"
          onClick={() => {
            play('pick');
            setConfirmDelete(true);
          }}
        >
          Delete account
        </button>
      </div>
    </>
  );
}
