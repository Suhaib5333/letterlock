import { useEffect, useState } from 'react';
import { PACKS } from '../content';

/**
 * "Image credits" (LAUNCH_PLAN D9): lists every bundled charades image with its
 * author, license and source, read at open time from public/charades/<packId>/credits.json
 * (written by scripts/genimages.mjs). Fetched lazily so the main bundle never grows
 * with ~1,100 credit rows; the same files ship inside the Capacitor bundle.
 */
interface Credit {
  slug: string;
  prompt: string;
  source: string;
  author?: string;
  license?: string;
  licenseUrl?: string;
  sourceUrl?: string;
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const charadesPacks = PACKS.filter((p) => /^charades/.test(p.id));

export function ImageCreditsLink() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <a
        href="#image-credits"
        data-testid="image-credits-link"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        Image credits
      </a>
      {open && <ImageCredits onClose={() => setOpen(false)} />}
    </>
  );
}

export function ImageCredits({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<Record<string, Credit[]> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all(
      charadesPacks.map(async (p) => {
        const res = await fetch(`${base}/charades/${p.id}/credits.json`);
        if (!res.ok) throw new Error(String(res.status));
        const list = (await res.json()) as Credit[];
        return [p.name, list.filter((c) => c.source !== 'word-only')] as const;
      }),
    )
      .then((pairs) => alive && setRows(Object.fromEntries(pairs)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const total = rows ? Object.values(rows).reduce((n, l) => n + l.length, 0) : 0;
  return (
    <div className="modal-scrim" onClick={onClose} data-testid="image-credits">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-credits-title"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(640px, 94vw)', fontSize: '0.85rem' }}
      >
        <div className="modal-head">
          <h2 id="image-credits-title">Image credits</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <p>
          Flags: public-domain SVGs. Logos: Simple Icons (CC0); all logos are trademarks of their owners,
          shown for identification only. Fonts: SIL Open Font License. Charades photos ({total}) come from
          Wikimedia Commons, Pixabay and Openverse under the licenses listed below, resized for the game.
        </p>
        {failed && <p>Credits could not be loaded right now.</p>}
        {!rows && !failed && <p>Loading…</p>}
        {rows &&
          Object.entries(rows).map(([name, list]) => (
            <details key={name} style={{ marginTop: 8 }}>
              <summary>
                {name} ({list.length})
              </summary>
              <ul style={{ paddingLeft: 18, lineHeight: 1.5 }}>
                {list.map((c) => (
                  <li key={c.slug}>
                    <b>{c.prompt}</b>: {c.author || 'unknown'},{' '}
                    {c.licenseUrl ? (
                      <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">
                        {c.license}
                      </a>
                    ) : (
                      c.license
                    )}
                    {c.sourceUrl && (
                      <>
                        {' '}
                        (<a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">source</a>)
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
      </div>
    </div>
  );
}
