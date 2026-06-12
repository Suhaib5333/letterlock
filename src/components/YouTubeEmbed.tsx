import { useEffect, useRef } from 'react';

// Minimal typings for the YouTube IFrame Player API (loaded at runtime).
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement | string, opts: unknown) => { destroy?: () => void } };
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
 * Embeds a YouTube trailer via the IFrame Player API so we can detect when a video
 * is unplayable — onError codes 100 (not found), 101/150 (embedding disabled),
 * 5 (HTML5 error) — and a load-timeout (API blocked/offline). On any of those it
 * calls {@link onUnplayable} so the card can show a clean fallback + keep Skip/Reveal.
 * Uses the privacy-enhanced (no-cookie) host.
 */
export function YouTubeEmbed({ videoId, onUnplayable }: { videoId: string; onUnplayable: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let ready = false;
    let timeout = 0;
    let player: { destroy?: () => void } | null = null;

    loadApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT) return;
      const mount = document.createElement('div');
      hostRef.current.innerHTML = '';
      hostRef.current.appendChild(mount);
      player = new window.YT.Player(mount, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            ready = true;
          },
          onError: () => {
            if (!cancelled) onUnplayable();
          },
        },
      });
      // If the API never becomes ready (blocked/offline), fall back.
      timeout = window.setTimeout(() => {
        if (!cancelled && !ready) onUnplayable();
      }, 9000);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      try {
        player?.destroy?.();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div className="qcard-video-wrap">
      <div className="qcard-yt-host qcard-video" data-testid="qcard-youtube" ref={hostRef} />
    </div>
  );
}
