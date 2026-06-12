// Verify that the "Guess the Song" clip URLs actually LOAD/PLAY in a real browser
// (Deezer/iTunes previews can be region-blocked or hotlink-protected even when the
// URL is reachable). Loads each <audio> and waits for canplay vs error.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const file = process.argv[2] || 'src/content/songs.ts';
const src = readFileSync(file, 'utf8');
const urls = [...src.matchAll(/audio:\s*"([^"]+)"/g)].map((m) => m[1]);
const sample = urls.slice(0, Number(process.env.N || 25));
console.log(`Testing ${sample.length} of ${urls.length} clip URLs from ${file}\n`);

// Reachability check (works regardless of codec — headless Chromium can't decode
// AAC/m4a, but real Safari/Chrome can, so reachability + audio content-type is the
// reliable signal for iTunes previews).
async function reachable(url) {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);
    const res = await fetch(url, { headers: { Range: 'bytes=0-1' }, signal: ac.signal });
    clearTimeout(t);
    const ct = res.headers.get('content-type') || '';
    return { ok: res.ok || res.status === 206, status: res.status, ct };
  } catch (e) {
    return { ok: false, status: 0, ct: e.message };
  }
}

let reach = 0;
for (const url of sample) {
  const r = await reachable(url);
  if (r.ok && /audio|mpeg|mp4|m4a|octet/i.test(r.ct)) reach++;
  else console.log(`UNREACHABLE [${r.status} ${r.ct}] ${url.slice(0, 70)}`);
}
console.log(`\n--- reachable+audio: ${reach}/${sample.length} ---\n`);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('about:blank');

let ok = 0,
  fail = 0;
for (const url of sample) {
  const result = await page.evaluate(
    (u) =>
      new Promise((resolve) => {
        const a = new Audio();
        a.preload = 'auto';
        const done = (status) => {
          a.src = '';
          resolve(status);
        };
        const t = setTimeout(() => done('timeout'), 7000);
        a.addEventListener('canplay', () => {
          clearTimeout(t);
          done('ok');
        });
        a.addEventListener('loadeddata', () => {
          clearTimeout(t);
          done('ok');
        });
        a.addEventListener('error', () => {
          clearTimeout(t);
          done('error:' + (a.error ? a.error.code : '?'));
        });
        a.src = u;
        a.load();
      }),
    url,
  );
  if (result === 'ok') ok++;
  else {
    fail++;
    console.log(`FAIL [${result}] ${url.slice(0, 70)}`);
  }
}
await browser.close();
console.log(`\n=== ${ok} ok, ${fail} failed of ${sample.length} ===`);
