// Fetch ONE licensed, reviewed-later image per charades prompt and bundle it
// (LAUNCH_PLAN D9 / Phase 1c). Replaces the old runtime loremflickr hotlink.
//
//   node scripts/genimages.mjs                 all 5 charades packs, missing prompts only
//   PIXABAY_KEY=... node scripts/genimages.mjs  higher quality: Pixabay first
//   PACK=charades-easy node scripts/genimages.mjs   one pack
//   RETRY_MISSING=1 node scripts/genimages.mjs      also retry prompts that ended word-only
//   LIMIT=10 node scripts/genimages.mjs             smoke test: at most 10 fetches per pack
//
// Source order per prompt (first hit wins):
//   a) Pixabay API when PIXABAY_KEY is set (safesearch, editors_choice first, then any).
//      Pixabay Content License: commercial use OK, must download (we do), no hotlink.
//   b) Wikimedia Commons search (keyless): only PD / CC0 / CC BY / CC BY-SA files,
//      PD/CC0 preferred, bitmaps only, no logos/posters, a content-safety word filter.
//   c) Openverse (keyless, cc0 + pdm only), capped per run because of its anonymous
//      rate limit (OPENVERSE_MAX, default 60) and a delay between calls.
//   d) nothing found: the prompt stays WORD-ONLY (recorded, never a broken URL).
//
// Output per pack (public/charades/<packId>/):
//   <slug>.webp        512 px max side, <= 40 KB (sharp, quality steps down)
//   credits.json       [{ slug, prompt, source, author, license, licenseUrl, sourceUrl }]
//                      word-only prompts appear with source: 'word-only'
//   reject.txt         hand-written review list, one slug per line:
//                        <slug>        drop this image and fetch a different one
//                        <slug> !      drop it and keep the prompt word-only for good
// Plus src/content/charadesImageManifest.ts (which slugs have an image) and the
// review contact sheets docs/charades-review/<packId>-<n>.html (20 per page).
// Re-runnable: prompts that already have an image (or a forced word-only) are skipped.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { createServer } from 'vite';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'public', 'charades');
const REVIEW = join(ROOT, 'docs', 'charades-review');
const MANIFEST = join(ROOT, 'src', 'content', 'charadesImageManifest.ts');
const UA = 'Letterlock-genimages/1.0 (https://letterlock.raltech.dev; game content build script)';
const PIXABAY_KEY = process.env.PIXABAY_KEY || '';
const OPENVERSE_MAX = Number(process.env.OPENVERSE_MAX || 60);
const CONCURRENCY = 4;
const MAX_BYTES = 40 * 1024;
const MAX_SIDE = 512;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (html) => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// Things a family game must never show. A word that is the prompt itself is allowed
// (a prompt "Sword" may show a sword).
const UNSAFE =
  /\b(nude|nudity|naked|sex|sexual|sexy|porn|erotic|topless|genitals?|penis|vagina|breasts?|lingerie|bikini|violence|violent|blood|bloody|gore|corpse|dead body|murder|weapons?|guns?|rifle|pistol|firearm|knife|knives|sword|war|execution|hitler|nazi|swastika|drugs?|cocaine|marijuana|cannabis|alcohol|beer|wine|vodka|whisky|cigarettes?|smoking|torture|suicide|kill(ed|ing)?|death|dead|slaughter|butcher(ed|ing)?|hunting|carcass)\b/i;
// Not a photo of the thing: brand art, posters, screenshots, text-heavy files.
const NOT_A_PHOTO = /\b(logo|poster|dvd|blu-ray|cover art|screenshot|trailer|title card|wordmark|icon|emblem|diagram|chart|graph|map of|text|sign board|banner)\b/i;

const slugsAllowed = (prompt) => new Set(prompt.toLowerCase().split(/[^a-z]+/).filter(Boolean));
function unsafe(text, prompt) {
  const allowed = slugsAllowed(prompt);
  const re = new RegExp(UNSAFE.source, 'gi');
  let m;
  while ((m = re.exec(text))) if (!allowed.has(m[0].toLowerCase())) return true;
  return false;
}

