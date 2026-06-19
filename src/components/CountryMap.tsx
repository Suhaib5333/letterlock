import { useEffect, useState } from 'react';

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

export function CountryMap({ iso, onReady, onError, className = 'qcard-flag', testId }: Props) {
  const [markup, setMarkup] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setErrored(false);
    setMarkup(null);
    loadWorldSvg()
      .then((base) => {
        if (cancelled) return;
        // Inject the per-country highlight rule just before </svg>. A high-
        // specificity `#iso` rule overrides the default `.landxx` fill.
        const css = `<style>#${iso},.${iso}{fill:#ef4444!important;stroke:#b91c1c!important;stroke-width:0.8!important;}</style>`;
        setMarkup(base.replace('</svg>', `${css}</svg>`));
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

  if (errored) {
    // Let the existing media-error fallback in QuestionCard take over.
    return null;
  }
  if (!markup) {
    return <div className={`${className} qcard-map-loading`} aria-hidden="true" data-testid={testId} />;
  }
  // dangerouslySetInnerHTML is fine here: the markup is our own base SVG
  // plus a CSS rule built from an allowlisted iso pattern (we never write
  // user input into it).
  return (
    <div
      className={className}
      role="img"
      aria-label="World map with highlighted country"
      data-testid={testId}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
