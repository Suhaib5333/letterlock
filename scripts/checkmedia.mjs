// Verify EVERY media URL actually loads: audio (songs), video (TV clips), youtube
// (movie trailers), and local images/audio (flags, melodies). Reports dead items per
// pack so they can be pruned. Run:  npx vite-node scripts/checkmedia.mjs
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PACKS } from '../src/content/index.ts';
import { allQuestions } from '../src/core/packs.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');

const TIMEOUT = 12000;
async function reachable(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    // Range GET (1 byte) — works for media CDNs that reject HEAD.
    const res = await fetch(url, { headers: { Range: 'bytes=0-1' }, signal: ctrl.signal });
    if (res.status === 200 || res.status === 206) {
      const ct = res.headers.get('content-type') || '';
      return { ok: true, ct };
    }
    return { ok: false, status: res.status };
  } catch (e) {
    return { ok: false, status: e.name === 'AbortError' ? 'timeout' : 'error' };
  } finally {
    clearTimeout(t);
  }
}
async function ytOk(id) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${id}`, { signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}
function localOk(url) {
  // '/flags/bh.svg' -> public/flags/bh.svg
  const p = join(PUBLIC, url.replace(/^\//, ''));
  return existsSync(p);
}

const limit = 8;
async function mapLimit(items, fn) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

let totalDead = 0;
const deadByPack = {};
for (const pack of PACKS) {
  const qs = allQuestions(pack);
  const targets = [];
  for (const q of qs) {
    if (q.youtube) targets.push({ q, kind: 'youtube', url: q.youtube });
    else if (q.video) targets.push({ q, kind: 'video', url: q.video });
    else if (q.audio) targets.push({ q, kind: 'audio', url: q.audio });
    else if (q.image) targets.push({ q, kind: 'image', url: q.image });
  }
  if (targets.length === 0) continue;
  // Skip the huge remote sets unless explicitly requested (logos/charades use slow
  // CDNs and aren't the focus). Focus: clip/audio/flag packs.
  const SKIP = /logos|charades/.test(pack.id);
  if (SKIP && !process.env.ALL) {
    console.log(`⏭  ${pack.name} (${targets.length} remote — skipped; set ALL=1 to include)`);
    continue;
  }
  const results = await mapLimit(targets, async (t) => {
    if (t.kind === 'youtube') return { t, ok: await ytOk(t.url) };
    if (t.url.startsWith('/')) return { t, ok: localOk(t.url) };
    const r = await reachable(t.url);
    return { t, ok: r.ok, info: r };
  });
  const dead = results.filter((r) => !r.ok);
  totalDead += dead.length;
  deadByPack[pack.id] = dead.map((d) => ({ a: d.t.q.a, kind: d.t.kind, url: d.t.url, info: d.info }));
  const mark = dead.length === 0 ? '✅' : '❌';
  console.log(`${mark} ${pack.name.padEnd(26)} ${targets.length - dead.length}/${targets.length} ok` + (dead.length ? `  — ${dead.length} DEAD` : ''));
  for (const d of dead) console.log(`     ✗ ${d.t.kind} "${d.t.q.a}" ${JSON.stringify(d.info ?? '')}`);
}
console.log(`\nTotal dead media: ${totalDead}`);
process.exit(0);
