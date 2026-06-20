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
  const {
    user,
    profile,
    loading,
    signInWithGoogle,
    signInWithEmail,
    verifyEmailOtp,
    signOut,
    refreshProfile,
  } = useAuth();
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
            <SignInView
              onSignInGoogle={signInWithGoogle}
              onSignInEmail={signInWithEmail}
              onVerifyOtp={verifyEmailOtp}
              onClose={onClose}
            />
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
  onSignInEmail,
  onVerifyOtp,
  onClose,
}: {
  onSignInGoogle: () => Promise<{ ok: boolean; error?: string }>;
  onSignInEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  onVerifyOtp: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}) {
  // Two-step: email → 6-digit code (mirrors palmandplate admin flow).
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | 'verify' | 'resend' | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const handleVerify = async () => {
    if (code.length !== 6) return;
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
            Save your scores, get on the global leaderboard, and host online matches with phones as
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
              <span>6-digit code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="auth-input auth-otp"
                data-testid="signin-otp-input"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(v);
                  setError(null);
                  if (v.length === 6) {
                    // Auto-submit on full 6-digit entry (parity with palmandplate)
                    setTimeout(() => handleVerify(), 50);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && code.length === 6) handleVerify();
                }}
                autoFocus
                disabled={busy === 'verify'}
              />
            </label>
            <button
              className="btn btn-primary btn-lg block"
              data-testid="signin-otp-verify"
              disabled={code.length !== 6 || busy === 'verify'}
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
