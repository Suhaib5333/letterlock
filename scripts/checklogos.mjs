// Detects "spoiler" logos: SimpleIcons that are WORDMARKS (the brand name written
// out — wide & short paths) or whose answer is an all-caps ACRONYM (the logo IS the
// answer letters). Outputs scripts/badlogos.json (array of slugs to drop).
import { readFileSync, writeFileSync } from 'node:fs';

const files = ['src/content/logos.ts', 'src/content/logosExtra.ts'];
const entries = new Map(); // slug -> brand
for (const f of files) {
  const txt = readFileSync(f, 'utf8');
  const re = /q\(\s*(['"])(.+?)\1\s*,\s*(['"])([A-Za-z0-9.\-]+?)\3/g;
  let m;
  while ((m = re.exec(txt))) entries.set(m[4], m[2]);
}
const slugs = [...entries.keys()];
console.log(`Unique logo slugs: ${slugs.length}`);

// --- minimal SVG path bbox (command-aware; arcs use endpoint only) ---
function bboxClean(d) {
  let cx = 0, cy = 0, sx = 0, sy = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const hit = (x, y) => { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; };
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let i = 0, cmd = '';
  const n = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ax = (v) => (rel ? cx + v : v);
    const ay = (v) => (rel ? cy + v : v);
    if (C === 'M' || C === 'L' || C === 'T') { const x = ax(n()), y = ay(n()); cx = x; cy = y; if (C === 'M') { sx = x; sy = y; } hit(x, y); }
    else if (C === 'H') { cx = ax(n()); hit(cx, cy); }
    else if (C === 'V') { cy = ay(n()); hit(cx, cy); }
    else if (C === 'C') { const x1 = ax(n()), y1 = ay(n()), x2 = ax(n()), y2 = ay(n()), x = ax(n()), y = ay(n()); hit(x1, y1); hit(x2, y2); hit(x, y); cx = x; cy = y; }
    else if (C === 'S' || C === 'Q') { const x1 = ax(n()), y1 = ay(n()), x = ax(n()), y = ay(n()); hit(x1, y1); hit(x, y); cx = x; cy = y; }
    else if (C === 'A') { n(); n(); n(); n(); n(); const x = ax(n()), y = ay(n()); cx = x; cy = y; hit(x, y); }
    else if (C === 'Z') { cx = sx; cy = sy; }
    else i++;
  }
  return { w: maxX - minX, h: maxY - minY };
}

// Known wordmarks the height heuristic can miss (curved scripts / control-point
// overshoot inflates measured height) — always treat as spoilers.
const SUPPLEMENT = new Set(['visa', 'ebay', 'etsy', 'cocacola', 'intel', 'burgerking']);
// Famous SYMBOL marks that are merely wide (no text) — never treat as spoilers.
const WHITELIST = new Set([
  'audi', 'adidas', 'mastercard', 'nike', 'discord', 'flickr', 'cloudflare',
  'soundcloud', 'nextcloud',
]);

const isAcronym = (brand) => {
  const core = brand.replace(/[^A-Za-z0-9]/g, '');
  return core.length >= 2 && core.length <= 5 && core === core.toUpperCase() && /[A-Z]/.test(core);
};

async function fetchSvg(slug) {
  try {
    const r = await fetch(`https://cdn.simpleicons.org/${slug}`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}

const bad = [];
const rows = [];
let idx = 0;
async function worker() {
  while (idx < slugs.length) {
    const slug = slugs[idx++];
    const brand = entries.get(slug);
    const svg = await fetchSvg(slug);
    let reason = '';
    if (!svg) reason = 'UNREACHABLE';
    else {
      const ds = [...svg.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map((m) => m[1]);
      // COMBINED bbox over all subpaths: text sits on a line (short overall height),
      // symbols fill the box (tall). Height is far more reliable than width here.
      let h = 0;
      if (ds.length) { const b = bboxClean(ds.join(' ')); h = b.h; }
      // Wordmark if the whole mark is short (and not a parse-fail of ~0 or >26).
      if (!WHITELIST.has(slug)) {
        if (h >= 2 && h < 11) reason = `WORDMARK h=${h.toFixed(1)} (${ds.length} paths)`;
        if (isAcronym(brand)) reason = (reason ? reason + ' + ' : '') + 'ACRONYM';
        if (SUPPLEMENT.has(slug)) reason = (reason ? reason + ' + ' : '') + 'KNOWN-WORDMARK';
      }
      if (reason) rows.push(`❌ ${slug.padEnd(20)} ${brand.padEnd(20)} h=${h.toFixed(1)} ${reason}`);
    }
    if (reason) bad.push(slug);
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
rows.sort();
console.log(rows.join('\n'));
writeFileSync('scripts/badlogos.json', JSON.stringify([...new Set(bad)].sort(), null, 0));
console.log(`\nFlagged ${new Set(bad).size}/${slugs.length} as spoilers → scripts/badlogos.json`);