function searchTerm(answer) {
  return answer
    .replace(/\(.*?\)/g, '')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

// ---------- a) Pixabay ----------
async function pixabay(term) {
  if (!PIXABAY_KEY) return null;
  for (const editors of ['true', 'false']) {
    const u = new URL('https://pixabay.com/api/');
    Object.entries({ key: PIXABAY_KEY, q: term, safesearch: 'true', editors_choice: editors, image_type: 'photo', per_page: 5, lang: 'en' }).forEach(([k, v]) => u.searchParams.set(k, v));
    let j;
    try { j = await getJson(u); } catch { continue; }
    const hit = (j.hits || [])[0];
    if (hit) {
      return {
        download: hit.webformatURL, // 640 px, Pixabay asks us to download, not hotlink
        source: 'pixabay',
        author: hit.user,
        license: 'Pixabay Content License',
        licenseUrl: 'https://pixabay.com/service/license-summary/',
        sourceUrl: hit.pageURL,
      };
    }
    await sleep(150);
  }
  return null;
}

// ---------- b) Wikimedia Commons ----------
const LICENSE_OK = /^(public domain|pd|cc0|cc[- ]?zero|cc[- ]by(-sa)?(\s[\d.]+)?(\s[a-z]{2})?)$/i;
function licenseRank(short) {
  const s = short.toLowerCase();
  if (/public domain|^pd|cc0|zero/.test(s)) return 3;
  if (/by-sa/.test(s)) return 1;
  if (/by/.test(s)) return 2;
  return 0;
}
async function commonsQuery(q) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({
    action: 'query', generator: 'search', gsrsearch: q, gsrnamespace: 6, gsrlimit: 12,
    prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: 640, format: 'json', origin: '*',
  }).forEach(([k, v]) => u.searchParams.set(k, v));
  const j = await getJson(u);
  return Object.values(j.query?.pages || {});
}
// Wikidata item for the prompt so Commons can be searched by "depicts" (P180): a
// text search for "Airplane" returns the band Jefferson Airplane, a depicts search
// returns aircraft. Movie packs want the film / series item, the others want the
// plain concept (not a band, album, film or person that borrowed the word).
const OFF_TOPIC = /(film|movie|band|album|song|single|musician|singer|actor|actress|person|presenter|company|corporation|brand|trademark|record label|service|platform|podcast|city|town|village|surname|given name|human|television|tv series|episode|video game|novel|painting|sculpture|genus|family of|species of)/i;
const ON_SCREEN = /(film|movie|television|tv series|series|sitcom|animated|franchise)/i;
async function wikidataItem(term, wantScreen) {
  const u = new URL('https://www.wikidata.org/w/api.php');
  Object.entries({ action: 'wbsearchentities', search: term, language: 'en', uselang: 'en', type: 'item', limit: 6, format: 'json', origin: '*' }).forEach(([k, v]) => u.searchParams.set(k, v));
  let j;
  try { j = await getJson(u); } catch { return null; }
  const hits = (j.search || []).filter((h) => h.description && !/disambiguation|wikimedia/i.test(h.description));
  // An exact-label hit wins ("apple" the fruit over "Apple Records"); otherwise the
  // first on-topic hit; otherwise no item (plain text search takes over).
  const same = hits.filter((h) => (h.label || '').toLowerCase() === term.toLowerCase());
  const pool = same.length ? same : hits;
  const pick = wantScreen ? pool.find((h) => ON_SCREEN.test(h.description)) : pool.find((h) => !OFF_TOPIC.test(h.description));
  return pick?.id || null;
}
async function commons(term, prompt, rejectedUrls, wantScreen) {
  const words = term.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const qid = await wikidataItem(term, wantScreen);
  const queries = [];
  if (qid) queries.push({ q: `haswbstatement:P180=${qid} filetype:bitmap`, depicts: true });
  queries.push({ q: `"${term}" filetype:bitmap` }, { q: `${term} filetype:bitmap` });
  const seen = new Set();
  const cands = [];
  for (const { q, depicts } of queries) {
    let pages = [];
    try { pages = await commonsQuery(q); } catch { /* try the next query */ }
    pages.forEach((p, i) => {
      if (seen.has(p.title)) return;
      seen.add(p.title);
      const ii = p.imageinfo?.[0];
      if (!ii) return;
      const em = ii.extmetadata || {};
      const lic = strip(em.LicenseShortName?.value);
      if (!LICENSE_OK.test(lic)) return;
      if (!/^image\/(jpeg|png)$/.test(ii.mime || '')) return;
      if ((ii.width || 0) < 300 || (ii.height || 0) < 300) return;
      if ((ii.size || 0) > 60 * 1024 * 1024) return;
      const cats = strip(em.Categories?.value);
      const desc = strip(em.ImageDescription?.value);
      const meta = `${p.title} ${cats} ${desc}`;
      if (unsafe(meta, prompt)) return;
      if (NOT_A_PHOTO.test(p.title) || NOT_A_PHOTO.test(cats)) return;
      if (rejectedUrls.has(ii.descriptionurl)) return;
      const titleWords = new Set(p.title.toLowerCase().split(/[^a-z0-9]+/));
      const ratio = ii.width / ii.height;
      let score = licenseRank(lic) / 2 - i * 0.15;
      if (depicts) score += 4; // structured "depicts" beats any text match
      if (words.every((w) => titleWords.has(w))) score += 3; // whole words: "banana", not "bananagrams"
      if (/(band|album|premiere|cosplay|musician|singer|actor|actress|concert|festival)/i.test(meta)) score -= 3;
      if (/quality images|featured pictures|valued images/i.test(cats)) score += 2;
      if (ii.mime === 'image/jpeg') score += 1;
      if (ratio > 0.6 && ratio < 2.0) score += 1;
      cands.push({
        score,
        download: ii.thumburl || ii.url,
        source: 'wikimedia-commons',
        author: strip(em.Artist?.value) || strip(em.Credit?.value) || 'unknown',
        license: lic,
        licenseUrl: strip(em.LicenseUrl?.value) || (licenseRank(lic) === 3 ? 'https://creativecommons.org/publicdomain/mark/1.0/' : ''),
        sourceUrl: ii.descriptionurl,
      });
    });
    if (cands.some((c) => c.score >= 5)) break;
    await sleep(120);
  }
  cands.sort((a, b) => b.score - a.score);
  return cands[0] || null;
}

