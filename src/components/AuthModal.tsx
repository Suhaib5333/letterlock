import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/auth';
import { useModalDismiss } from '../lib/useModalDismiss';
import { supabase } from '../lib/supabase';
import { play } from '../services/audio';
import { RankBar } from './RankBadge';
import { canPrestige } from '../core/progression';
import { prestigeUp } from '../lib/progressionClient';

// Names nobody may take — mirrors is_reserved_username() in migration 0009. The
// server is the source of truth; this is just for instant client feedback.
const RESERVED = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'moderator', 'mod',
  'staff', 'official', 'letterlock', 'null', 'undefined', 'everyone', 'anonymous',
]);
const isReserved = (name: string) => RESERVED.has(name.toLowerCase());

/**
 * One-stop auth dialog:
 *  - Signed-out: shows the "Sign in with Google" CTA.
 *  - Signed in but no username yet: forces a username claim before the user
 *    can close the dialog (the global leaderboard keys scores by username,
 *    so we don't have a useful identity without one).
 *  - Signed in + has username: shows the profile + sign-out button.
 */
export function AuthModal({ onClose }: { onClose: () => void }) {
  const {
    user,
    profile,
    loading,
    profileLoading,
    profileChecked,
    signInWithGoogle,
    signInWithEmail,
    verifyEmailOtp,
    signOut,
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
  // Only gate on the username AFTER the profile fetch RESOLVES — otherwise an
  // existing user briefly sees the "choose a username" view on every sign-in.
  const needsUsername = !!user && profileChecked && !profile;
  const dialogRef = useRef<HTMLDivElement>(null);
  // The username-claim gate is mandatory — don't let Escape dismiss it.
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
              onSignInEmail={signInWithEmail}
              onVerifyOtp={verifyEmailOtp}
              onClose={onClose}
              initialError={redirectError}
            />
          ) : !profile && profileLoading ? (
            <p className="go-sub">Loading your profile…</p>
          ) : needsUsername ? (
            <UsernameView userId={user.id} onClaimed={refreshProfile} />
          ) : (
            <ProfileView
              username={profile!.username}
              usernameChangedAt={profile!.username_changed_at ?? null}
              email={user.email}
              level={profile!.level ?? 1}
              prestige={profile!.prestige ?? 0}
              xp={profile!.xp ?? 0}
              onUpdated={refreshProfile}
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
  onSignInEmail,
  onVerifyOtp,
  onClose,
  initialError,
}: {
  onSignInGoogle: () => Promise<{ ok: boolean; error?: string }>;
  onSignInEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  onVerifyOtp: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
  initialError?: string | null;
}) {
  // Two-step: email → 6-digit code (mirrors palmandplate admin flow).
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | 'verify' | 'resend' | null>(null);
  const [error, setError] = useState<string | null>(
    initialError ? `Google sign-in failed: ${initialError}` : null,
  );
  const [cooldown, setCooldown] = useState(0);

  // Resend cooldown — 60s after every send (Supabase rate-limits anyway).
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
    setBusy(null);
    if (!res.ok) setError(res.error ?? 'Google sign-in failed.');
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

  // Supabase OTPs are project-configurable 6–10 digits. We treat anything
  // 6+ as valid client-side and let supabase.auth.verifyOtp decide for sure.
  const codeReady = /^\d{6,10}$/.test(code);

  const handleVerify = async () => {
    if (!codeReady) return;
    play('pick');
    setError(null);
    setBusy('verify');
    const res = await onVerifyOtp(email, code);
    setBusy(null);
    if (!res.ok) setError(res.error ?? 'That code is wrong or expired.');
    // On success, the AuthProvider session listener kicks in and the modal
    // re-renders to the username-claim view automatically.
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
            We sent a 6-digit code to <strong>{email}</strong>. It's good for 60 minutes.
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
                placeholder="Paste your code"
                // 10 is Supabase's maximum OTP length. The frontend handles
                // 6–10 because mailer_otp_length is project-configurable.
                maxLength={10}
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setCode(v);
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
            Skip — play locally
          </button>
        )}
      </div>
    </>
  );
}

function UsernameView({ userId, onClaimed }: { userId: string; onClaimed: () => void }) {
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
    setClaimError(null);
    const { error } = await supabase
      .from('profiles')
      .insert({ id: userId, username: name });
    setBusy(false);
    if (!error) {
      onClaimed();
      return;
    }
    // 23505 = unique_violation → someone claimed it between the availability
    // check and now (TOCTOU). Re-flag it as taken; otherwise show the raw error.
    if (error.code === '23505' || /duplicate|unique/i.test(error.message)) {
      setStatus('taken');
      setClaimError('That username was just taken — pick another.');
    } else {
      setClaimError(error.message || 'Could not claim that username. Try again.');
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

// Usernames may be changed at most once every 30 days (mirrors the server-side
// limit in migration 0009). Kept here only to drive proactive UI; the DB is the
// source of truth that actually enforces it.
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
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [prestiging, setPrestiging] = useState(false);
  const [name, setName] = useState(username);
  const [status, setStatus] = useState<'idle' | 'checking' | 'taken' | 'ok' | 'invalid'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    const t = setTimeout(async () => {
      if (!supabase) return;
      const { data } = await supabase.rpc('username_available', { name });
      setStatus(data === true ? 'ok' : 'taken');
    }, 350);
    return () => clearTimeout(t);
  }, [name, valid, editing, unchanged]);

  const save = async () => {
    if (!supabase || status !== 'ok' || busy) return;
    setBusy(true);
    setError(null);
    // change_username (migration 0009) enforces the once-per-30-days limit +
    // uniqueness + format server-side and returns a structured result. On success
    // it cascades to this user's leaderboard rows via sync_leaderboard_username
    // (migration 0005), keyed by user_id, so existing scores show the new name.
    const { data, error: e } = await supabase.rpc('change_username', { p_name: name });
    setBusy(false);
    const row = Array.isArray(data) ? data[0] : data;
    if (!e && row?.ok) {
      setEditing(false);
      onUpdated();
      return;
    }
    const code = row?.error as string | undefined;
    if (code === 'taken') {
      setStatus('taken');
      setError('That username was just taken — pick another.');
    } else if (code === 'too_soon') {
      const when = row?.next_allowed_at ? formatDate(new Date(row.next_allowed_at)) : 'later';
      setError(`You can only change your username once a month. Next change available on ${when}.`);
    } else if (code === 'reserved') {
      setError('That username is reserved — pick another.');
    } else if (code === 'invalid') {
      setError('Use 3–20 lowercase letters, digits, and underscores.');
    } else {
      setError(e?.message || 'Could not update username. Try again.');
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
          {prestiging ? 'Prestiging…' : '⭐ Prestige — reset to Level 1, gain a star'}
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
      </div>
    </>
  );
}
