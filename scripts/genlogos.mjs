// Bundle the Simple Icons SVGs used by the "Guess the Logo" packs (LAUNCH_PLAN D10 /
// Phase 1 "bundle media we legally can"). Simple Icons are CC0; the marks themselves
// stay trademarks of their owners (the card keeps its caption).
//
//   node scripts/genlogos.mjs
//
// Reads every q('Brand', 'slug') in src/content/logos.ts + logosExtra.ts, downloads
// the missing SVGs from cdn.simpleicons.org into public/logos/<slug>.svg (re-runnable,
// skips existing files), and REMOVES from the pack files any entry whose icon cannot be
// fetched, plus the Apple logo (D10). The pack files point at /logos/<slug>.svg.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'public', 'logos');
const FILES = ['src/content/logos.ts', 'src/content/logosExtra.ts'].map((f) => join(ROOT, f));
const DROP = new Set(['apple']); // D10: no Apple logo in the app
const UA = 'Letterlock-genlogos/1.0 (https://letterlock.raltech.dev; game content build script)';
const ENTRY = /^\s*q\((['"])(.+?)\1,\s*(['"])([a-z0-9]+)\3.*\),?\s*$/;

mkdirSync(OUT, { recursive: true });
const slugs = new Set();
for (const f of FILES) {
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = ENTRY.exec(line);
    if (m) slugs.add(m[4]);
  }
}
console.log(`${slugs.size} distinct logo slugs`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchSvg(slug) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://cdn.simpleicons.org/${slug}`, { headers: { 'User-Agent': UA } });
      if (res.status === 404) return null;
      if (res.ok) {
        const t = await res.text();
        if (t.includes('<svg')) return t;
      }
    } catch { /* retry */ }
    await sleep(400 * (attempt + 1));
  }
  return null;
}

const failed = new Set();
let downloaded = 0, skipped = 0;
const list = [...slugs].filter((s) => !DROP.has(s));
let i = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (i < list.length) {
    const slug = list[i++];
    const path = join(OUT, `${slug}.svg`);
    if (existsSync(path)) { skipped++; continue; }
    const svg = await fetchSvg(slug);
    if (!svg) { failed.add(slug); console.log(`  ✗ ${slug}`); continue; }
    writeFileSync(path, svg);
    downloaded++;
  }
}));
console.log(`downloaded ${downloaded}, already present ${skipped}, failed ${failed.size}`);

// Point the packs at the local files and drop entries we cannot ship.
const remove = new Set([...failed, ...DROP]);
for (const f of FILES) {
  const lines = readFileSync(f, 'utf8').split('\n');
  const kept = lines.filter((line) => {
    const m = ENTRY.exec(line);
    return !(m && remove.has(m[4]));
  });
  let src = kept.join('\n').replace('`https://cdn.simpleicons.org/${slug}`', '`/logos/${slug}.svg`');
  writeFileSync(f, src);
  console.log(`${f.replace(ROOT, '')}: removed ${lines.length - kept.length} entries`);
}
if (remove.size) console.log(`removed slugs: ${[...remove].join(', ')}`);