// ---------- c) Openverse ----------
let openverseCalls = 0;
let openverseDown = false;
async function openverse(term, prompt, rejectedUrls) {
  if (openverseDown || openverseCalls >= OPENVERSE_MAX) return null;
  openverseCalls++;
  await sleep(1500); // anonymous rate limit
  const u = new URL('https://api.openverse.org/v1/images/');
  Object.entries({ q: term, license: 'cc0,pdm', mature: 'false', page_size: 10 }).forEach(([k, v]) => u.searchParams.set(k, v));
  let j;
  try { j = await getJson(u); } catch (e) {
    if (/HTTP 5\d\d|HTTP 429/.test(e.message)) openverseDown = true;
    return null;
  }
  for (const r of j.results || []) {
    if (!r.url || rejectedUrls.has(r.foreign_landing_url)) continue;
    if (unsafe(`${r.title} ${(r.tags || []).map((t) => t.name).join(' ')}`, prompt)) continue;
    if (/\.(svg|gif)(\?|$)/i.test(r.url)) continue;
    if ((r.width || 0) < 300) continue;
    return {
      download: r.url,
      source: 'openverse',
      author: r.creator || 'unknown',
      license: r.license === 'pdm' ? 'Public Domain Mark' : r.license.toUpperCase(),
      licenseUrl: r.license_url || '',
      sourceUrl: r.foreign_landing_url || r.url,
    };
  }
  return null;
}

// ---------- download + encode ----------
async function toWebp(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error('tiny download');
  for (const side of [MAX_SIDE, 448, 384, 320]) {
    for (const quality of [80, 70, 60, 50, 42]) {
      const out = await sharp(buf).rotate().resize({ width: side, height: side, fit: 'inside', withoutEnlargement: true }).webp({ quality }).toBuffer();
      if (out.length <= MAX_BYTES) return out;
    }
  }
  throw new Error('could not fit in 40 KB');
}

async function mapLimit(items, n, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  });
  await Promise.all(workers);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
