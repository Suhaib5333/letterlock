import { useEffect, useRef, useState } from 'react';

/**
 * Renders the shared public-domain world map with one country highlighted.
 *
 * The base SVG (`/maps/world.svg`) is fetched ONCE and cached in a module-
 * level promise so subsequent renders are instant — every question in a
 * Maps pack shares the same ~850KB asset instead of shipping 200 copies.
 *
 * Highlighting is done by appending a tiny `<style>` rule to the cached SVG
 * markup, scoped by ISO 3166-1 alpha-2 code (lowercase) — the BlankMap-World
 * source tags each country's path with that id.
 */

let cache: Promise<string> | null = null;

function loadWorldSvg(): Promise<string> {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL || '/'}maps/world.svg`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('failed to load map'))))
      .catch((err) => {
        // Reset cache so a transient error can retry next mount.
        cache = null;
        throw err;
      });
  }
  return cache;
}

interface Props {
  iso: string; // lowercase ISO 3166-1 alpha-2 (e.g. 'fr', 'us')
  onReady?: () => void;
  onError?: () => void;
  className?: string;
  /** Test hook so a Playwright route() can synth an error path. */
  testId?: string;
}

// Padding around the country's bounding box, as a fraction of the larger
// bbox dimension. A higher value shows more surrounding context (continent
// neighbours), making it easier to recognise small countries.
const ZOOM_PAD = 1.4;
// World viewBox from the source SVG.
const WORLD_VB = { x: 0, y: 0, w: 2754, h: 1398 };
// Target aspect ratio of the rendered card (matches the .qcard-map CSS rule).
const CARD_ASPECT = 2754 / 1398;

export function CountryMap({ iso, onReady, onError, className = 'qcard-flag', testId }: Props) {
  const [markup, setMarkup] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setErrored(false);
    setMarkup(null);
    loadWorldSvg()
      .then((base) => {
        if (cancelled) return;
        // Inject the per-country highlight rule just before </svg>, AND strip
        // the source's fixed `width="2754" height="1398"` attributes so the
        // map scales to fit its container instead of overflowing the card
        // (the source dimensions were the reason the previous build showed
        // horizontal scrollbars on small screens).
        const css = `<style>#${iso},.${iso}{fill:#ef4444!important;stroke:#b91c1c!important;stroke-width:0.8!important;}</style>`;
        const responsive = base
          // CRITICAL: BlankMap-World ships a `<title>Country Name</title>`
          // tag inside every country path → browsers render the name as a
          // native tooltip on hover, giving the answer away. Strip them all.
          // Also drop the document <title> ("World Map") for symmetry.
          .replace(/<title[^>]*>[^<]*<\/title>/g, '')
          // Drop the source's fixed pixel dims so the map scales to its
          // container (no overflow / horizontal scrollbar regression).
          .replace(/\s(width|height)="[^"]+"/g, '')
          .replace(
            '<svg ',
            '<svg viewBox="0 0 2754 1398" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block;pointer-events:none" ',
          )
          .replace('</svg>', `${css}</svg>`);
        setMarkup(responsive);
        onReady?.();
      })
      .catch(() => {
        if (cancelled) return;
        setErrored(true);
        onError?.();
      });
    return () => {
      cancelled = true;
    };
  }, [iso, onReady, onError]);

  // Reset expanded when a new question loads.
  useEffect(() => {
    setExpanded(false);
  }, [iso]);

  // Close-on-Escape while the fullscreen overlay is open.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  // After the inline SVG mounts, retarget its viewBox to the bounding box of
  // just this country (plus surrounding context). This is the "zoom-to-fit"
  // step the player actually wants — without it the world map renders at
  // global scale and the highlighted country is a barely-visible dot.
  const zoomTo = (host: HTMLElement | null, fullscreen: boolean) => {
    if (!host) return;
    const svg = host.querySelector('svg');
    if (!svg) return;
    // Country paths in BlankMap-World can be split across multiple elements
    // (e.g. `fr`, `fr-`, `fr_` for territories). Combine all that match.
    const escapedIso = iso.replace(/[^a-z0-9-]/gi, '');
    const sel = `#${escapedIso}, [id^="${escapedIso}-"], [id^="${escapedIso}_"], .${escapedIso}`;
    const nodes = Array.from(svg.querySelectorAll<SVGGraphicsElement>(sel));
    if (nodes.length === 0) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      try {
        const b = n.getBBox();
        if (!isFinite(b.width) || b.width === 0) continue;
        if (b.x < minX) minX = b.x;
        if (b.y < minY) minY = b.y;
        if (b.x + b.width > maxX) maxX = b.x + b.width;
        if (b.y + b.height > maxY) maxY = b.y + b.height;
      } catch {
        // ignore
      }
    }
    if (!isFinite(minX)) return;
    const bw = maxX - minX;
    const bh = maxY - minY;
    // Slightly more padding in the small card; less in the fullscreen view
    // since the player has more room to see context.
    const padFactor = fullscreen ? 0.9 : ZOOM_PAD;
    const pad = Math.max(bw, bh) * padFactor;
    let vx = minX - pad;
    let vy = minY - pad;
    let vw = bw + pad * 2;
    let vh = bh + pad * 2;
    const aspect = fullscreen
      ? Math.max(0.5, Math.min(2.5, window.innerWidth / window.innerHeight))
      : CARD_ASPECT;
    const vbAspect = vw / vh;
    if (vbAspect < aspect) {
      const extra = vh * aspect - vw;
      vx -= extra / 2;
      vw += extra;
    } else if (vbAspect > aspect) {
      const extra = vw / aspect - vh;
      vy -= extra / 2;
      vh += extra;
    }
    if (vx < WORLD_VB.x) vx = WORLD_VB.x;
    if (vy < WORLD_VB.y) vy = WORLD_VB.y;
    if (vx + vw > WORLD_VB.x + WORLD_VB.w) vx = WORLD_VB.x + WORLD_VB.w - vw;
    if (vy + vh > WORLD_VB.y + WORLD_VB.h) vy = WORLD_VB.y + WORLD_VB.h - vh;
    svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  };

  useEffect(() => {
    zoomTo(containerRef.current, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markup, iso]);

  useEffect(() => {
    if (expanded) zoomTo(fullscreenRef.current, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, markup, iso]);

  if (errored) {
    // Let the existing media-error fallback in QuestionCard take over.
    return null;
  }
  if (!markup) {
    return <div className={`${className} qcard-map qcard-map-loading`} aria-hidden="true" data-testid={testId} />;
  }
  // dangerouslySetInnerHTML is fine here: the markup is our own base SVG
  // plus a CSS rule built from an allowlisted iso pattern (we never write
  // user input into it).
  return (
    <>
      <div
        className={`${className} qcard-map`}
        role="img"
        aria-label="World map with highlighted country — tap to zoom"
        data-testid={testId}
      >
        <button
          type="button"
          className="qcard-map-expand"
          data-testid="qcard-map-expand"
          aria-label="Zoom map to full screen"
          onClick={() => setExpanded(true)}
        >
          <div
            ref={containerRef}
            className="qcard-map-svg"
            dangerouslySetInnerHTML={{ __html: markup }}
          />
          <div className="qcard-map-overlay" aria-hidden="true">
            Name the highlighted country
          </div>
          <div className="qcard-map-hint" aria-hidden="true">
            ⤢ Tap to zoom
          </div>
        </button>
      </div>
      {expanded && (
        <div
          className="qcard-map-fs-scrim"
          data-testid="qcard-map-fullscreen"
          role="dialog"
          aria-modal="true"
          aria-label="Map fullscreen view"
          onClick={() => setExpanded(false)}
        >
          <div className="qcard-map-fs-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="qcard-map-fs-close"
              data-testid="qcard-map-fs-close"
              aria-label="Close fullscreen map"
              onClick={() => setExpanded(false)}
            >
              ✕
            </button>
            <div className="qcard-map-fs-overlay" aria-hidden="true">
              Name the highlighted country
            </div>
            <div
              ref={fullscreenRef}
              className="qcard-map-svg"
              dangerouslySetInnerHTML={{ __html: markup }}
            />
          </div>
        </div>
      )}
    </>
  );
}
