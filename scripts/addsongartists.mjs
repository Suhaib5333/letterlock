/**
 * One-off, NETWORK-FREE transform: add a verified `artist` field to every
 * "Guess the Song" question in the generated content files.
 *
 * Source of truth = the [title, artist, answer?] arrays inside the generator
 * scripts (those pairings were title+artist verified against iTunes at gen
 * time). We build a {normalized answer → "Correct Case Artist"} map from them,
 * then rewrite each question object to ADD `artist: "..."` (matched by
 * normalized answer). Audio URLs and everything else are left untouched.
 *
 * Files rewritten:  src/content/songs.ts, songsExtra.ts, songsByGenre.ts
 *
 * Run:  node scripts/addsongartists.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const p = (rel) => path.join(root, rel);

const norm = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(the|a|an)\s+/, '')
    .replace(/[^a-z0-9]/g, '');

const titleCaseArtist = (s) => s; // artists in the scripts are already correct-case

// --- Build the answer→artist map from the generator-script SONGS arrays ----
// We extract the JS array literals from each generator by evaluating just the
// array (no network, no side effects). Each row is [title, artist, answer?, alts?].
function extractRows(file, varNames) {
  if (!existsSync(file)) return [];
  const src = readFileSync(file, 'utf8');
  const rows = [];
  for (const varName of varNames) {
    // Match `const <varName> = [ ... ];`  (greedy to the matching closer is hard
    // with regex, so we slice from the var to a sensible terminator and eval).
    const start = src.indexOf(`const ${varName}`);
    if (start === -1) continue;
    const open = src.indexOf('[', start);
    if (open === -1) continue;
    // Walk to the matching ']' respecting nested brackets and strings.
    let depth = 0;
    let i = open;
    let str = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (str) {
        if (c === '\\') i++;
        else if (c === str) str = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') str = c;
      else if (c === '[') depth++;
      else if (c === ']') {
        depth--;
        if (depth === 0) break;
      }
    }
    const literal = src.slice(open, i + 1);
    try {
      // eslint-disable-next-line no-eval
      const arr = eval(literal);
      for (const r of arr) if (Array.isArray(r)) rows.push(r);
    } catch (e) {
      console.error(`Failed to parse ${varName} in ${file}:`, e.message);
    }
  }
  return rows;
}

const map = new Map(); // normAnswer -> artist (correct case)
function addPair(answer, artist) {
  const key = norm(answer);
  if (!key || !artist) return;
  if (!map.has(key)) map.set(key, artist);
}

// gensongs.mjs & gensongs_add.mjs: rows are [title, artist, answer, alts?]
// answer = element [2] (fall back to [0]). artist = element [1].
for (const row of extractRows(p('scripts/gensongs.mjs'), ['SONGS'])) {
  const [title, artist, answer] = row;
  addPair(answer ?? title, artist);
}
for (const row of extractRows(p('scripts/gensongs_add.mjs'), ['NEW_SONGS'])) {
  const [title, artist, answer] = row;
  addPair(answer ?? title, artist);
}
// genSongsByGenre.mjs: GENRES is an object whose values have a `songs` array of
// [title, artist] pairs. The genre content files use the TITLE as the answer.
{
  const file = p('scripts/genSongsByGenre.mjs');
  if (existsSync(file)) {
    const src = readFileSync(file, 'utf8');
    // Pull every [title, artist] pair from inside the file's song arrays. The
    // genre file answers are the titles, so map title→artist.
    // Evaluate the whole GENRES object literal.
    const start = src.indexOf('const GENRES');
    const open = src.indexOf('{', start);
    let depth = 0;
    let i = open;
    let str = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (str) {
        if (c === '\\') i++;
        else if (c === str) str = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') str = c;
      else if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    try {
      // eslint-disable-next-line no-eval
      const GENRES = eval('(' + src.slice(open, i + 1) + ')');
      for (const meta of Object.values(GENRES)) {
        for (const [title, artist] of meta.songs || []) addPair(title, artist);
      }
    } catch (e) {
      console.error('Failed to parse GENRES:', e.message);
    }
  }
}

console.log(`Built artist map: ${map.size} unique answers.`);

// --- Rewrite the content files -------------------------------------------
// We add ` artist: "..."` immediately after the `a: "..."` field of every
// question object. We derive the answer from the `a:` field, look it up in the
// map; fall back to capitalizing the existing alt[0]; else log + leave off.
const capWords = (s) =>
  s
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

let added = 0;
let viaMap = 0;
let viaAlt = 0;
const missing = [];

function rewrite(file) {
  if (!existsSync(file)) {
    console.log(`(skip, not present): ${file}`);
    return;
  }
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const out = lines.map((line) => {
    // Only touch question-object lines that have an `a:` field and no existing artist.
    if (!/\ba:\s*"/.test(line)) return line;
    if (/\bartist:\s*"/.test(line)) return line; // already has one — idempotent
    const am = line.match(/\ba:\s*"((?:[^"\\]|\\.)*)"/);
    if (!am) return line;
    const answer = am[1].replace(/\\"/g, '"');
    let artist = map.get(norm(answer));
    if (artist) {
      viaMap++;
    } else {
      // Fallback: capitalize the existing alt[0] if present on this line.
      const altm = line.match(/\balt:\s*\[\s*"((?:[^"\\]|\\.)*)"/);
      if (altm && altm[1]) {
        artist = capWords(altm[1].replace(/\\"/g, '"'));
        viaAlt++;
      }
    }
    if (!artist) {
      missing.push(`${path.basename(file)}: ${answer}`);
      return line;
    }
    added++;
    // Insert `artist: "..."` right after the matched `a: "..."`.
    const json = JSON.stringify(titleCaseArtist(artist));
    return line.replace(am[0], `${am[0]}, artist: ${json}`);
  });
  writeFileSync(file, out.join('\n'));
  console.log(`Rewrote ${path.relative(root, file)}`);
}

rewrite(p('src/content/songs.ts'));
rewrite(p('src/content/songsExtra.ts'));
rewrite(p('src/content/songsByGenre.ts'));

console.log(`\nDONE. Added artist to ${added} questions (${viaMap} via map, ${viaAlt} via alt fallback).`);
console.log(`Left without artist: ${missing.length}`);
if (missing.length) console.log(missing.join('\n'));