function contactSheets(packId, packName, entries) {
  const PER = 20;
  const pages = Math.max(1, Math.ceil(entries.length / PER));
  const files = [];
  for (let n = 0; n < pages; n++) {
    const chunk = entries.slice(n * PER, (n + 1) * PER);
    const nav = Array.from({ length: pages }, (_, k) => (k === n ? `<b>${k + 1}</b>` : `<a href="${packId}-${k + 1}.html">${k + 1}</a>`)).join(' ');
    const cards = chunk.map((e) => {
      const img = e.source === 'word-only'
        ? '<div class="img none">word only</div>'
        : `<img src="../../public/charades/${packId}/${e.slug}.webp" loading="lazy" alt="">`;
      const meta = e.source === 'word-only' ? '' : `<small>${esc(e.license)} · ${esc(e.author)} · <a href="${esc(e.sourceUrl)}" target="_blank">source</a></small>`;
      return `<figure>${img}<figcaption><b>${esc(e.prompt)}</b><br><code>${e.slug}</code><br>${meta}</figcaption></figure>`;
    }).join('\n');
    const html = `<!doctype html><meta charset="utf-8"><title>${esc(packName)} review ${n + 1}/${pages}</title>
<style>body{font:14px system-ui;margin:16px;background:#111;color:#eee}h1{font-size:18px}nav{margin:8px 0 16px}nav a,nav b{margin-right:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}figure{margin:0;background:#1c1c1c;border-radius:8px;padding:8px}
img,.img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:6px;background:#333}.none{display:grid;place-items:center;color:#888}
figcaption{margin-top:6px;line-height:1.35}small{color:#aaa}code{color:#9cf}a{color:#8cf}</style>
<h1>${esc(packName)} · page ${n + 1}/${pages} · <a href="index.html">all packs</a></h1>
<p>Reject an image by adding its <code>slug</code> to <code>public/charades/${packId}/reject.txt</code> (append <code> !</code> to keep it word-only), then re-run <code>node scripts/genimages.mjs</code>.</p>
<nav>${nav}</nav><div class="grid">${cards}</div><nav>${nav}</nav>`;
    const name = `${packId}-${n + 1}.html`;
    writeFileSync(join(REVIEW, name), html);
    files.push(name);
  }
  return files;
}

// ---------- main ----------
const server = await createServer({ logLevel: 'error', server: { middlewareMode: true } });
const { PACKS } = await server.ssrLoadModule('/src/content/index.ts');
const { charadeSlug } = await server.ssrLoadModule('/src/content/charadesImages.ts');
await server.close();

const packs = PACKS.filter((p) => /^charades/.test(p.id));
const onlyPack = process.env.PACK; // fetch for one pack only; manifest + sheets still cover all
const LIMIT = Number(process.env.LIMIT || Infinity); // smoke-test: fetch at most N prompts per pack
mkdirSync(REVIEW, { recursive: true });
const manifest = {};
const summary = [];
const indexLinks = [];

