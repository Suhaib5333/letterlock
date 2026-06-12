import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { TeamConfig, TeamId } from '../core/models';
import { duckMusic, play, speak } from '../services/audio';
import type { Served } from '../state/types';
import { QrCode } from './QrCode';
import { YouTubeEmbed } from './YouTubeEmbed';

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
  repeated: boolean;
  onReveal: () => void;
  onSkip: () => void;
}

export function QuestionCard({
  served,
  answerRevealed,
  picker,
  teams,
  tts,
  hideLetter,
  canSkip,
  repeated,
  onReveal,
  onSkip,
}: Props) {
  const pickerTeam = teams[picker];
  const charade = served.question.category === 'charade';

  // Media clips are HOTLINKED previews (Deezer/iTunes/flagcdn/simpleicons) and can
  // fail to load (expired URL, region block, offline). Never let that strand the
  // game: on error we swap the broken player for a clean fallback + Retry, and the
  // Reveal/Skip buttons stay available so play always continues.
  const [mediaError, setMediaError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    setMediaError(false); // reset for each new question
  }, [served.question.id]);
  const retryMedia = () => {
    setMediaError(false);
    setReloadKey((k) => k + 1);
  };

  const ytUrl = served.question.youtube ? `https://www.youtube.com/watch?v=${served.question.youtube}` : null;
  const mediaFallback = (kind: string) => (
    <div className="qcard-media-error" data-testid="media-error">
      <span className="qcard-media-error-msg">🔇 This {kind} couldn’t load here (network, region, or embedding off).</span>
      <div className="qcard-media-error-actions">
        <button className="btn btn-secondary sm" data-testid="media-retry" onClick={retryMedia}>↻ Retry</button>
        {ytUrl && (
          <a className="btn btn-ghost sm" href={ytUrl} target="_blank" rel="noreferrer" data-testid="media-yt-link">
            ▸ Watch on YouTube
          </a>
        )}
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
      ) : (
        served.question.image &&
        (mediaError ? (
          mediaFallback('image')
        ) : (
          <div className="qcard-flag-wrap">
            <img
              key={`${served.question.id}-${reloadKey}`}
              className="qcard-flag"
              src={served.question.image}
              alt="Image to identify"
              draggable={false}
              onError={() => setMediaError(true)}
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
            onPlay={() => duckMusic(true)}
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
              onPlay={() => duckMusic(true)}
              onPause={() => duckMusic(false)}
              onEnded={() => duckMusic(false)}
              onError={() => setMediaError(true)}
            />
          </div>
        ))}

      {served.question.youtube &&
        (mediaError ? (
          mediaFallback('trailer')
        ) : (
          <YouTubeEmbed
            key={`${served.question.id}-${reloadKey}`}
            videoId={served.question.youtube}
            onUnplayable={() => setMediaError(true)}
          />
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
