import { useEffect, useRef, useState } from 'react';

// Minimal typings for the YouTube IFrame Player API (loaded at runtime).
type YTPlayer = { destroy?: () => void; playVideo?: () => void; seekTo?: (s: number, allow: boolean) => void };
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement | string, opts: unknown) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return apiPromise;
}

/**
 * Embeds a YouTube trailer for "guess the movie" WITHOUT giving the answer away.
 * YouTube otherwise reveals the title (player title bar + start overlay), the
 * thumbnail poster, and an end-screen with the title + related videos — all spoilers.
 * So we:
 *  • cover the player until the host taps Play (hides the giveaway poster/title),
 *  • mask the top title-bar strip (the title also flashes there on start/hover/pause),
 *  • disable fullscreen / keyboard / related videos / annotations,
 *  • re-cover when the trailer ENDS (hides the end-screen titles) with a Replay.
 * Playback is started by a real user gesture (the Play button) so sound works.
 * Uses the IFrame Player API so unplayable videos (onError 100/101/150 or a load
 * timeout) call {@link onUnplayable} → the card shows a clean fallback + Skip.
 */
export function YouTubeEmbed({ videoId, onUnplayable }: { videoId: string; onUnplayable: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [covered, setCovered] = useState(true); // hide the spoiler poster until Play
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let isReady = false;
    let timeout = 0;
    setReady(false);
    setCovered(true);
    setEnded(false);

    loadApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT) return;
      const mount = document.createElement('div');
      hostRef.current.innerHTML = '';
      hostRef.current.appendChild(mount);
      playerRef.current = new window.YT.Player(mount, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          rel: 0, // limit related videos at the end to the same channel
          modestbranding: 1,
          playsinline: 1,
          fs: 0, // no fullscreen → can't pop out to read the title
          iv_load_policy: 3, // hide annotations
          disablekb: 1,
          controls: 1,
        },
        events: {
          onReady: () => {
            isReady = true;
            if (!cancelled) setReady(true);
          },
          onStateChange: (e: { data: number }) => {
            // 0 = ENDED → re-cover so the end-screen (title + related) never shows.
            if (e.data === 0 && !cancelled) {
              setEnded(true);
              setCovered(true);
            }
          },
          onError: () => {
            if (!cancelled) onUnplayable();
          },
        },
      });
      timeout = window.setTimeout(() => {
        if (!cancelled && !isReady) onUnplayable();
      }, 9000);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const start = () => {
    try {
      if (ended) playerRef.current?.seekTo?.(0, true);
      playerRef.current?.playVideo?.();
    } catch {
      /* ignore */
    }
    setCovered(false);
    setEnded(false);
  };

  return (
    <div className="qcard-video-wrap">
      <div className="qcard-yt-stage">
        <div className="qcard-yt-host qcard-video" data-testid="qcard-youtube" ref={hostRef} />
        {/* Mask the title bar (top) — the title flashes there on start / hover / pause. */}
        <div className="qcard-yt-mask" aria-hidden="true" />
        {/* Spoiler cover: hides the poster/title until Play, and the end-screen after. */}
        {covered && (
          <button type="button" className="qcard-yt-cover" data-testid="qcard-yt-play" onClick={start} disabled={!ready}>
            <span className="qcard-yt-cover-icon">{!ready ? '…' : ended ? '↺' : '▶'}</span>
            <span className="qcard-yt-cover-text">{!ready ? 'Loading trailer…' : ended ? 'Replay trailer' : 'Play trailer'}</span>
            <span className="qcard-yt-cover-hint">Watch & guess — title hidden 🤫</span>
          </button>
        )}
      </div>
    </div>
  );
}