for (const pack of packs) {
  const dir = join(OUT, pack.id);
  mkdirSync(dir, { recursive: true });
  const creditsPath = join(dir, 'credits.json');
  const credits = new Map((existsSync(creditsPath) ? JSON.parse(readFileSync(creditsPath, 'utf8')) : []).map((e) => [e.slug, e]));

  // reject.txt: "<slug>" = refetch something else, "<slug> !" = word-only forever.
  const rejectPath = join(dir, 'reject.txt');
  const rejects = new Map();
  if (existsSync(rejectPath)) {
    for (const line of readFileSync(rejectPath, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([a-z0-9-]+)\s*(!?)\s*$/.exec(line);
      if (m) rejects.set(m[1], m[2] === '!');
    }
  }

  const prompts = [];
  const seenSlug = new Set();
  for (const qs of Object.values(pack.letters)) {
    for (const q of qs) {
      const slug = charadeSlug(q.a);
      if (seenSlug.has(slug)) { console.warn(`  ! duplicate slug ${pack.id}/${slug} ("${q.a}")`); continue; }
      seenSlug.add(slug);
      prompts.push({ slug, prompt: q.a });
    }
  }

  let todo = [];
  for (const p of prompts) {
    const cur = credits.get(p.slug);
    const file = join(dir, `${p.slug}.webp`);
    if (rejects.has(p.slug)) {
      const rejected = new Set(cur?.rejected || []);
      if (cur?.sourceUrl) rejected.add(cur.sourceUrl);
      if (existsSync(file)) rmSync(file);
      const entry = { slug: p.slug, prompt: p.prompt, source: 'word-only', rejected: [...rejected] };
      if (rejects.get(p.slug)) entry.forced = true;
      credits.set(p.slug, entry);
      if (!entry.forced) todo.push(p);
      continue;
    }
    if (cur?.forced) continue;
    if (cur && cur.source !== 'word-only' && existsSync(file)) continue;
    if (cur && cur.source === 'word-only' && !process.env.RETRY_MISSING) continue;
    todo.push(p);
  }
  if (onlyPack && pack.id !== onlyPack) todo = [];
  todo = todo.slice(0, LIMIT);
  // reject.txt has been applied; clear it so a later run does not re-reject.
  if (rejects.size) writeFileSync(rejectPath, '');

  console.log(`\n${pack.id}: ${prompts.length} prompts, ${todo.length} to fetch`);
  let done = 0;
  await mapLimit(todo, CONCURRENCY, async (p) => {
    const cur = credits.get(p.slug);
    const rejectedUrls = new Set(cur?.rejected || []);
    const term = searchTerm(p.prompt);
    let pick = null;
    let webp = null;
    for (const src of [pixabay, commons, openverse]) {
      try {
        pick = await src(term, p.prompt, rejectedUrls, /movies/.test(pack.id));
        if (!pick) continue;
        webp = await toWebp(pick.download);
        break;
      } catch (e) {
        pick = null;
      }
    }
    const entry = { slug: p.slug, prompt: p.prompt };
    if (pick && webp) {
      writeFileSync(join(dir, `${p.slug}.webp`), webp);
      Object.assign(entry, { source: pick.source, author: pick.author, license: pick.license, licenseUrl: pick.licenseUrl, sourceUrl: pick.sourceUrl });
    } else {
      entry.source = 'word-only';
    }
    if (rejectedUrls.size) entry.rejected = [...rejectedUrls];
    credits.set(p.slug, entry);
    done++;
    if (done % 25 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}  (${p.slug}: ${entry.source})`);
  });

  // Drop credits for prompts that no longer exist in the pack, then write.
  const live = new Set(prompts.map((p) => p.slug));
  const list = [...credits.values()].filter((e) => live.has(e.slug)).sort((a, b) => a.slug.localeCompare(b.slug));
  writeFileSync(creditsPath, JSON.stringify(list, null, 1) + '\n');
  const withImg = list.filter((e) => e.source !== 'word-only' && existsSync(join(dir, `${e.slug}.webp`)));
  manifest[pack.id] = withImg.map((e) => e.slug);
  const bytes = withImg.reduce((n, e) => n + readFileSync(join(dir, `${e.slug}.webp`)).length, 0);
  const bySrc = {};
  for (const e of withImg) bySrc[e.source] = (bySrc[e.source] || 0) + 1;
  summary.push({ pack: pack.id, prompts: prompts.length, images: withImg.length, kb: Math.round(bytes / 1024), sources: JSON.stringify(bySrc) });
  const files = contactSheets(pack.id, pack.name, list);
  indexLinks.push(`<li><b>${esc(pack.name)}</b> (${withImg.length}/${prompts.length} images): ${files.map((f, i) => `<a href="${f}">${i + 1}</a>`).join(' ')}</li>`);
}

writeFileSync(join(REVIEW, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Charades image review</title>
<style>body{font:15px system-ui;margin:24px;background:#111;color:#eee}a{color:#8cf;margin-right:6px}li{margin:6px 0}</style>
<h1>Charades image review</h1><p>Open a page, scan the 20 thumbnails, list any bad slug in that pack's <code>reject.txt</code>, re-run <code>node scripts/genimages.mjs</code>.</p><ul>${indexLinks.join('')}</ul>`);

writeFileSync(MANIFEST, `// AUTO-GENERATED by scripts/genimages.mjs. Slugs that have a bundled image under
// public/charades/<packId>/<slug>.webp. Do not edit by hand.
export const CHARADE_IMAGE_SLUGS: Record<string, string[]> = ${JSON.stringify(manifest, null, 1)};
`);
console.table(summary);
console.log(`Openverse calls used: ${openverseCalls}${openverseDown ? ' (service unavailable, skipped)' : ''}`);
