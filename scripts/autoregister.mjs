// Register any pack file in src/content that exports `<name>Pack: RawPack` but
// isn't yet imported by src/content/index.ts. Insertion points are the two
// AUTO-REGISTER markers in index.ts. `node scripts/autoregister.mjs`
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const DIR = 'src/content';
const IDX = `${DIR}/index.ts`;
let idx = readFileSync(IDX, 'utf8');
const IMP = '// AUTO-REGISTER-IMPORTS';
const PKS = '// AUTO-REGISTER-PACKS';
if (!idx.includes(IMP) || !idx.includes(PKS)) throw new Error('index.ts is missing the AUTO-REGISTER markers');

// A pack referenced by ANOTHER content file is an intermediate whose `.letters`
// get merged into an existing pack (see clipsExtras.ts). Those must never be
// registered as standalone categories, or they show up as duplicate junk.
const files = readdirSync(DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts');
const consumedBy = new Map();
for (const f of files) consumedBy.set(f, readFileSync(`${DIR}/${f}`, 'utf8'));
const isMergedElsewhere = (name, own) =>
  files.some((f) => f !== own && new RegExp(`\\b${name}\\b`).test(consumedBy.get(f)));

const added = [];
for (const file of readdirSync(DIR)) {
  if (!file.endsWith('.ts') || file === 'index.ts' || file.endsWith('.test.ts')) continue;
  const mod = file.replace(/\.ts$/, '');
  const src = readFileSync(`${DIR}/${file}`, 'utf8');
  const m = src.match(/export const (\w*Pack)\s*:\s*RawPack/);
  if (!m) continue; // *Extra / *Gaps files export letter maps, not packs
  const name = m[1];
  if (new RegExp(`\\b${name}\\b`).test(idx)) continue;
  if (isMergedElsewhere(name, file)) continue;
  // Only for a genuinely new pack: skip a file an authoring agent is still
  // writing, since registering a half-written pack fails the playability test
  // with a bogus letter-coverage error.
  if (!/};\s*$/.test(src) || (src.match(/\bq:/g) ?? []).length < 150) {
    console.log(`skipping ${file} (still being written?)`);
    continue;
  }
  idx = idx.replace(IMP, `import { ${name} } from './${mod}';\n${IMP}`);
  idx = idx.replace(PKS, `${name},\n  ${PKS}`);
  added.push(name);
}
if (added.length) writeFileSync(IDX, idx);
console.log(added.length ? `registered ${added.length}: ${added.join(', ')}` : 'nothing new to register');
