import { useState } from 'react';
import { play } from '../services/audio';
import { useStore } from '../state/store';
import { useAuth } from '../lib/auth';

/**
 * Join an existing room by code. We use a URL param (`?room=CODE`) to hand off
 * to the PlayerController — that keeps the controller as a self-contained
 * page that works equally well from a QR scan or a copy-pasted link.
 */
export function LobbyJoin() {
  const { dispatch } = useStore();
  // Signed-in players join under their account username — never asked to type a
  // name. Guests still enter one. (The controller does the same on a QR scan.)
  const { profile } = useAuth();
  const accountName = profile?.username ?? null;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const effectiveName = (accountName ?? name).trim();
  const valid = normalized.length === 6 && effectiveName.length > 0;

  function submit() {
    if (!valid) return;
    play('pick');
    const params = new URLSearchParams();
    params.set('room', normalized);
    params.set('name', effectiveName.slice(0, 20));
    params.set('view', 'controller');
    window.location.search = '?' + params.toString();
  }

  return (
    <div className="lobby-join" data-testid="lobby-join">
      <header className="sub-head">
        <button
          className="btn btn-ghost"
          data-testid="join-back"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'mode-select' })}
        >
          ‹ Back
        </button>
        <div className="sub-head-title">
          <h1>Join a room</h1>
        </div>
        <div />
      </header>

      <div className="join-card">
        {accountName ? (
          <div className="join-as" data-testid="join-as">
            Joining as <strong>@{accountName}</strong>
          </div>
        ) : (
          <label className="join-field">
            <span>Your name</span>
            <input
              type="text"
              data-testid="join-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Suhaib"
              maxLength={20}
              autoComplete="off"
            />
          </label>
        )}
        <label className="join-field">
          <span>6-letter code</span>
          <input
            type="text"
            data-testid="join-code"
            inputMode="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="ABCDEF"
            maxLength={10}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontVariantNumeric: 'tabular-nums' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && valid) submit();
            }}
          />
        </label>
        {error && <p className="join-error">{error}</p>}
        <button
          className="btn btn-primary btn-lg block"
          data-testid="join-submit"
          disabled={!valid}
          onClick={submit}
        >
          Join room ▸
        </button>
      </div>
    </div>
  );
}
