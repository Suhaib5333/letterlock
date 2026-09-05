// Media gate (CI-safe, exits non-zero on any failure). Run:  node scripts/checkmedia.mjs
//
//  1. Every media URL in every pack loads: local paths (/flags, /logos, /clips,
//     /charades) must exist on disk; remote URLs (iTunes previews, web-only by D3)
//     must answer a ranged GET. `REMOTE=0` skips the slow remote pass.
//  2. Charades (D9): every prompt either has its bundled image or is explicitly
//     word-only in public/charades/<packId>/credits.json; every image <= 60 KB.
//  3. No forbidden third-party URL is left anywhere in src/ or index.html:
//     loremflickr, flagcdn, cdn.simpleicons.org, fonts.googleapis, fonts.gstatic.
//     (iTunes URLs are allowed: those packs are gated to the web by content/index.ts.)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createServer } from 'vite';

const ROOT = join(import.meta.dirname, '..');
const PUBLIC = join(ROOT, 'public');
const server = await createServer({ logLevel: 'error', server: { middlewareMode: true } });
const { PACKS } = await server.ssrLoadModule('/src/content/index.ts');
const { allQuestions } = await server.ssrLoadModule('/src/core/packs.ts');
const { charadeSlug } = await server.ssrLoadModule('/src/content/charadesImages.ts');
await server.close();

const failures = [];
const fail = (msg) => failures.push(msg);

// ---------- 1. every media path/URL ----------
const TIMEOUT = 12000;
async function reachable(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-1' }, signal: ctrl.signal });
    return res.status === 200 || res.status === 206 ? null : `HTTP ${res.status}`;
  } catch (e) {
    return e.name === 'AbortError' ? 'timeout' : 'error';
  } finally {
    clearTimeout(t);
  }
}
async function mapLimit(items, limit, fn) {
  let i = 0;
  const out = [];
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }));
  return out;
}

const remote = [];
for (const pack of PACKS) {
  let local = 0, dead = 0;
  for (const q of allQuestions(pack)) {
    for (const kind of ['image', 'audio', 'video']) {
      const url = q[kind];
      if (!url) continue;
      if (q.youtube) fail(`${pack.id}: youtube embed on "${q.a}" (YouTube was removed in round 8c)`);
      if (url.startsWith('/')) {
        local++;
        if (!existsSync(join(PUBLIC, url.replace(/^\//, '')))) { dead++; fail(`${pack.id}: missing local ${kind} ${url} ("${q.a}")`); }
      } else {
        remote.push({ pack: pack.id, kind, url, a: q.a });
      }
    }
  }
  if (local) console.log(`${dead ? '❌' : '✅'} ${pack.id.padEnd(22)} ${local - dead}/${local} local files`);
}
if (process.env.REMOTE !== '0' && remote.length) {
  console.log(`\nChecking ${remote.length} remote URLs (web-only packs)...`);
  const results = await mapLimit(remote, 8, async (t) => ({ t, err: await reachable(t.url) }));
  const byPack = {};
  for (const r of results) {
    const s = (byPack[r.t.pack] ??= { ok: 0, dead: 0 });
    if (r.err) { s.dead++; fail(`${r.t.pack}: dead ${r.t.kind} "${r.t.a}" (${r.err}) ${r.t.url}`); } else s.ok++;
  }
  for (const [id, s] of Object.entries(byPack)) console.log(`${s.dead ? '❌' : '✅'} ${id.padEnd(22)} ${s.ok}/${s.ok + s.dead} remote ok${s.dead ? `, ${s.dead} DEAD` : ''}`);
}

// ---------- 2. charades coverage + size ----------
console.log('');
for (const pack of PACKS.filter((p) => /^charades/.test(p.id))) {
  const dir = join(PUBLIC, 'charades', pack.id);
  const creditsPath = join(dir, 'credits.json');
  if (!existsSync(creditsPath)) { fail(`${pack.id}: no credits.json (run node scripts/genimages.mjs)`); continue; }
  const credits = new Map(JSON.parse(readFileSync(creditsPath, 'utf8')).map((e) => [e.slug, e]));
  let images = 0, wordOnly = 0;
  for (const q of allQuestions(pack)) {
    const slug = charadeSlug(q.a);
    const e = credits.get(slug);
    const file = join(dir, `${slug}.webp`);
    if (!e) { fail(`${pack.id}: prompt "${q.a}" has no credits entry (not fetched, not word-only)`); continue; }
    if (e.source === 'word-only') {
      wordOnly++;
      if (q.image) fail(`${pack.id}: "${q.a}" is word-only but carries an image ${q.image}`);
      continue;
    }
    if (!existsSync(file)) { fail(`${pack.id}: credits say ${e.source} but ${slug}.webp is missing`); continue; }
    if (q.image !== `/charades/${pack.id}/${slug}.webp`) fail(`${pack.id}: "${q.a}" should point at /charades/${pack.id}/${slug}.webp, got ${q.image}`);
    if (!e.license || !e.sourceUrl) fail(`${pack.id}: ${slug} has no license/source credit`);
    const size = statSync(file).size;
    if (size > 60 * 1024) fail(`${pack.id}: ${slug}.webp is ${Math.round(size / 1024)} KB (> 60 KB)`);
    images++;
  }
  console.log(`🎭 ${pack.id.padEnd(22)} ${images} images, ${wordOnly} word-only`);
}

// ---------- 3. forbidden hosts in src/ and index.html ----------
const FORBIDDEN = /loremflickr\.com|flagcdn\.com|cdn\.simpleicons\.org|fonts\.googleapis\.com|fonts\.gstatic\.com/;
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css|html|json)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}
for (const file of [...walk(join(ROOT, 'src')), join(ROOT, 'index.html')]) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Only a host inside an actual URL counts. A comment is allowed to NAME a
    // banned CDN — the flag packs' comments explain why they moved off flagcdn —
    // and flagging those made the gate cry wolf on three lines of prose.
    const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
    if (FORBIDDEN.test(code) && /(https?:)?\/\//.test(code)) {
      fail(`forbidden host in ${relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 100)}`);
    }
  });
}

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log(`\nMEDIA GATE FAILED: ${failures.length} problem(s)`);
  process.exit(1);
}
console.log('MEDIA GATE CLEAN');
