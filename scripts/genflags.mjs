// Download every flag SVG used by the flag packs into public/flags/ so they're
// served from our OWN origin (Cloudflare) — flagcdn.com can be slow/blocked on
// some networks, which left flags blank. Local = always loads.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SRC = ['src/content/flags.ts', 'src/content/flagsExtra.ts'];
const codes = new Set();
for (const f of SRC) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/\bq\(\s*'[^']*'\s*,\s*'([a-z0-9-]{2,6})'/g)) codes.add(m[1]);
}
console.log(`Found ${codes.size} flag codes`);
mkdirSync('public/flags', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, fail = 0;
for (const code of [...codes].sort()) {
  try {
    const res = await fetch(`https://flagcdn.com/${code}.svg`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const svg = await res.text();
    if (!svg.includes('<svg')) throw new Error('not svg');
    writeFileSync(`public/flags/${code}.svg`, svg);
    ok++;
  } catch (e) {
    fail++;
    console.log('FAIL', code, e.message);
  }
  await sleep(60);
}
console.log(`\nWROTE public/flags/ — ${ok} flags, ${fail} failed`);
