import { CHARADE_IMAGE_SLUGS } from './charadesImageManifest';

/**
 * Charades secret-prompt images are BUNDLED (public/charades/<packId>/<slug>.webp),
 * fetched once at build time by scripts/genimages.mjs from licensed sources
 * (Pixabay Content License, Wikimedia Commons PD/CC0/CC BY/CC BY-SA, Openverse
 * CC0/PDM) and credited in public/charades/<packId>/credits.json (LAUNCH_PLAN D9).
 * A prompt without a reviewed image stays WORD-ONLY: no `image` field at all, so
 * the QR page and the card never hit a broken URL.
 */
export function charadeSlug(answer: string): string {
  return answer
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const SETS = new Map(Object.entries(CHARADE_IMAGE_SLUGS).map(([id, slugs]) => [id, new Set(slugs)]));

/** Same-origin path of the bundled image for this prompt, or undefined = word-only. */
export function charadeImage(packId: string, answer: string): string | undefined {
  const slug = charadeSlug(answer);
  return SETS.get(packId)?.has(slug) ? `/charades/${packId}/${slug}.webp` : undefined;
}
