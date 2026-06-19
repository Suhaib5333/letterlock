import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { TeamConfig, TeamId } from '../core/models';
import { duckMusic, play, speak } from '../services/audio';
import type { Served } from '../state/types';
import { CountryMap } from './CountryMap';
import { QrCode } from './QrCode';

/** URL the charade QR points to — opens the standalone secret-prompt page.
 *  Respects the deploy base path (root domain or a GitHub Pages subpath). */
function charadeUrl(name: string, image?: string, hint?: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = import.meta.env.BASE_URL || '/'; // '/' or e.g. '/letterlock/'
  const p = new URLSearchParams({ view: 'img', w: name });
  if (image) p.set('img', image);
  if (hint) p.set('h', hint);
  return `${origin}${base}?${p.toString()}`;
}

interface Props {
  served: Served;
  answerRevealed: boolean;
  picker: TeamId;
  teams: Record<TeamId, TeamConfig>;
  tts: boolean;
  hideLetter?: boolean;
  canSkip: boolean;
  canAutoSkip: boolean;
  repeated: boolean;
  onReveal: () => void;
  onSkip: () => void;
  onAutoSkip: () => void;
  onMediaPlay: () => void; // fired the first time a clip is played → starts the timer
}

export function QuestionCard({
  served,
  answerRevealed,
  picker,
  teams,
  tts,
  hideLetter,
  canSkip,
  canAutoSkip,
  repeated,
  onReveal,
  onSkip,
  onAutoSkip,
  onMediaPlay,
}: Props) {
  const pickerTeam = teams[picker];
  const charade = served.question.category === 'charade';

  // Media clips are HOTLINKED previews (Deezer/iTunes/flagcdn/simpleicons) and can
  // fail to load (expired URL, region block, offline). Never let that strand the
  // game: on error we swap the broken player for a clean fallback + Retry, and the
  // Reveal/Skip buttons stay available so play always continues.
  const [mediaError, setMediaError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setMediaError(false); // reset for each new question
  }, [served.question.id]);
  // The img element fires `onLoad` reliably when the asset finishes downloading, but
  // a CACHED image can already be `.complete` by the time React mounts and the onLoad
  // event may not refire. Catch that case here so the timer is never blocked waiting
  // for a load event that already happened.
  useEffect(() => {
    if (!served.question.image) return;
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) onMediaPlay();
  }, [served.question.id, reloadKey, served.question.image, onMediaPlay]);
  const retryMedia = () => {
    setMediaError(false);
    setReloadKey((k) => k + 1);
  };
  // When a clip is unreachable, AUTO-ADVANCE to a fresh question on its own (no manual
  // skip needed). A brief pause lets the player see why, then we move on. Capped by the
  // store (canAutoSkip) so a fully-broken pack can't loop — then the manual card stays.
  useEffect(() => {
    if (!mediaError || !canAutoSkip) return;
    const t = setTimeout(onAutoSkip, 1100);
    return () => clearTimeout(t);
  }, [mediaError, canAutoSkip, onAutoSkip]);

  const mediaFallback = (kind: string) =>
    canAutoSkip ? (
      // Auto-advancing: the game serves another question on its own.
      <div className="qcard-media-error" data-testid="media-error" data-auto="1">
        <span className="qcard-media-error-msg">
          🔇 This {kind} couldn’t load — <strong>finding another question…</strong>
        </span>
        <div className="qcard-media-error-actions">
          <span className="qcard-media-error-hint">Moving on automatically.</span>
        </div>
      </div>
    ) : (
      // Cap reached (lots of unreachable clips in a row) — fall back to manual controls.
      <div className="qcard-media-error" data-testid="media-error">
        <span className="qcard-media-error-msg">🔇 This {kind} couldn’t load here (network or region).</span>
        <div className="qcard-media-error-actions">
          <button className="btn btn-secondary sm" data-testid="media-retry" onClick={retryMedia}>↻ Retry</button>
          <span className="qcard-media-error-hint">You can still reveal the answer or skip.</span>
        </div>
      </div>
    );

  return (
    <motion.div
      className="qcard"
      data-testid="question-card"
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="qcard-top">
        <div className={`letter-badge team-${picker}`} aria-hidden="true">
          {charade ? '🎭' : hideLetter ? '🚩' : served.letter}
        </div>
        <div className="qcard-meta">
          <div className="qcard-picker">
            <span className={`dot team-${picker}`} /> {pickerTeam.name} picked
          </div>
          <div className="qcard-rule">
            {charade ? 'Charades — act it out!' : hideLetter ? 'Name the answer' : `Answer begins with “${served.letter}”`}
          </div>
        </div>
        {repeated && (
          <span className="repeat-badge" data-testid="repeat-badge" title="Every question for this pack has been seen — now repeating.">
            ↻ Repeat
          </span>
        )}
        {tts && (
          <button
            className="icon-btn"
            aria-label="Read question aloud"
            onClick={() => speak(served.question.q)}
          >
            🔊
          </button>
        )}
      </div>

      {charade ? (
        <div className="qcard-charade" data-testid="charade-qr">
          <QrCode value={charadeUrl(served.question.a, served.question.image, served.question.q)} size={132} />
          <div className="qcard-charade-text">
            <strong>📱 Scan to get your word</strong>
            <span>Only the acting player should look. Then act it out for your team — no talking!</span>
          </div>
        </div>
      ) : served.question.mapIso ? (
        mediaError ? (
          mediaFallback('map')
        ) : (
          <div className="qcard-flag-wrap">
            <CountryMap
              key={`${served.question.id}-${reloadKey}`}
              iso={served.question.mapIso}
              onReady={onMediaPlay}
              onError={() => {
                setMediaError(true);
                onMediaPlay();
              }}
              testId="qcard-map"
            />
          </div>
        )
      ) : (
        served.question.image &&
        (mediaError ? (
          mediaFallback('image')
        ) : (
          <div className="qcard-flag-wrap">
            <img
              ref={imgRef}
              key={`${served.question.id}-${reloadKey}`}
              className="qcard-flag"
              src={served.question.image}
              alt="Image to identify"
              draggable={false}
              onLoad={onMediaPlay}
              onError={() => {
                setMediaError(true);
                // Unblock the timer once the image is decided either way — the
                // fallback now occupies the slot, so the question can proceed.
                onMediaPlay();
              }}
            />
          </div>
        ))
      )}

      {served.question.audio &&
        (mediaError ? (
          mediaFallback('audio')
        ) : (
          <audio
            key={`${served.question.id}-${reloadKey}`}
            className="qcard-audio"
            data-testid="qcard-audio"
            src={served.question.audio}
            controls
            preload="auto"
            onPlay={() => {
              duckMusic(true);
              onMediaPlay();
            }}
            onPause={() => duckMusic(false)}
            onEnded={() => duckMusic(false)}
            onError={() => setMediaError(true)}
          />
        ))}

      {served.question.video &&
        (mediaError ? (
          mediaFallback('video')
        ) : (
          <div className="qcard-video-wrap">
            <video
              key={`${served.question.id}-${reloadKey}`}
              className="qcard-video"
              data-testid="qcard-video"
              src={served.question.video}
              controls
              playsInline
              preload="auto"
              onPlay={() => {
                duckMusic(true);
                onMediaPlay();
              }}
              onPause={() => duckMusic(false)}
              onEnded={() => duckMusic(false)}
              onError={() => setMediaError(true)}
            />
          </div>
        ))}

      <p className="qcard-q" data-testid="question-text">
        {served.question.q}
      </p>

      <div className="qcard-answer">
        {answerRevealed ? (
          <motion.div
            className="answer-reveal"
            data-testid="answer-text"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <span className="answer-label">Answer</span>
            <span className="answer-value">{served.question.a}</span>
            {charade && served.question.image && !mediaError && (
              <img className="answer-charade-img" src={served.question.image} alt={served.question.a} draggable={false} onError={() => setMediaError(true)} />
            )}
          </motion.div>
        ) : (
          <button
            className="btn btn-secondary"
            data-testid="reveal-answer"
            onClick={() => {
              play('reveal');
              onReveal();
            }}
          >
            Show answer
          </button>
        )}
        <button
          className="btn btn-ghost skip"
          data-testid="skip-question"
          onClick={onSkip}
          disabled={!canSkip}
          title={canSkip ? 'You may skip once per pick' : 'No skip left — one skip per pick'}
        >
          {canSkip ? '⏭ Skip question (1)' : '⏭ No skip left'}
        </button>
      </div>
    </motion.div>
  );
}
